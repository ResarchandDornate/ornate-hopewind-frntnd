import axios from "axios";

import { clearSession, getToken } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Endpoints that run pre-login and must NOT carry an Authorization header —
// sending a stale token to these can get the request rejected before the
// credentials in the body are even looked at.
const PUBLIC_AUTH_PATHS = [
  "auth/signin",
  "auth/signup",
  "auth/verify-otp",
  "auth/send-otp",
  "auth/reset-password",
  "auth/confirm-reset-password",
  "token/refresh",
];

const isPublicAuthRequest = (url = "") => {
  const normalized = url.replace(/^\/+/, "").toLowerCase();
  return PUBLIC_AUTH_PATHS.some((path) => normalized.startsWith(path));
};

axiosInstance.interceptors.request.use((config) => {
  if (isPublicAuthRequest(config.url)) {
    if (config.headers) delete config.headers.Authorization;
    return config;
  }
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const status = error.response?.status;

    // An expired access token is the common case, and the backend issues
    // refresh tokens — redeem one and replay the request rather than dumping
    // the user back at the login screen mid-session.
    if (status === 401 && !config._retriedAfterRefresh && !isPublicAuthRequest(config.url)) {
      config._retriedAfterRefresh = true;
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        config.headers = { ...config.headers, Authorization: `Bearer ${refreshed}` };
        return axiosInstance.request(config);
      }
      // Refresh failed: the session is genuinely over.
      clearSession();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }

    // The API throttles at 100/hour anon and 1000/hour per user. Honour
    // Retry-After when sent, otherwise back off ~2s, and give up after two
    // tries so an overloaded server is not hammered further.
    if (status === 429 && (config._retryCount ?? 0) < 2) {
      config._retryCount = (config._retryCount ?? 0) + 1;
      const retryAfter = error.response.headers?.["retry-after"];
      const waitSeconds = retryAfter ? Number(retryAfter) || 2 : 2;
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
      return axiosInstance.request(config);
    }

    return Promise.reject(error);
  }
);

// Kept outside the interceptor so several concurrent 401s share one refresh
// instead of firing a burst of them.
let refreshPromise = null;

async function refreshAccessToken() {
  const { getRefreshToken, setToken } = await import("./auth");
  const refresh = getRefreshToken();
  if (!refresh) return null;

  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${BASE_URL}token/refresh/`, { refresh })
      .then((response) => {
        const access = response.data?.access;
        if (access) setToken(access);
        return access || null;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// The auth endpoints return HTTP 200 with `{ success: false, message }` for
// some logical failures. Treat that as an error so callers do not have to.
const enforceSuccessFlag = (data) => {
  if (data && typeof data === "object" && data.success === false) {
    throw new Error(data.message || data.detail || "Request failed");
  }
  return data;
};

const buildErrorFromResponse = (error) => {
  if (error.response) {
    const data = error.response.data;
    if (typeof data === "string") return new Error(data);
    if (data?.message) return new Error(data.message);
    if (data?.detail) return new Error(data.detail);
    if (data && typeof data === "object") {
      // DRF field errors: {"email": ["already exists"]}
      const messages = Object.entries(data)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
        .join("\n");
      return new Error(messages || "Server error");
    }
    return new Error("Server error");
  }
  if (error.request) return new Error("Network error — no response from the server");
  return new Error(error.message || "Unknown error");
};

const normalize = (endpoint) => (endpoint.startsWith("/") ? endpoint.slice(1) : endpoint);

export const getData = async (endpoint, config) => {
  try {
    const response = await axiosInstance.get(normalize(endpoint), config);
    return enforceSuccessFlag(response.data);
  } catch (error) {
    throw buildErrorFromResponse(error);
  }
};

export const postData = async (endpoint, data) => {
  try {
    const response = await axiosInstance.post(normalize(endpoint), data);
    return enforceSuccessFlag(response.data);
  } catch (error) {
    throw buildErrorFromResponse(error);
  }
};

export const patchData = async (endpoint, data) => {
  try {
    const response = await axiosInstance.patch(normalize(endpoint), data);
    return enforceSuccessFlag(response.data);
  } catch (error) {
    throw buildErrorFromResponse(error);
  }
};

export const putData = async (endpoint, data) => {
  try {
    const response = await axiosInstance.put(normalize(endpoint), data);
    return enforceSuccessFlag(response.data);
  } catch (error) {
    throw buildErrorFromResponse(error);
  }
};

export const deleteData = async (endpoint) => {
  try {
    const response = await axiosInstance.delete(normalize(endpoint));
    return enforceSuccessFlag(response.data);
  } catch (error) {
    throw buildErrorFromResponse(error);
  }
};

// DRF paginates list endpoints as { count, next, previous, results }. Callers
// almost always want the rows.
export const getList = async (endpoint, config) => {
  const data = await getData(endpoint, config);
  if (Array.isArray(data)) return data;
  return data?.results ?? [];
};

export { BASE_URL };
export default axiosInstance;

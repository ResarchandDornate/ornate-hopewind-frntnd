// Browser-only auth helpers.
//
// Tokens live in sessionStorage, so they die when the tab closes and every
// fresh visit starts at the login screen. The refresh token is stored alongside
// the access token: the backend rotates refresh tokens, so a refresh both
// extends the session and replaces the stored value.

const TOKEN_KEY = "kbToken";
const REFRESH_KEY = "kbRefresh";
const USER_KEY = "kbUser";

const canUseStorage = () => typeof window !== "undefined";

export const getToken = () => (canUseStorage() ? window.sessionStorage.getItem(TOKEN_KEY) : null);

export const setToken = (token) => {
  if (canUseStorage()) window.sessionStorage.setItem(TOKEN_KEY, token);
};

export const getRefreshToken = () =>
  canUseStorage() ? window.sessionStorage.getItem(REFRESH_KEY) : null;

export const setRefreshToken = (token) => {
  if (canUseStorage() && token) window.sessionStorage.setItem(REFRESH_KEY, token);
};

export const getUser = () => {
  if (!canUseStorage()) return null;
  try {
    return JSON.parse(window.sessionStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
};

export const setUser = (user) => {
  if (canUseStorage() && user) window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  if (!canUseStorage()) return;
  [TOKEN_KEY, REFRESH_KEY, USER_KEY].forEach((key) => window.sessionStorage.removeItem(key));
  // Clear any token left by an older build that used localStorage.
  window.localStorage.removeItem(TOKEN_KEY);
};

export const isAuthenticated = () => !!getToken();

/**
 * Persist a signin/verify-otp response.
 *
 * The backend wraps its payload as
 * `{ success, status, data: { user, tokens: { access, refresh }, user_role } }`.
 * Unwrapping happens here so no page has to know that shape.
 */
export const storeSession = (response) => {
  const payload = response?.data ?? response;
  const access = payload?.tokens?.access ?? payload?.access;
  const refresh = payload?.tokens?.refresh ?? payload?.refresh;

  if (!access) {
    throw new Error("Sign-in response did not include an access token.");
  }

  setToken(access);
  setRefreshToken(refresh);
  if (payload?.user) setUser({ ...payload.user, role: payload.user_role ?? payload.user.role });

  return access;
};

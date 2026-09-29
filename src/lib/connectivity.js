/**
 * Connection state shared by the API layer and the popup that reports it.
 *
 * Deliberately a plain module rather than React state: the axios interceptor in
 * api.js is not a component and cannot dispatch into a context, so the source of
 * truth lives here and components subscribe to it.
 *
 * Two different failures look the same to a user but need different words, so
 * they are kept apart:
 *
 *   NO_INTERNET        the browser itself reports no network. Nothing we do will
 *                      reach anything until that changes.
 *   SERVER_UNREACHABLE the browser has a network but the request never got an
 *                      answer — backend down, wrong host, DNS, or a captive
 *                      portal swallowing traffic.
 *   SERVER_TIMEOUT     a connection was made but no reply arrived inside the
 *                      30 s axios timeout. The server is up but not answering.
 *
 * navigator.onLine alone is NOT enough: it only reports whether a local link
 * exists, so a laptop on hotel Wi-Fi with no upstream reads as "online". Every
 * recovery is therefore confirmed by an actual request, never by the flag.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/";

export const OFFLINE_KIND = {
  NO_INTERNET: "no-internet",
  SERVER_UNREACHABLE: "server-unreachable",
  SERVER_TIMEOUT: "server-timeout",
};

export const OFFLINE_COPY = {
  [OFFLINE_KIND.NO_INTERNET]: {
    title: "No internet connection",
    detail:
      "Your device is not connected to a network. Check your Wi-Fi or mobile data — we will reconnect automatically.",
  },
  [OFFLINE_KIND.SERVER_UNREACHABLE]: {
    title: "Cannot reach the server",
    detail:
      "Your device is online but the Krishna Box server did not respond. It may be restarting, or your connection may be blocked.",
  },
  [OFFLINE_KIND.SERVER_TIMEOUT]: {
    title: "The server is not responding",
    detail:
      "The connection was made but no reply arrived in time. The server may be overloaded.",
  },
};

let state = { online: true, kind: null, since: null };
const listeners = new Set();

const emit = () => {
  for (const listener of listeners) listener(state);
};

/** Subscribe to connection changes. Fires immediately with the current state. */
export function subscribeConnection(listener) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export const getConnectionState = () => state;

export function reportOffline(kind) {
  // `since` marks when connectivity was FIRST lost, so the popup can show how
  // long this has been going on. A change of kind mid-outage must not reset it.
  const since = state.online ? Date.now() : state.since;
  if (!state.online && state.kind === kind) return;
  state = { online: false, kind, since };
  emit();
}

export function reportOnline() {
  if (state.online) return;
  state = { online: true, kind: null, since: null };
  emit();
}

/**
 * Decide whether an axios error means "no connection", returning the kind or
 * null when the request failed for some other reason.
 *
 * The key test is `error.response`: if the server sent ANY status — 401, 404,
 * 500 — then it is reachable and this is not a connectivity problem. Treating a
 * 500 as "no internet" would tell the user to check their Wi-Fi over a backend
 * bug.
 */
export function classifyConnectionError(error) {
  if (!error) return null;
  // A request the app itself aborted (navigation, React unmount, react-query
  // cancelling a stale fetch) is not a failure at all.
  if (error.code === "ERR_CANCELED" || error.name === "CanceledError") return null;
  if (error.response) return null;

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return OFFLINE_KIND.NO_INTERNET;
  }
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return OFFLINE_KIND.SERVER_TIMEOUT;
  }
  if (error.request) return OFFLINE_KIND.SERVER_UNREACHABLE;
  return null;
}

/**
 * Ask the server whether it is there. Resolves true when it answers.
 *
 * Any HTTP status counts as success — the API root replies 404, and a 404 still
 * proves the server accepted a TCP connection and responded. Only a transport
 * failure (fetch rejecting) means we are still cut off.
 */
export async function probeConnection({ timeoutMs = 8000 } = {}) {
  if (typeof window === "undefined") return true;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(BASE_URL, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    reportOnline();
    return true;
  } catch {
    reportOffline(
      typeof navigator !== "undefined" && navigator.onLine === false
        ? OFFLINE_KIND.NO_INTERNET
        : OFFLINE_KIND.SERVER_UNREACHABLE
    );
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Browser-level events are a useful hint but not the verdict. Losing the link is
// conclusive, so trust "offline" immediately; regaining it only means a probe is
// worth trying, so never announce recovery from the flag alone.
if (typeof window !== "undefined" && !window.__kbConnectivityBound) {
  window.__kbConnectivityBound = true;
  window.addEventListener("offline", () => reportOffline(OFFLINE_KIND.NO_INTERNET));
  window.addEventListener("online", () => {
    probeConnection();
  });
}

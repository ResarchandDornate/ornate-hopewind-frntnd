import { toast } from "sonner";

export const showSuccess = (message) => toast.success(message);
export const showError = (message) => toast.error(message);
export const showInfo = (message) => toast.info(message);

/** Pull a human-readable message out of whatever the API layer threw. */
export const extractApiMessage = (error, fallback = "Something went wrong") => {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  return error.message || fallback;
};

/**
 * Report a failed API call, deferring to the connectivity popup when the cause
 * was the connection itself.
 *
 * Without this, a sign-in attempted with no internet produces two messages at
 * once: the popup correctly naming the network, and a toast saying "Sign-in
 * failed" — which reads as a rejected password and sends the user to reset it.
 *
 * Returns true when a toast was shown, so callers can branch if they need to.
 */
export const showApiError = (error, fallback = "Something went wrong") => {
  if (error?.isConnectionError) return false;
  toast.error(extractApiMessage(error, fallback));
  return true;
};

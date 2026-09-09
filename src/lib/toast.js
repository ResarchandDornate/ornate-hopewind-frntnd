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

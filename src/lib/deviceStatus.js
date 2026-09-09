import { formatDistanceToNow } from "date-fns";

// Single source of truth for "what is this device's status right now?".
//
// The backend already computes `live_status` (live | recovering | unsynced |
// offline) from what it last received, which is strictly better information
// than anything the client can infer. This module trusts that value and only
// falls back when it is absent.

export function parseFaultBitmask(raw) {
  if (raw === null || raw === undefined || raw === "") return 0;
  // Number() handles both the canonical hex string ("0x0000001F" -> 31) and the
  // plain integers older records may carry.
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export function isHwFault(device) {
  return device?.hw_fault === true || device?.hw_fault === 1;
}

export function hasActiveFault(device) {
  return parseFaultBitmask(device?.fault_bitmask) > 0 || isHwFault(device);
}

export function formatFaultBitmask(raw) {
  if (typeof raw === "string" && raw.trim().toLowerCase().startsWith("0x")) {
    return `0x${raw.trim().slice(2).toUpperCase()}`;
  }
  return `0x${parseFaultBitmask(raw).toString(16).toUpperCase().padStart(8, "0")}`;
}

// Statuses meaning "the device is talking to us right now" — as opposed to
// "valid, current data is landing", which is `isLive`.
export function isReporting(status) {
  return status === "live" || status === "recovering" || status === "unsynced";
}

export function computeStatus(device, reading) {
  // A fault outranks everything else on the dashboard: it is the thing the
  // operator has to act on.
  if (hasActiveFault(reading ?? device)) return "fault";

  const status = device?.status ?? device?.live_status;
  if (status) return status;

  if (device?.is_online === true) return "live";
  if (device?.is_online === false) return "offline";
  return "unknown";
}

export function isLive(device, reading) {
  return computeStatus(device, reading) === "live";
}

export function formatLastSeen(iso) {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

"use client";

// Status vocabulary comes straight from the backend's Device.live_status.
//
// `live` is the only state that gets the expanding ring: it is the one that
// means data is arriving right now. Giving every dot a pulse would make the
// animation decoration rather than a signal.
const STATUS_MAP = {
  live: {
    dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50",
    ring: "ring-green-100", label: "Live", live: true,
  },
  // Recovering: the device reconnected and is replaying its offline backlog.
  recovering: {
    dot: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50",
    ring: "ring-blue-100", label: "Recovering", pulse: true,
  },
  // Unsynced: the device is reporting, but its clock is not synced, so its
  // readings are stored under arrival time. Shown like "recovering" because it
  // means the same thing to an operator - talking, but do not trust the timing.
  unsynced: {
    dot: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50",
    ring: "ring-blue-100", label: "Unsynced", pulse: true,
  },
  offline: {
    dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50",
    ring: "ring-red-100", label: "Offline",
  },
  fault: {
    dot: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50",
    ring: "ring-orange-100", label: "Fault",
  },
  unknown: {
    dot: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-100",
    ring: "ring-slate-100", label: "Unknown",
  },
};

export default function StatusBadge({ status, className = "" }) {
  const style = STATUS_MAP[status] || STATUS_MAP.unknown;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${style.bg} ${style.text} ${style.ring} ${className}`}
    >
      <span
        className={`status-dot h-1.5 w-1.5 ${style.dot} ${style.live ? "status-dot-live" : ""} ${
          style.pulse ? "animate-pulse" : ""
        }`}
      />
      {style.label}
    </span>
  );
}

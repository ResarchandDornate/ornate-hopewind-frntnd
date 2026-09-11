"use client";

/**
 * Accent is a channel, not decoration: each KPI keeps its colour across every
 * render so an operator learns "orange tile = power" and can find it without
 * reading. `glow` is only lit in dark mode, where a flat tint on a dark panel
 * loses the sense that the icon is a lit indicator.
 */
const ACCENTS = {
  orange: {
    bg: "bg-orange-50",
    text: "text-orange-600",
    ring: "ring-orange-100",
    edge: "from-orange-500",
    glow: "dark:shadow-[0_0_18px_rgba(249,115,22,0.35)]",
  },
  green: {
    bg: "bg-green-50",
    text: "text-green-600",
    ring: "ring-green-100",
    edge: "from-green-500",
    glow: "dark:shadow-[0_0_18px_rgba(34,197,94,0.35)]",
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    ring: "ring-blue-100",
    edge: "from-blue-500",
    glow: "dark:shadow-[0_0_18px_rgba(59,130,246,0.35)]",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-600",
    ring: "ring-red-100",
    edge: "from-red-500",
    glow: "dark:shadow-[0_0_18px_rgba(239,68,68,0.4)]",
  },
  indigo: {
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    ring: "ring-indigo-100",
    edge: "from-indigo-500",
    glow: "dark:shadow-[0_0_18px_rgba(99,102,241,0.35)]",
  },
  slate: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    ring: "ring-slate-100",
    edge: "from-slate-400",
    glow: "",
  },
};

export default function KpiCard({ label, value, unit, icon: Icon, accent = "orange", hint, loading }) {
  const a = ACCENTS[accent] || ACCENTS.orange;

  return (
    <div className="glass glass-hover relative overflow-hidden rounded-2xl p-5">
      {/* Lit top edge in the tile's own colour — the cue that says "instrument"
          rather than "card", and it costs no vertical space. */}
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-px bg-linear-to-r to-transparent ${a.edge}`}
      />

      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="hud-label pt-1">{label}</p>
        {Icon && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${a.bg} ring-4 ${a.ring} ${a.glow}`}
          >
            <Icon size={18} className={a.text} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-8 w-24 animate-pulse rounded bg-slate-200/50" />
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className="readout text-3xl font-bold text-slate-900">{value}</span>
          {unit && <span className="readout text-sm font-semibold text-slate-500">{unit}</span>}
        </div>
      )}

      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

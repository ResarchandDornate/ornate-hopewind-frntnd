"use client";

/**
 * Accent is a channel, not decoration: each KPI keeps its colour across every
 * render so an operator learns "orange tile = power" and can find it without
 * reading.
 */
const ACCENTS = {
  orange: { bg: "bg-orange-50", text: "text-orange-600" },
  green: { bg: "bg-green-50", text: "text-green-600" },
  blue: { bg: "bg-blue-50", text: "text-blue-600" },
  red: { bg: "bg-red-50", text: "text-red-600" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600" },
  slate: { bg: "bg-slate-100", text: "text-slate-700" },
};

export default function KpiCard({ label, value, unit, icon: Icon, accent = "orange", hint, loading }) {
  const a = ACCENTS[accent] || ACCENTS.orange;

  return (
    <div className="glass glass-hover rounded-xl p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="hud-label pt-1">{label}</p>
        {Icon && (
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.bg}`}>
            <Icon size={16} className={a.text} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-7 w-24 animate-pulse rounded bg-slate-200/50" />
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tabular-nums text-slate-900">{value}</span>
          {unit && <span className="text-sm font-medium text-slate-500">{unit}</span>}
        </div>
      )}

      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

"use client";

const ACCENTS = {
  orange: { bg: "bg-orange-50", text: "text-orange-600", ring: "ring-orange-100" },
  green: { bg: "bg-green-50", text: "text-green-600", ring: "ring-green-100" },
  blue: { bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-100" },
  red: { bg: "bg-red-50", text: "text-red-600", ring: "ring-red-100" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600", ring: "ring-indigo-100" },
  slate: { bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-100" },
};

export default function KpiCard({ label, value, unit, icon: Icon, accent = "orange", hint, loading }) {
  const a = ACCENTS[accent] || ACCENTS.orange;

  return (
    <div className="glass glass-hover rounded-2xl p-5">
      <div className="mb-3 flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        {Icon && (
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${a.bg} ring-4 ${a.ring}`}>
            <Icon size={18} className={a.text} />
          </div>
        )}
      </div>
      {loading ? (
        <div className="h-8 w-24 animate-pulse rounded bg-slate-200/50" />
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-slate-900">{value}</span>
          {unit && <span className="text-sm font-medium text-slate-500">{unit}</span>}
        </div>
      )}
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

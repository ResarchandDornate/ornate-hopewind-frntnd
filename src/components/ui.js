"use client";

import { Loader2 } from "lucide-react";

/** Standard white panel used by every page section. */
export function Card({ title, subtitle, actions, children, className = "", bodyClassName = "" }) {
  return (
    <section className={`glass glass-hover rounded-2xl ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/60 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-bold text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function Spinner({ className = "" }) {
  return <Loader2 className={`animate-spin text-orange-500 ${className}`} />;
}

/** Centred placeholder for a panel that is still loading. */
export function LoadingBlock({ label = "Loading…", className = "h-64" }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-slate-400 ${className}`}>
      <Spinner className="h-6 w-6" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Empty state. Distinct from an error - "nothing here yet" is not a failure. */
export function EmptyState({ title = "Nothing to show yet", hint, icon: Icon, className = "h-64" }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 text-center ${className}`}>
      {Icon && <Icon size={28} className="text-slate-300" />}
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {hint && <p className="max-w-sm text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/** Error state that shows the real message rather than a generic apology. */
export function ErrorState({ error, onRetry, className = "h-64" }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-center ${className}`}>
      <p className="text-sm font-semibold text-red-600">Could not load this data</p>
      <p className="max-w-md text-xs whitespace-pre-line text-slate-500">
        {error?.message || "Unknown error"}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** Segmented control - used for the chart range pickers. */
export function SegmentedControl({ options, value, onChange, size = "md" }) {
  const pad = size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs";
  return (
    <div className="inline-flex rounded-xl border border-white/60 bg-white/50 p-1 backdrop-blur">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`rounded-md font-semibold transition ${pad} ${
            value === option.value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Page body wrapper - one place controlling gutters and max width. */
export function PageBody({ children, className = "" }) {
  return <div className={`flex-1 space-y-5 p-4 md:p-6 ${className}`}>{children}</div>;
}

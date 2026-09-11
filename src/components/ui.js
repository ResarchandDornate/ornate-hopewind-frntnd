"use client";

import { Loader2 } from "lucide-react";

/**
 * Standard panel used by every page section.
 *
 * The title carries a short brand tick on its left edge — the same shape the
 * navigation rail uses for the active item, so "this is the thing you are
 * looking at" reads the same way in both places.
 */
export function Card({ title, subtitle, actions, children, className = "", bodyClassName = "" }) {
  return (
    <section className={`glass glass-hover relative rounded-2xl ${className}`}>
      {/* Inset rather than full-bleed so it stops short of the rounded corners
          — the alternative, overflow-hidden, would clip the sticky table heads
          and chart tooltips that live inside these panels. */}
      <span
        aria-hidden
        className="absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-white/25 to-transparent"
      />

      {(title || actions) && (
        <div className="relative flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {title && (
              <span
                aria-hidden
                className="mt-1 h-7 w-0.5 shrink-0 rounded-full bg-linear-to-b from-brand to-transparent"
              />
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="truncate text-base font-bold tracking-tight text-slate-900">
                  {title}
                </h2>
              )}
              {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {actions}
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent"
          />
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
      <Spinner className="h-6 w-6 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
      <p className="hud-label">{label}</p>
    </div>
  );
}

/** Empty state. Distinct from an error - "nothing here yet" is not a failure. */
export function EmptyState({ title = "Nothing to show yet", hint, icon: Icon, className = "h-64" }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 text-center ${className}`}>
      {Icon && (
        <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200">
          <Icon size={22} className="text-slate-400" />
        </span>
      )}
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {hint && <p className="max-w-sm text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/** Error state that shows the real message rather than a generic apology. */
export function ErrorState({ error, onRetry, className = "h-64" }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-center ${className}`}>
      <p className="hud-label text-red-600">Could not load this data</p>
      <p className="max-w-md text-xs whitespace-pre-line text-slate-500">
        {error?.message || "Unknown error"}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-solid px-4 py-2 text-xs font-semibold text-on-solid transition hover:opacity-90"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** Segmented control - used for the chart range pickers. */
export function SegmentedControl({ options, value, onChange, size = "md" }) {
  // Left in sentence case on purpose: the range labels ("Last 30 days") are
  // long enough that tracked-out caps would push this control past the panel
  // header on a laptop.
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

/**
 * Four corner ticks for the auth panels. Purely decorative, and deliberately
 * one span per corner with two borders rather than eight hairline divs. Needs
 * a positioned ancestor - it anchors to the panel, not to itself.
 */
export function CornerMarks() {
  const base = "pointer-events-none absolute h-4 w-4 border-brand/40";
  return (
    <span aria-hidden>
      <span className={`${base} left-3 top-3 border-l border-t`} />
      <span className={`${base} right-3 top-3 border-r border-t`} />
      <span className={`${base} bottom-3 left-3 border-b border-l`} />
      <span className={`${base} bottom-3 right-3 border-b border-r`} />
    </span>
  );
}

/** Page body wrapper - one place controlling gutters and max width. */
export function PageBody({ children, className = "" }) {
  return <div className={`flex-1 space-y-5 p-4 md:p-6 ${className}`}>{children}</div>;
}

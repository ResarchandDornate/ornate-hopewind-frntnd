"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";

import { EmptyState } from "@/components/ui";
import { CHROME, SERIES_COLORS, axisProps, gridProps, tooltipProps } from "@/lib/chartTheme";
import { formatEnergy } from "@/lib/format";

const LABEL_FORMAT = { day: "dd MMM", month: "MMM yyyy", year: "yyyy" };

/**
 * Energy per day / month / year.
 *
 * One series, so one colour for every bar — colouring bars darker-where-bigger
 * would double-encode the height as hue and burn the only free channel on
 * information the bar length already carries. The single exception is the
 * highlighted (most recent) bar, which uses emphasis rather than a value ramp.
 */
export default function EnergyBarChart({ points = [], period = "day", height = 300 }) {
  const data = useMemo(
    () =>
      points.map((point) => {
        let label = "";
        try {
          label = format(parseISO(point.time), LABEL_FORMAT[period] || "dd MMM");
        } catch {
          label = String(point.time ?? "");
        }
        return { label, energy: Number(point.energy_kwh ?? 0) };
      }),
    [points, period]
  );

  if (!data.length) {
    return (
      <div style={{ height }} className="flex w-full">
        <EmptyState
          title="No energy recorded in this period"
          hint="Bars appear once devices have published readings."
          className="flex-1"
        />
      </div>
    );
  }

  const lastIndex = data.length - 1;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" {...gridProps} />
        <XAxis dataKey="label" {...axisProps} minTickGap={12} />
        <YAxis {...axisProps} width={68} tickFormatter={(value) => formatEnergy(value, 0)} />
        <Tooltip
          {...tooltipProps}
          cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
          formatter={(value) => [formatEnergy(value), "Energy"]}
        />
        {/* 4px rounded data-end, anchored to the baseline. */}
        <Bar dataKey="energy" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((entry, index) => (
            <Cell
              key={entry.label}
              fill={SERIES_COLORS[0]}
              // The current period is still accumulating, so it is dimmed
              // rather than read as a completed total.
              fillOpacity={index === lastIndex ? 0.45 : 1}
              stroke={index === lastIndex ? SERIES_COLORS[0] : undefined}
              strokeWidth={index === lastIndex ? 1 : 0}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EnergyBarLegend({ period }) {
  return (
    <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{ background: SERIES_COLORS[0], opacity: 0.45 }}
      />
      Current {period} still in progress
      <span className="ml-1" style={{ color: CHROME.muted }}>
        · totals update as readings arrive
      </span>
    </p>
  );
}

"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/ui";
import { axisProps, gridProps, legendProps, seriesColor, tooltipProps } from "@/lib/chartTheme";
import { formatBucketLabel, formatNumber } from "@/lib/format";

/**
 * Multi-series trend over time, on a SINGLE y-axis.
 *
 * Every series passed to one instance must share a unit. Two y-scales on one
 * plot is the classic misleading chart — the alignment between the scales is
 * arbitrary, so the reader sees a correlation the data never contained. Power
 * and voltage therefore get two charts side by side, not one chart with two
 * axes.
 */
export default function TrendChart({
  readings = [],
  series = [],
  unit = "",
  digits = 2,
  height = 260,
  emptyHint,
}) {
  const data = useMemo(
    () =>
      // The API returns newest-first; a time axis has to read left to right.
      [...readings].reverse().map((reading) => {
        const row = { label: formatBucketLabel(reading.timestamp, "minute") };
        series.forEach((entry) => {
          const value = reading[entry.key];
          // null, never 0, for an absent reading — a flat line along the
          // bottom would read as "measured zero", which is a fault.
          row[entry.key] = value === null || value === undefined ? null : Number(value);
        });
        return row;
      }),
    [readings, series]
  );

  const hasAnyValue = useMemo(
    () => data.some((row) => series.some((entry) => row[entry.key] !== null)),
    [data, series]
  );

  if (!data.length || !hasAnyValue) {
    return (
      <div style={{ height }} className="flex w-full">
        <EmptyState
          title="No data in this range"
          hint={emptyHint || "This device may not report these parameters."}
          className="flex-1"
        />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" {...gridProps} />
        <XAxis dataKey="label" {...axisProps} minTickGap={32} />
        <YAxis
          {...axisProps}
          width={60}
          tickFormatter={(value) => formatNumber(value, value >= 100 ? 0 : digits)}
        />
        <Tooltip
          {...tooltipProps}
          formatter={(value, name) => [
            `${formatNumber(value, digits)}${unit ? ` ${unit}` : ""}`,
            name,
          ]}
        />
        {/* A legend is always present for 2+ series, so identity never rests on
            colour alone. */}
        {series.length > 1 && <Legend {...legendProps} />}
        {series.map((entry, index) => (
          <Line
            key={entry.key}
            type="monotone"
            dataKey={entry.key}
            name={entry.label}
            stroke={entry.color || seriesColor(index)}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

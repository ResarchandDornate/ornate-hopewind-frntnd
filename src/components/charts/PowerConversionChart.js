"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/ui";
import { SERIES_COLORS, axisProps, gridProps, legendProps, tooltipProps } from "@/lib/chartTheme";
import { formatBucketLabel, formatPower } from "@/lib/format";

/**
 * DC input against AC output.
 *
 * Both are watts, so they legitimately share one axis — the gap between the two
 * bands IS the conversion loss, which is only readable because the scales are
 * the same. (This is exactly why a dual axis would ruin it: two arbitrary
 * scales would put the "loss" wherever the axis alignment happened to fall.)
 */
export default function PowerConversionChart({ readings = [], height = 280 }) {
  const data = useMemo(
    () =>
      [...readings].reverse().map((reading) => ({
        label: formatBucketLabel(reading.timestamp, "minute"),
        dc:
          reading.total_dc_power === null || reading.total_dc_power === undefined
            ? null
            : Number(reading.total_dc_power),
        ac: reading.power === null || reading.power === undefined ? null : Number(reading.power),
      })),
    [readings]
  );

  const hasDc = data.some((row) => row.dc !== null);

  if (!data.length) {
    return (
      <div style={{ height }} className="flex w-full">
        <EmptyState title="No readings in this range" className="flex-1" />
      </div>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="dcFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLORS[1]} stopOpacity={0.22} />
              <stop offset="100%" stopColor={SERIES_COLORS[1]} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="acFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLORS[0]} stopOpacity={0.3} />
              <stop offset="100%" stopColor={SERIES_COLORS[0]} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" {...gridProps} />
          <XAxis dataKey="label" {...axisProps} minTickGap={32} />
          <YAxis {...axisProps} width={64} tickFormatter={(value) => formatPower(value)} />
          <Tooltip {...tooltipProps} formatter={(value, name) => [formatPower(value), name]} />
          <Legend {...legendProps} />
          {hasDc && (
            <Area
              type="monotone"
              dataKey="dc"
              name="DC input"
              stroke={SERIES_COLORS[1]}
              strokeWidth={2}
              fill="url(#dcFill)"
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          <Area
            type="monotone"
            dataKey="ac"
            name="AC output"
            stroke={SERIES_COLORS[0]}
            strokeWidth={2}
            fill="url(#acFill)"
            connectNulls={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      {hasDc && (
        <p className="mt-2 text-xs text-slate-500">
          The gap between the two bands is conversion loss. A widening gap at steady output
          points at a thermal or hardware problem.
        </p>
      )}
    </>
  );
}

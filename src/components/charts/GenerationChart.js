"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/ui";
import { formatBucketLabel, formatEnergy, formatPower } from "@/lib/format";

/**
 * Generation over time.
 *
 * Short windows are a power curve (continuous quantity → area); day buckets are
 * energy totals (a discrete amount per day → bars). Reading a bar chart of
 * instantaneous power as if it were a total is the mistake this split avoids.
 */
export default function GenerationChart({ points = [], bucket = "hour", height = 320 }) {
  const showEnergy = bucket === "day";

  const data = useMemo(
    () =>
      points.map((point) => ({
        label: formatBucketLabel(point.time, bucket),
        time: point.time,
        power: Number(point.power_w ?? 0),
        energy: Number(point.energy_kwh ?? 0),
      })),
    [points, bucket]
  );

  if (!data.length) {
    return (
      <EmptyState
        title="No data in this range yet"
        hint="Readings appear here once devices start publishing to the broker."
        className="flex h-[320px] w-full"
      />
    );
  }

  const axisStyle = { fontSize: 11, fill: "#64748b" };

  const tooltipProps = {
    contentStyle: {
      borderRadius: 12,
      border: "1px solid #e2e8f0",
      fontSize: 12,
      boxShadow: "0 4px 16px rgba(15, 23, 42, 0.08)",
    },
    labelStyle: { color: "#0f172a", fontWeight: 600 },
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      {showEnergy ? (
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value) => formatEnergy(value, 0)}
          />
          <Tooltip {...tooltipProps} formatter={(value) => [formatEnergy(value), "Energy"]} />
          <Bar dataKey="energy" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={38} />
        </BarChart>
      ) : (
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="powerFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value) => formatPower(value)}
          />
          <Tooltip {...tooltipProps} formatter={(value) => [formatPower(value), "Power"]} />
          <Area
            type="monotone"
            dataKey="power"
            stroke="#f97316"
            strokeWidth={2}
            fill="url(#powerFill)"
          />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}

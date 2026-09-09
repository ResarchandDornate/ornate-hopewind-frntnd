"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/ui";
import { SERIES_COLORS, axisProps, gridProps, legendProps, seriesColor, tooltipProps } from "@/lib/chartTheme";
import { formatBucketLabel, formatNumber, formatPower } from "@/lib/format";

/**
 * String-level DC monitoring — the reason per-string data is collected at all.
 *
 * A single underperforming string is invisible in total DC power (it just looks
 * like a slightly weaker day) but obvious the moment the strings are plotted
 * against each other. That comparison is the diagnostic.
 */

/** Per-string current over time. One line per string, one shared axis (all amps). */
export function StringCurrentChart({ readings = [], metric = "current", height = 280 }) {
  const { data, stringCount } = useMemo(() => {
    const rows = [...readings].reverse();
    let count = 0;

    const mapped = rows.map((reading) => {
      const row = { label: formatBucketLabel(reading.timestamp, "minute") };
      const strings = Array.isArray(reading.pv_strings) ? reading.pv_strings : [];
      count = Math.max(count, strings.length);
      strings.forEach((entry) => {
        const value = entry?.[metric];
        row[`pv${entry.index}`] = value === null || value === undefined ? null : Number(value);
      });
      return row;
    });

    return { data: mapped, stringCount: count };
  }, [readings, metric]);

  if (!data.length || !stringCount) {
    return (
      <div style={{ height }} className="flex w-full">
        <EmptyState
          title="No string-level history"
          hint="Publish PV1_V / PV1_I keys, or a strings[] array, to populate this."
          className="flex-1"
        />
      </div>
    );
  }

  const unit = metric === "current" ? "A" : metric === "voltage" ? "V" : "W";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" {...gridProps} />
        <XAxis dataKey="label" {...axisProps} minTickGap={32} />
        <YAxis {...axisProps} width={58} tickFormatter={(value) => formatNumber(value, 1)} />
        <Tooltip
          {...tooltipProps}
          formatter={(value, name) => [`${formatNumber(value, 2)} ${unit}`, name]}
        />
        <Legend {...legendProps} />
        {Array.from({ length: stringCount }, (_, index) => (
          <Line
            key={index}
            type="monotone"
            dataKey={`pv${index + 1}`}
            name={`PV${index + 1}`}
            stroke={seriesColor(index)}
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

/**
 * Current power per string, right now.
 *
 * One series, so one colour — the bar length already encodes magnitude. The
 * weakest string is highlighted instead of ramping every bar by value.
 */
export function StringPowerBar({ strings = [], height = 200 }) {
  const data = useMemo(
    () =>
      strings.map((entry) => ({
        label: `PV${entry.index}`,
        power: Number(entry.power ?? 0),
      })),
    [strings]
  );

  if (!data.length) {
    return (
      <div style={{ height }} className="flex w-full">
        <EmptyState title="No string data" className="flex-1" />
      </div>
    );
  }

  // Flag a string producing well under the best one — that gap is the fault
  // signature this chart exists to surface.
  const best = Math.max(...data.map((row) => row.power));
  const weakIndex =
    best > 0 ? data.findIndex((row) => row.power < best * 0.85) : -1;

  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="0" {...gridProps} />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} width={64} tickFormatter={(value) => formatPower(value)} />
          <Tooltip
            {...tooltipProps}
            cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
            formatter={(value) => [formatPower(value), "Power"]}
          />
          <Bar dataKey="power" radius={[4, 4, 0, 0]} maxBarSize={56}>
            {data.map((entry, index) => (
              <Cell
                key={entry.label}
                fill={index === weakIndex ? "#d03b3b" : SERIES_COLORS[0]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {weakIndex >= 0 && (
        <p className="mt-2 flex items-center gap-2 text-xs">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#d03b3b" }} />
          <span className="text-slate-600">
            <strong className="font-semibold">{data[weakIndex].label}</strong> is producing more
            than 15% below the strongest string — worth checking for shading, soiling or a
            disconnected module.
          </span>
        </p>
      )}
    </>
  );
}

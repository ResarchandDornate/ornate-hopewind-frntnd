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
import { formatBucketLabel, formatEnergy } from "@/lib/format";

/**
 * Energy per device over shared time buckets.
 *
 * Colour follows the device id, not its position in the response — so filtering
 * the list, or a device dropping out of a window, never repaints the survivors
 * and invalidates what the reader already learned.
 *
 * Past 8 devices the tail folds into "Other" rather than generating a 9th hue
 * that would be indistinguishable under colour-vision deficiency.
 */
const MAX_SERIES = 8;

export default function DeviceComparisonChart({ payload, height = 320 }) {
  const { data, series } = useMemo(() => {
    const buckets = payload?.buckets ?? [];
    const raw = payload?.series ?? [];
    if (!buckets.length || !raw.length) return { data: [], series: [] };

    // Rank by total output so the biggest producers get the stable leading
    // slots; the identity-to-colour mapping is then fixed for this dataset.
    const ranked = [...raw].sort((a, b) => {
      const sum = (values) => values.reduce((total, value) => total + (value ?? 0), 0);
      return sum(b.values) - sum(a.values);
    });

    const shown = ranked.slice(0, MAX_SERIES);
    const rest = ranked.slice(MAX_SERIES);

    const seriesMeta = shown.map((entry, index) => ({
      key: `d${entry.device}`,
      label: entry.name,
      color: seriesColor(index),
    }));
    if (rest.length) {
      seriesMeta.push({ key: "other", label: `Other (${rest.length})`, color: "#898781" });
    }

    const rows = buckets.map((bucket, position) => {
      const row = { label: formatBucketLabel(bucket, payload.bucket) };
      shown.forEach((entry) => {
        row[`d${entry.device}`] = entry.values[position];
      });
      if (rest.length) {
        const values = rest
          .map((entry) => entry.values[position])
          .filter((value) => value !== null && value !== undefined);
        row.other = values.length ? values.reduce((sum, value) => sum + value, 0) : null;
      }
      return row;
    });

    return { data: rows, series: seriesMeta };
  }, [payload]);

  if (!data.length) {
    return (
      <div style={{ height }} className="flex w-full">
        <EmptyState
          title="No comparable data yet"
          hint="Devices appear here once they have hourly totals in this window."
          className="flex-1"
        />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="0" {...gridProps} />
        <XAxis dataKey="label" {...axisProps} minTickGap={28} />
        <YAxis {...axisProps} width={68} tickFormatter={(value) => formatEnergy(value, 0)} />
        <Tooltip {...tooltipProps} formatter={(value, name) => [formatEnergy(value), name]} />
        <Legend {...legendProps} />
        {series.map((entry) => (
          <Line
            key={entry.key}
            type="monotone"
            dataKey={entry.key}
            name={entry.label}
            stroke={entry.color}
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

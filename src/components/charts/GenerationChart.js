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

import { format } from "date-fns";

import { EmptyState } from "@/components/ui";
import { CHROME } from "@/lib/chartTheme";
import { formatBucketLabel, formatDateTime, formatEnergy, formatPower } from "@/lib/format";

/**
 * Axis tick text for an epoch.
 *
 * Steps of a day or more need the date; anything finer is a clock time, and
 * midnight gets the date too so a 24h window shows where the day turns over.
 */
function formatAxisTime(value, stepMs) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (stepMs && stepMs >= 24 * 3600_000) return format(date, "dd MMM");
  if (date.getHours() === 0 && date.getMinutes() === 0) return format(date, "dd MMM");
  return format(date, "HH:mm");
}

/**
 * Generation over time.
 *
 * Short windows are a power curve (continuous quantity → area); day buckets are
 * energy totals (a discrete amount per day → bars). Reading a bar chart of
 * instantaneous power as if it were a total is the mistake this split avoids.
 */
export default function GenerationChart({ points = [], bucket = "hour", range = "24h", height = 320 }) {
  const showEnergy = bucket === "day";

  const data = useMemo(
    () =>
      points.map((point) => ({
        label: formatBucketLabel(point.time, bucket),
        time: point.time,
        // Epoch for the numeric time axis. A categorical axis can only place a
        // tick on a point that EXISTS, so a window with gaps — or one only
        // partly filled — could never show its full span.
        t: new Date(point.time).getTime(),
        power: Number(point.power_w ?? 0),
        energy: Number(point.energy_kwh ?? 0),
      })),
    [points, bucket]
  );

  // Minute resolution over a day is ~1400 points; the curve and the tooltip
  // both need to behave differently from a 24-point hourly series.
  const dense = bucket === "minute" || data.length > 300;

  /**
   * The axis covers the WHOLE selected window, with a tick on every boundary.
   *
   * This is a numeric time scale, not a categorical one. On a category axis a
   * tick can only sit on a point that exists, so "Last 24h" showed 12:00-16:00
   * — the five hours that happened to have data — and there was no way to ask
   * for the missing nineteen. Worse, categories are spaced by INDEX, so a
   * half-hour outage occupied the same width as a half-minute one and the
   * curve quietly lied about when things happened.
   *
   * Spanning the full window means an empty stretch reads as empty, which is
   * the honest picture while history is still filling up.
   */
  const timeAxis = useMemo(() => {
    if (showEnergy || !data.length) return null;

    const match = /^(\d+)([hd])$/.exec(range || "");
    const hours = match
      ? Number(match[1]) * (match[2] === "d" ? 24 : 1)
      : 24;

    const HOUR = 3600_000;
    const end = Date.now();
    const start = end - hours * HOUR;

    // Step chosen so a window never collapses to one label or sprawls past a
    // readable count.
    const stepMs =
      hours <= 1 ? 10 * 60_000
      : hours <= 3 ? 15 * 60_000
      : hours <= 36 ? HOUR
      : hours <= 24 * 3 ? 6 * HOUR
      : 24 * HOUR;

    // Align to LOCAL clock boundaries, not to the epoch grid. Rounding the
    // epoch (Math.ceil(start / stepMs) * stepMs) only lands on :00 in zones
    // offset by whole hours — in IST (UTC+5:30) every tick came out on :30.
    const cursor = new Date(start);
    cursor.setSeconds(0, 0);
    if (stepMs >= 24 * HOUR) {
      cursor.setHours(0, 0, 0, 0);
      while (cursor.getTime() < start) cursor.setDate(cursor.getDate() + 1);
    } else {
      const stepMinutes = stepMs / 60_000;
      // setMinutes(60) rolls into the next hour on its own.
      cursor.setMinutes(Math.ceil(cursor.getMinutes() / stepMinutes) * stepMinutes);
      while (cursor.getTime() < start) cursor.setTime(cursor.getTime() + stepMs);
    }

    const ticks = [];
    while (cursor.getTime() <= end) {
      ticks.push(cursor.getTime());
      // Stepping the DATE for day-sized steps keeps midnight at midnight if a
      // zone ever shifts; adding 24h of milliseconds would not.
      if (stepMs >= 24 * HOUR) cursor.setDate(cursor.getDate() + 1);
      else cursor.setTime(cursor.getTime() + stepMs);
    }

    return { domain: [start, end], ticks, stepMs };
  }, [data.length, range, showEnergy]);

  if (!data.length) {
    return (
      <EmptyState
        title="No data in this range yet"
        hint="Readings appear here once devices start publishing to the broker."
        className="flex h-[320px] w-full"
      />
    );
  }

  const axisStyle = { fontSize: 11, fill: CHROME.muted };

  // A local variant of the shared tooltip: same tokens, tighter radius and a
  // lighter shadow to suit the smaller chart this component renders.
  const tooltipProps = {
    contentStyle: {
      borderRadius: 12,
      border: `1px solid ${CHROME.tooltipBorder}`,
      background: CHROME.tooltipBg,
      color: CHROME.ink,
      fontSize: 12,
      boxShadow: CHROME.tooltipShadow,
    },
    labelStyle: { color: CHROME.ink, fontWeight: 600 },
    // See chartTheme.tooltipProps: recharts defaults item rows to black when
    // the entry carries no colour, regardless of contentStyle.
    itemStyle: { color: CHROME.ink },
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      {showEnergy ? (
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHROME.grid} vertical={false} />
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
          <CartesianGrid strokeDasharray="3 3" stroke={CHROME.grid} vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={timeAxis?.domain ?? ["dataMin", "dataMax"]}
            ticks={timeAxis?.ticks}
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatAxisTime(value, timeAxis?.stepMs)}
            // Small gap so every boundary shows where it fits, and only a
            // genuinely cramped card thins them — each surviving label is
            // still on a boundary either way.
            minTickGap={8}
          />
          <YAxis
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value) => formatPower(value)}
          />
          <Tooltip
            {...tooltipProps}
            formatter={(value) => [formatPower(value), "Power"]}
            // The axis label is HH:mm, which is ambiguous across a 24h window.
            // The tooltip carries the full timestamp so a reading at 02:15 is
            // not mistaken for one twelve hours earlier.
            labelFormatter={(label, payload) =>
              payload?.[0]?.payload?.time
                ? formatDateTime(payload[0].payload.time)
                // label is now an epoch, never a preformatted string.
                : formatDateTime(label)
            }
          />
          <Area
            // Minute data is dense and real: `monotone` would spend effort
            // smoothing away the very transients — a cloud passing, a unit
            // tripping — that this resolution exists to show. Coarse buckets
            // are sparse enough that the curve still reads better smoothed.
            type={dense ? "linear" : "monotone"}
            dataKey="power"
            stroke="#f97316"
            strokeWidth={dense ? 1.5 : 2}
            fill="url(#powerFill)"
            dot={false}
            // A stretch with no readings is a gap in the data, not a straight
            // line across it.
            connectNulls={false}
            // Re-animating ~1400 points on every 60s refetch is visible jank.
            isAnimationActive={!dense}
          />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}

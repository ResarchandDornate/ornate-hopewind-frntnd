"use client";

import { useMemo, useRef, useState } from "react";
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
import { formatBucketLabel, formatEnergy, formatPower } from "@/lib/format";
import ChartTooltip from "@/components/charts/ChartTooltip";

// Kept as constants rather than literals so the hover math below (which has
// to replicate Recharts' own layout to convert a mouse pixel into a time)
// cannot silently drift from the chart's actual margin/YAxis width.
const CHART_MARGIN = { top: 8, right: 8, left: 0, bottom: 0 };
const Y_AXIS_WIDTH = 64;

/**
 * Power at time `t`, linearly interpolated between the two bucketed points
 * either side of it.
 *
 * The curve drawn between two sparse points (hourly buckets, say) is already
 * a visual interpolation - `type="monotone"` smooths straight through the
 * gap. Reading a value off that same gap for the hover readout is not
 * inventing precision the chart does not already imply; it is what lets the
 * cursor track the curve continuously - a per-minute readout - between two
 * hour-apart points instead of only snapping to whichever bucket is nearest.
 */
function interpolatePower(data, t) {
  if (!data.length) return null;
  if (t <= data[0].t) return data[0].power;
  const last = data[data.length - 1];
  if (t >= last.t) return last.power;
  for (let i = 0; i < data.length - 1; i++) {
    const a = data[i];
    const b = data[i + 1];
    if (t >= a.t && t <= b.t) {
      if (a.power == null || b.power == null) return null;
      const span = b.t - a.t;
      const fraction = span === 0 ? 0 : (t - a.t) / span;
      return a.power + (b.power - a.power) * fraction;
    }
  }
  return null;
}

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
  const containerRef = useRef(null);
  // Hover state for the power curve only - a bar chart of daily totals has no
  // "between two points" to interpolate.
  const [hover, setHover] = useState(null);

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
    // Anchored to the latest point actually reported, not the literal clock:
    // an hourly bucket for the current, still-in-progress hour often has not
    // landed yet, and a domain ending at Date.now() left a dead gap between
    // the end of the curve and the right edge of the chart while it waited.
    const end = Math.min(Date.now(), data[data.length - 1].t);
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
  }, [data, range, showEnergy]);

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

  // Converts a mouse/touch pixel into a timestamp using the SAME plot-area
  // bounds Recharts computed for the chart (CHART_MARGIN + Y_AXIS_WIDTH), then
  // reads the interpolated power at that instant off the already-drawn curve.
  const handleHover = (event) => {
    if (showEnergy || !timeAxis || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const point = event.touches?.[0] ?? event;
    const x = point.clientX - rect.left;
    const plotWidth = rect.width - Y_AXIS_WIDTH - CHART_MARGIN.right;
    if (plotWidth <= 0) return;
    const fraction = Math.min(1, Math.max(0, (x - Y_AXIS_WIDTH) / plotWidth));
    const t = timeAxis.domain[0] + fraction * (timeAxis.domain[1] - timeAxis.domain[0]);
    setHover({ x, width: rect.width, t, power: interpolatePower(data, t) });
  };

  const clearHover = () => setHover(null);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseMove={handleHover}
      onMouseLeave={clearHover}
      onTouchMove={handleHover}
      onTouchEnd={clearHover}
    >
      <ResponsiveContainer width="100%" height={height}>
        {showEnergy ? (
          <BarChart data={data} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHROME.grid} vertical={false} />
            <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              width={Y_AXIS_WIDTH}
              tickFormatter={(value) => formatEnergy(value, 0)}
            />
            <Tooltip
              {...tooltipProps}
              content={<ChartTooltip accent="#f97316" />}
              formatter={(value) => [formatEnergy(value), "Energy"]}
            />
            <Bar dataKey="energy" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={38} />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={CHART_MARGIN}>
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
              width={Y_AXIS_WIDTH}
              tickFormatter={(value) => formatPower(value)}
            />
            {/* No <Tooltip> here: the custom crosshair below tracks the curve
                continuously between points, which Recharts' own tooltip
                (nearest-point snapping only) cannot do. */}
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
              // A sparse bucket (hourly, or worse - a short range with only
              // one or two readings) draws no visible line at all: two points
              // make a barely-there segment and one makes nothing but a
              // zero-length stroke. Marking every real point keeps them
              // visible regardless of how few there are. Skipped once the
              // series is dense - a dot per minute would just be noise.
              dot={dense ? false : { r: 3, fill: "#f97316", strokeWidth: 0 }}
              activeDot={false}
              // A stretch with no readings is a gap in the data, not a straight
              // line across it.
              connectNulls={false}
              // Re-animating ~1400 points on every 60s refetch is visible jank.
              isAnimationActive={!dense}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>

      {!showEnergy && hover && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-0"
            style={{ left: hover.x, width: 1, background: CHROME.axis }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-2 whitespace-nowrap rounded-[10px] px-3 py-2"
            style={{
              left: hover.x + 12 > hover.width - 120 ? undefined : hover.x + 12,
              right: hover.x + 12 > hover.width - 120 ? hover.width - hover.x + 12 : undefined,
              border: `1px solid ${CHROME.tooltipBorder}`,
              background: CHROME.tooltipBg,
              boxShadow: CHROME.tooltipShadow,
            }}
          >
            <div className="text-[10px] font-medium" style={{ color: CHROME.muted }}>
              {format(new Date(hover.t), "HH:mm")}
            </div>
            {/* Same size and weight as the shared ChartTooltip value, so the
                readout does not change scale as you move between charts. */}
            <div
              className="text-base font-bold tabular-nums"
              style={{ color: "#f97316" }}
            >
              {formatPower(hover.power)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

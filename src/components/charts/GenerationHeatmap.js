"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";

import { EmptyState } from "@/components/ui";
import { CHROME, HEAT_RAMP, sequentialStep } from "@/lib/chartTheme";
import { formatEnergy } from "@/lib/format";

/**
 * Generation by hour of day against date.
 *
 * Magnitude, so a single-hue ramp light → dark — never a rainbow, which would
 * imply category boundaries that do not exist in a continuous quantity.
 *
 * Built from plain divs rather than a chart library: it is a grid of cells, and
 * the CSS grid is both simpler and more accessible than an SVG equivalent.
 */
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export default function GenerationHeatmap({ aggregates = [] }) {
  const [hovered, setHovered] = useState(null);

  const { days, cells, max } = useMemo(() => {
    const map = new Map();
    let peak = 0;

    aggregates.forEach((row) => {
      let date;
      try {
        date = parseISO(row.measurement_time);
      } catch {
        return;
      }
      if (Number.isNaN(date.getTime())) return;

      const dayKey = format(date, "yyyy-MM-dd");
      const hour = date.getHours();
      const key = `${dayKey}|${hour}`;
      // Several devices land in the same hour bucket — sum them, since the
      // heatmap shows fleet output.
      const value = (map.get(key) ?? 0) + Number(row.energy_generated ?? 0);
      map.set(key, value);
      peak = Math.max(peak, value);
    });

    const dayKeys = [...new Set([...map.keys()].map((key) => key.split("|")[0]))].sort();
    return { days: dayKeys, cells: map, max: peak };
  }, [aggregates]);

  if (!days.length) {
    return (
      <EmptyState
        title="Not enough history yet"
        hint="The heatmap fills in as hourly totals accumulate."
        className="h-64"
      />
    );
  }

  return (
    <div>
      <div className="scrollbar-thin -mx-5 overflow-x-auto px-5">
        <div className="min-w-[680px]">
          {/* Hour axis */}
          <div className="mb-1 flex items-center gap-[3px] pl-16">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="flex-1 text-center text-[9px] tabular-nums text-slate-400"
              >
                {hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}
              </div>
            ))}
          </div>

          {days.map((day) => (
            <div key={day} className="mb-[3px] flex items-center gap-[3px]">
              <div className="w-16 shrink-0 pr-2 text-right text-[10px] tabular-nums text-slate-500">
                {format(parseISO(day), "dd MMM")}
              </div>
              {HOURS.map((hour) => {
                const value = cells.get(`${day}|${hour}`) ?? 0;
                const fraction = max > 0 ? value / max : 0;
                const isHovered = hovered?.day === day && hovered?.hour === hour;
                return (
                  <div
                    key={hour}
                    // The hit target is the whole cell, not a pinpoint.
                    onMouseEnter={() => setHovered({ day, hour, value })}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered({ day, hour, value })}
                    onBlur={() => setHovered(null)}
                    tabIndex={0}
                    role="img"
                    aria-label={`${format(parseISO(day), "dd MMM")} ${String(hour).padStart(2, "0")}:00 — ${formatEnergy(value)}`}
                    title={`${format(parseISO(day), "dd MMM")} ${String(hour).padStart(2, "0")}:00 · ${formatEnergy(value)}`}
                    className={`h-5 flex-1 rounded-[3px] transition ${
                      isHovered ? "ring-2 ring-slate-900 ring-offset-1 ring-offset-[var(--surface-solid)]" : ""
                    }`}
                    style={{
                      background: value > 0 ? sequentialStep(fraction) : CHROME.empty,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {/* Scale legend — mandatory for a continuous colour encoding. */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">Less</span>
          <div className="flex gap-[2px]">
            <div className="h-3 w-4 rounded-[2px]" style={{ background: CHROME.empty }} />
            {HEAT_RAMP.filter((_, index) => index % 2 === 0).map((step) => (
              <div key={step} className="h-3 w-4 rounded-[2px]" style={{ background: step }} />
            ))}
          </div>
          <span className="text-[11px] text-slate-500">
            More · peak {formatEnergy(max)}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          {hovered
            ? `${format(parseISO(hovered.day), "dd MMM")} ${String(hovered.hour).padStart(2, "0")}:00 — ${formatEnergy(hovered.value)}`
            : "Hover a cell for its hourly total"}
        </p>
      </div>
    </div>
  );
}

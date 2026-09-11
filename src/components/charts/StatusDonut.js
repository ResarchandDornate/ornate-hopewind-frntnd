"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { EmptyState } from "@/components/ui";
import { CHROME, STATUS_COLORS, tooltipProps } from "@/lib/chartTheme";

/**
 * Fleet state at a glance.
 *
 * Part-to-whole with four segments, which is what a donut is actually good for.
 * These are status colours, not categorical ones — they mean a state, so they
 * are never reused as "series N", and every segment ships with a written label
 * and count beside it so the reading never depends on colour alone.
 */
const ORDER = [
  { key: "live", label: "Live", hint: "Reporting current data" },
  { key: "recovering", label: "Recovering", hint: "Replaying offline backlog" },
  { key: "unsynced", label: "Unsynced", hint: "Reporting, but clock not synced" },
  { key: "offline", label: "Offline", hint: "Nothing received in the window" },
];

export default function StatusDonut({ breakdown, height = 220 }) {
  const data = useMemo(
    () =>
      ORDER.map((entry) => ({
        ...entry,
        value: Number(breakdown?.[entry.key] ?? 0),
      })).filter((entry) => entry.value > 0),
    [breakdown]
  );

  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  if (!total) {
    return (
      <div style={{ height }} className="flex w-full">
        <EmptyState title="No devices registered" className="flex-1" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="92%"
              // A 2px surface gap between segments, rather than a border drawn
              // around each one.
              paddingAngle={2}
              stroke={CHROME.surface}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
              ))}
            </Pie>
            <Tooltip
              {...tooltipProps}
              cursor={false}
              formatter={(value, name) => [
                `${value} device${value === 1 ? "" : "s"} · ${((value / total) * 100).toFixed(0)}%`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Hero figure in the hole — the number is the headline, the ring is
            the breakdown. Proportional figures, not tabular. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          <span className="text-[11px] uppercase tracking-wider text-slate-500">Devices</span>
        </div>
      </div>

      <ul className="flex-1 space-y-2">
        {ORDER.map((entry) => {
          const value = Number(breakdown?.[entry.key] ?? 0);
          return (
            <li key={entry.key} className="flex items-center gap-2.5 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: STATUS_COLORS[entry.key] }}
              />
              <span className="flex-1 text-slate-700">{entry.label}</span>
              <span className="font-semibold tabular-nums text-slate-900">{value}</span>
              <span className="w-10 text-right text-xs tabular-nums text-slate-400">
                {total ? `${((value / total) * 100).toFixed(0)}%` : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

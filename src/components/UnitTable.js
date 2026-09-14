"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";

import StatusBadge from "@/components/StatusBadge";
import { EmptyState, LoadingBlock } from "@/components/ui";

/**
 * The inverters behind ONE datalogger.
 *
 * A datalogger is a gateway, not a machine: it fronts up to 247 Modbus slaves,
 * and the portal used to render whichever one reported last as if it were the
 * whole site. This table is the missing middle level — logger → inverters →
 * one inverter — so eight 250 kW machines stop being averaged into a single
 * meaningless row.
 */

const fmt = (value, digits = 0) =>
  value === null || value === undefined || value === ""
    ? "—"
    : Number(value).toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

// Watts read badly at utility scale: 211230 W is 211.2 kW to an operator.
const kw = (watts) =>
  watts === null || watts === undefined ? "—" : `${(Number(watts) / 1000).toFixed(1)} kW`;

function unitStatus(unit) {
  // A unit with no reading at all is not "offline" — nothing has ever been
  // heard from it, which is a different problem and worth showing differently.
  if (!unit.latest) return "unknown";
  if (unit.latest.hw_fault) return "fault";
  if (unit.latest.queued_offline) return "recovering";
  return unit.is_online ? "live" : "offline";
}

export default function UnitTable({ deviceId, data, isLoading }) {
  if (isLoading) return <LoadingBlock label="Loading inverters…" className="h-64" />;

  const units = data?.units ?? [];
  if (units.length === 0) {
    return (
      <EmptyState
        title="No inverters reporting yet"
        hint="Units appear as soon as the datalogger publishes their status or telemetry."
      />
    );
  }

  return (
    // Utility sites run 8-32 inverters with a dozen columns each — let the
    // table scroll inside its own box rather than pushing the page sideways.
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <th className="px-3 py-2">Inverter</th>
            <th className="px-3 py-2">Serial</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 text-right">Power</th>
            <th className="px-3 py-2 text-right">Today</th>
            <th className="px-3 py-2 text-right">Temp</th>
            <th className="px-3 py-2 text-right">Rated</th>
            <th className="px-3 py-2">Alerts</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {units.map((unit) => {
            const latest = unit.latest || {};
            const faults = latest.active_faults || [];
            const alarms = latest.active_alarms || [];
            return (
              <tr key={unit.unit_id} className="hover:bg-white/5">
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-zinc-100">Inverter {unit.unit_id}</div>
                  <div className="text-[10px] text-zinc-500">
                    {/* A unit that reports without ever announcing itself is
                        still real data — flag it rather than hiding it. */}
                    {unit.configured ? `Modbus ${unit.unit_id}` : "not in config"}
                  </div>
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">
                  {unit.serial_number || "—"}
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={unitStatus(unit)} />
                </td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-zinc-100">
                  {kw(latest.power)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-zinc-300">
                  {latest.today_energy_kwh === null || latest.today_energy_kwh === undefined
                    ? "—"
                    : `${fmt(latest.today_energy_kwh, 1)} kWh`}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-zinc-300">
                  {latest.internal_temperature === null ||
                  latest.internal_temperature === undefined
                    ? "—"
                    : `${fmt(latest.internal_temperature, 1)} °C`}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-zinc-400">
                  {unit.rated_kw ? `${unit.rated_kw} kW` : "—"}
                </td>
                <td className="px-3 py-2.5">
                  {faults.length || alarms.length ? (
                    <span
                      className="inline-flex items-center gap-1 text-xs text-amber-300"
                      title={[...faults, ...alarms].join(", ")}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {faults.length ? `${faults.length} fault` : ""}
                      {faults.length && alarms.length ? " · " : ""}
                      {alarms.length ? `${alarms.length} alarm` : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Link
                    href={`/devices/${deviceId}/unit/${unit.unit_id}`}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-orange-300 hover:bg-white/5"
                  >
                    View <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

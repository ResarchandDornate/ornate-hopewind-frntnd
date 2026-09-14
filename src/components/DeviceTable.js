"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Cpu, MapPin } from "lucide-react";

import StatusBadge from "@/components/StatusBadge";
import { formatLocation } from "@/lib/location";
import { EmptyState, LoadingBlock } from "@/components/ui";
import { formatFaultBitmask, formatLastSeen, hasActiveFault } from "@/lib/deviceStatus";
import { formatPower, formatTemperature } from "@/lib/format";

/**
 * The fleet table, shared by the dashboard and the devices page.
 *
 * It scrolls inside its own container rather than widening the page — a table
 * this wide would otherwise force the whole layout to scroll horizontally on a
 * laptop screen.
 */
// Clock skew over this is worth telling the operator about: it means the
// reading TIMES in the charts are wrong even though the values are fine.
const CLOCK_SKEW_WARN_MS = 10 * 60 * 1000;

function LastSeenCell({ device }) {
  const heard = device.last_heard_at || device.last_seen;
  const reported = device.last_seen;

  const skewMs =
    heard && reported ? Math.abs(new Date(heard) - new Date(reported)) : 0;

  if (skewMs < CLOCK_SKEW_WARN_MS) {
    return <span>{formatLastSeen(heard)}</span>;
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-amber-600"
      title={`Device clock is out by ${Math.round(skewMs / 60000)} min — it reported ${formatLastSeen(
        reported,
      )}. Readings are stored under arrival time.`}
    >
      {formatLastSeen(heard)}
      <AlertTriangle size={11} />
    </span>
  );
}

function DeviceLocation({ device }) {
  const { primary, secondary, full } = formatLocation(device);

  if (!primary) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <span className="flex items-start gap-1.5" title={full}>
      <MapPin size={13} className="mt-0.5 shrink-0 text-slate-400" />
      <span className="min-w-0">
        <span className="block truncate text-slate-700">{primary}</span>
        {secondary && (
          <span className="block truncate text-[11px] text-slate-400">{secondary}</span>
        )}
      </span>
    </span>
  );
}

export default function DeviceTable({ fleet = [], loading, compact = false }) {
  if (loading) return <LoadingBlock label="Loading devices…" />;

  if (!fleet.length) {
    return (
      <EmptyState
        icon={Cpu}
        title="No devices registered yet"
        hint="Add one in Django admin, or publish to device/<serial>/data and it will be auto-provisioned."
      />
    );
  }

  return (
    <div className="scrollbar-thin -mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[980px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            {["Name", "Serial", "Inverters", "Location", "Status", "Power", "Temp", "Faults", "Last seen", ""].map(
              (heading) => (
                <th key={heading} className="hud-label px-3 py-3 text-[11px]">
                  {heading}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {fleet.map((device) => {
            const faulted = hasActiveFault(device.reading);
            return (
              <tr
                key={device.id}
                className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70"
              >
                <td className="px-3 py-3 font-semibold text-slate-900">{device.name}</td>
                <td className="readout px-3 py-3 text-xs text-slate-500">
                  {device.serial_number}
                </td>
                {/* A datalogger fronts many inverters. Showing how many are
                    answering out of how many exist is the fastest read on
                    whether a site is healthy — "6 / 8" says more than any
                    single aggregate number can. */}
                <td className="readout px-3 py-3 text-slate-700">
                  {device.unitCount == null ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={
                          device.unitsOnline === device.unitCount
                            ? "font-semibold text-emerald-600"
                            : device.unitsOnline === 0
                              ? "font-semibold text-red-500"
                              : "font-semibold text-amber-600"
                        }
                      >
                        {device.unitsOnline}
                      </span>
                      <span className="text-slate-400">/ {device.unitCount}</span>
                      {device.unitsFaulted > 0 && (
                        <span
                          className="rounded bg-red-50 px-1.5 text-[10px] font-semibold text-red-600 ring-1 ring-red-100"
                          title={`${device.unitsFaulted} inverter(s) reporting a hardware fault`}
                        >
                          {device.unitsFaulted}!
                        </span>
                      )}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <DeviceLocation device={device} />
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={device.status} />
                </td>
                <td className="readout px-3 py-3 text-slate-700">
                  {formatPower(device.power)}
                </td>
                <td className="readout px-3 py-3 text-slate-700">
                  {formatTemperature(device.temperature)}
                </td>
                <td className="px-3 py-3">
                  {faulted ? (
                    <span className="readout rounded-md bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 ring-1 ring-red-100">
                      {device.hwFault ? "HW" : formatFaultBitmask(device.faultBitmask)}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="readout px-3 py-3 text-xs text-slate-500">
                  {/* Arrival time, not the timestamp the logger wrote into the
                      payload. A logger with an unsynced clock was making this
                      column read hours stale — or sit in the future — while its
                      data was landing in real time. */}
                  <LastSeenCell device={device} />
                </td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={`/devices/${device.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
                  >
                    Open
                    <ArrowRight size={13} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {compact && fleet.length > 0 && (
        <p className="px-3 pt-3 text-xs text-slate-400">
          Showing {fleet.length} device{fleet.length === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
}

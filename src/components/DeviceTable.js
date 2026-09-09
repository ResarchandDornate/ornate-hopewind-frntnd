"use client";

import Link from "next/link";
import { ArrowRight, Cpu, MapPin } from "lucide-react";

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
            {["Name", "Serial", "Location", "Status", "Power", "Temp", "Faults", "Last seen", ""].map(
              (heading) => (
                <th
                  key={heading}
                  className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                >
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
                <td className="px-3 py-3 font-mono text-xs text-slate-500">
                  {device.serial_number}
                </td>
                <td className="px-3 py-3">
                  <DeviceLocation device={device} />
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={device.status} />
                </td>
                <td className="px-3 py-3 tabular-nums text-slate-700">
                  {formatPower(device.power)}
                </td>
                <td className="px-3 py-3 tabular-nums text-slate-700">
                  {formatTemperature(device.temperature)}
                </td>
                <td className="px-3 py-3">
                  {faulted ? (
                    <span className="rounded-md bg-red-50 px-2 py-1 font-mono text-[11px] font-semibold text-red-600">
                      {device.hwFault ? "HW" : formatFaultBitmask(device.faultBitmask)}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-slate-500">
                  {formatLastSeen(device.last_seen)}
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

"use client";

import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import { useShell } from "@/components/ShellContext";
import StatusBadge from "@/components/StatusBadge";
import Topbar from "@/components/Topbar";
import { Card, EmptyState, ErrorState, LoadingBlock, PageBody } from "@/components/ui";
import { useFaults } from "@/hooks/useDevices";
import { formatFaultBitmask } from "@/lib/deviceStatus";
import { formatDateTime } from "@/lib/format";

export default function FaultsPage() {
  const { connected, lastMessageAt, openNav } = useShell();
  const { data, isLoading, isError, error, refetch } = useFaults(500);

  const live = data?.live ?? [];
  const history = data?.history ?? [];

  return (
    <>
      <Topbar
        section="Monitoring"
        title="Faults"
        connected={connected}
        lastMessageAt={lastMessageAt}
        onMenuClick={openNav}
      />

      <PageBody>
        <Card
          title="Active faults"
          subtitle="Devices whose most recent reading reports a fault"
        >
          {isLoading ? (
            <LoadingBlock label="Loading faults…" />
          ) : isError ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : live.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No active faults"
              hint="Every reporting device is currently fault-free."
              className="h-48"
            />
          ) : (
            <ul className="space-y-3">
              {live.map((fault) => (
                <li
                  key={`${fault.device_id}-${fault.timestamp}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200/60 bg-red-50/50 px-4 py-3 backdrop-blur-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <AlertTriangle size={18} className="shrink-0 text-red-500" />
                    <div className="min-w-0">
                      <Link
                        href={`/devices/${fault.device_id}`}
                        className="truncate font-semibold text-slate-900 hover:text-orange-600"
                      >
                        {fault.device_name}
                      </Link>
                      <p className="truncate font-mono text-xs text-slate-500">
                        {fault.serial_number} · {formatDateTime(fault.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-white/70 bg-white/80 px-2 py-1 font-mono text-xs font-semibold text-red-600">
                      {fault.hw_fault ? "HW FAULT" : formatFaultBitmask(fault.fault_bitmask)}
                    </span>
                    <StatusBadge status={fault.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Fault history"
          subtitle={
            data?.history_truncated
              ? "Most recent events (list truncated)"
              : "Every recorded fault event, newest first"
          }
          bodyClassName="p-0"
        >
          {isLoading ? (
            <LoadingBlock label="Loading history…" />
          ) : history.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No fault events recorded" className="h-48" />
          ) : (
            <div className="scrollbar-thin max-h-[32rem] overflow-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="sticky top-0 bg-white/85 backdrop-blur-md">
                  <tr className="border-b border-slate-200 text-left">
                    {["Device", "Serial", "When", "Fault", "Type"].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((fault, index) => (
                    <tr
                      key={`${fault.device_id}-${fault.timestamp}-${index}`}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/devices/${fault.device_id}`}
                          className="font-medium text-slate-900 hover:text-orange-600"
                        >
                          {fault.device_name}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 font-mono text-xs text-slate-500">
                        {fault.serial_number}
                      </td>
                      <td className="px-5 py-2.5 text-xs text-slate-500">
                        {formatDateTime(fault.timestamp)}
                      </td>
                      <td className="px-5 py-2.5 font-mono text-xs text-red-600">
                        {fault.fault_hex ?? formatFaultBitmask(fault.fault_bitmask)}
                      </td>
                      <td className="px-5 py-2.5 text-xs">
                        {fault.hw_fault ? (
                          <span className="rounded bg-red-50 px-2 py-0.5 font-semibold text-red-600">
                            Hardware
                          </span>
                        ) : (
                          <span className="rounded bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                            Bitmask
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageBody>
    </>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BarChart3, Cpu, Gauge } from "lucide-react";

import DeviceComparisonChart from "@/components/charts/DeviceComparisonChart";
import GenerationChart from "@/components/charts/GenerationChart";
import GenerationHeatmap from "@/components/charts/GenerationHeatmap";
import KpiCard from "@/components/KpiCard";
import { useShell } from "@/components/ShellContext";
import StatusBadge from "@/components/StatusBadge";
import Topbar from "@/components/Topbar";
import { Card, EmptyState, ErrorState, LoadingBlock, PageBody, SegmentedControl } from "@/components/ui";
import { useComparison, useDevices, useGeneration } from "@/hooks/useDevices";
import { fetchAggregates, fetchUserSummary } from "@/lib/devicesApi";
import { formatEnergy } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";

const RANGES = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "1y", label: "1 year" },
];

export default function AnalyticsPage() {
  const { connected, lastMessageAt, openNav } = useShell();
  const [range, setRange] = useState("7d");
  const [deviceId, setDeviceId] = useState("");

  const devicesQuery = useDevices();
  const generationQuery = useGeneration(range, deviceId || undefined);
  const comparisonQuery = useComparison(range === "24h" ? "24h" : range);
  // Hourly rows are what the heatmap pivots into hour x day cells. 14 days keeps
  // the payload to a few hundred rows while still showing a weekly pattern.
  const heatmapQuery = useQuery({
    queryKey: queryKeys.aggregates({ range: "14d", page_size: 5000 }),
    queryFn: () => fetchAggregates({ range: "14d", page_size: 5000, ordering: "measurement_time" }),
    refetchInterval: 300000,
  });
  const summaryQuery = useQuery({
    queryKey: queryKeys.userSummary,
    queryFn: fetchUserSummary,
    refetchInterval: 60000,
  });

  const summary = summaryQuery.data;
  const perDevice = summary?.devices ?? [];
  // The backend returns per-device totals unordered; biggest producer first is
  // what makes this table worth reading.
  const ranked = [...perDevice].sort((a, b) => (b.energy_kwh ?? 0) - (a.energy_kwh ?? 0));
  const best = ranked[0];

  return (
    <>
      <Topbar
        section="Insights"
        title="Analytics"
        connected={connected}
        lastMessageAt={lastMessageAt}
        onMenuClick={openNav}
      />

      <PageBody>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label="Lifetime Energy"
            value={summary ? formatEnergy(summary.total_energy_kwh) : "—"}
            icon={ArrowUpRight}
            accent="indigo"
            loading={summaryQuery.isLoading}
          />
          <KpiCard
            label="Reporting Devices"
            value={perDevice.length || "—"}
            icon={Cpu}
            accent="blue"
            loading={summaryQuery.isLoading}
          />
          <KpiCard
            label="Top Producer"
            value={best?.name || "—"}
            icon={Gauge}
            accent="orange"
            hint={best ? formatEnergy(best.energy_kwh) : undefined}
            loading={summaryQuery.isLoading}
          />
        </div>

        <Card
          title="Generation trend"
          subtitle="Fleet-wide, or narrowed to a single device"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={deviceId}
                onChange={(event) => setDeviceId(event.target.value)}
                className="rounded-xl border border-white/60 bg-white/55 px-3 py-1.5 text-sm outline-none backdrop-blur focus:border-orange-400"
              >
                <option value="">All devices</option>
                {(devicesQuery.data ?? []).map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>
              <SegmentedControl options={RANGES} value={range} onChange={setRange} size="sm" />
            </div>
          }
        >
          {generationQuery.isLoading ? (
            <LoadingBlock label="Loading trend…" />
          ) : generationQuery.isError ? (
            <ErrorState error={generationQuery.error} onRetry={generationQuery.refetch} />
          ) : (
            <GenerationChart
              points={generationQuery.data?.points ?? []}
              bucket={generationQuery.data?.bucket}
              height={340}
            />
          )}
        </Card>

        <Card
          title="Device comparison"
          subtitle="Energy per device over the same buckets — a line sitting low is underperforming"
        >
          {comparisonQuery.isLoading ? (
            <LoadingBlock label="Loading comparison…" />
          ) : comparisonQuery.isError ? (
            <ErrorState error={comparisonQuery.error} onRetry={comparisonQuery.refetch} />
          ) : (
            <DeviceComparisonChart payload={comparisonQuery.data} />
          )}
        </Card>

        <Card
          title="Generation pattern"
          subtitle="Fleet energy by hour of day, last 14 days"
        >
          {heatmapQuery.isLoading ? (
            <LoadingBlock label="Loading pattern…" />
          ) : heatmapQuery.isError ? (
            <ErrorState error={heatmapQuery.error} onRetry={heatmapQuery.refetch} />
          ) : (
            <GenerationHeatmap aggregates={heatmapQuery.data?.results ?? []} />
          )}
        </Card>

        <Card title="Energy by device" subtitle="Lifetime totals, highest first" bodyClassName="p-0">
          {summaryQuery.isLoading ? (
            <LoadingBlock label="Loading totals…" />
          ) : summaryQuery.isError ? (
            <ErrorState error={summaryQuery.error} onRetry={summaryQuery.refetch} />
          ) : ranked.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No energy recorded yet"
              hint="Totals appear once devices have published readings."
            />
          ) : (
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    {["Device", "Serial", "Status", "Energy", "Share"].map((heading) => (
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
                  {ranked.map((device) => {
                    const share = summary.total_energy_kwh
                      ? (device.energy_kwh / summary.total_energy_kwh) * 100
                      : 0;
                    return (
                      <tr
                        key={device.device_id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-3 font-semibold text-slate-900">{device.name}</td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">
                          {device.serial_number}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={device.status || "unknown"} />
                        </td>
                        <td className="px-5 py-3 tabular-nums text-slate-700">
                          {formatEnergy(device.energy_kwh)}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-orange-500"
                                style={{ width: `${Math.min(share, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs tabular-nums text-slate-500">
                              {share.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageBody>
    </>
  );
}

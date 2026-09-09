"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowUpRight, Cpu, Leaf, Thermometer, Zap } from "lucide-react";

import EnergyBarChart, { EnergyBarLegend } from "@/components/charts/EnergyBarChart";
import GenerationChart from "@/components/charts/GenerationChart";
import StatusDonut from "@/components/charts/StatusDonut";
import DeviceTable from "@/components/DeviceTable";
import KpiCard from "@/components/KpiCard";
import Topbar from "@/components/Topbar";
import { Card, ErrorState, LoadingBlock, PageBody, SegmentedControl } from "@/components/ui";
import { useDeviceFleet, useEnergySummary, useGeneration, useOverview } from "@/hooks/useDevices";
import { formatEnergy, formatNumber, formatTemperature, splitPower } from "@/lib/format";
import { useShell } from "@/components/ShellContext";

const PERIODS = [
  { value: "day", label: "Daily" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
];

const RANGES = [
  { value: "1h", label: "Last 1 hour" },
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

export default function DashboardPage() {
  const { connected, lastMessageAt, openNav } = useShell();
  const [range, setRange] = useState("24h");
  const [period, setPeriod] = useState("day");

  const overviewQuery = useOverview();
  const generationQuery = useGeneration(range);
  const energyQuery = useEnergySummary(period);
  const { fleet, isLoading: fleetLoading } = useDeviceFleet();

  const overview = overviewQuery.data;
  const livePower = splitPower(overview?.live_power_w);

  return (
    <>
      <Topbar
        section="Overview"
        title="Dashboard"
        connected={connected}
        lastMessageAt={lastMessageAt}
        onMenuClick={openNav}
      />

      <PageBody>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Devices Online"
            value={
              overview ? `${overview.devices_online}/${overview.devices_total}` : "—"
            }
            icon={Activity}
            accent="green"
            loading={overviewQuery.isLoading}
          />
          <KpiCard
            label="Live Power"
            value={livePower.value}
            unit={livePower.unit}
            icon={Zap}
            accent="orange"
            loading={overviewQuery.isLoading}
          />
          <KpiCard
            label="Today's Energy"
            value={overview ? formatEnergy(overview.today_energy_kwh) : "—"}
            icon={ArrowUpRight}
            accent="indigo"
            loading={overviewQuery.isLoading}
          />
          <KpiCard
            label="Avg Temperature"
            value={overview ? formatTemperature(overview.avg_temperature_c) : "—"}
            icon={Thermometer}
            accent="blue"
            loading={overviewQuery.isLoading}
            hint="Live devices only"
          />
          <KpiCard
            label="Active Faults"
            value={overview?.active_faults ?? "—"}
            icon={AlertTriangle}
            accent={overview?.active_faults ? "red" : "green"}
            loading={overviewQuery.isLoading}
          />
        </div>

        <Card
          title="Generation"
          subtitle={
            generationQuery.data?.bucket === "day"
              ? "Energy per day (kWh)"
              : generationQuery.data?.bucket === "hour"
                ? "Average power per hour"
                : "Average power per minute"
          }
          actions={<SegmentedControl options={RANGES} value={range} onChange={setRange} />}
        >
          {generationQuery.isLoading ? (
            <LoadingBlock label="Loading generation data…" />
          ) : generationQuery.isError ? (
            <ErrorState error={generationQuery.error} onRetry={generationQuery.refetch} />
          ) : (
            <GenerationChart
              points={generationQuery.data?.points ?? []}
              bucket={generationQuery.data?.bucket}
            />
          )}
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card
            title="Energy production"
            subtitle={
              energyQuery.data
                ? `${formatEnergy(energyQuery.data.total_energy_kwh)} over this window`
                : "Totals by period"
            }
            className="lg:col-span-2"
            actions={<SegmentedControl options={PERIODS} value={period} onChange={setPeriod} size="sm" />}
          >
            {energyQuery.isLoading ? (
              <LoadingBlock label="Loading energy totals…" />
            ) : energyQuery.isError ? (
              <ErrorState error={energyQuery.error} onRetry={energyQuery.refetch} />
            ) : (
              <>
                <EnergyBarChart points={energyQuery.data?.points ?? []} period={period} />
                <EnergyBarLegend period={period} />
              </>
            )}
          </Card>

          <Card title="Fleet status" subtitle="Current state of every device">
            {overviewQuery.isLoading ? (
              <LoadingBlock label="Loading…" className="h-56" />
            ) : (
              <StatusDonut breakdown={overview?.status_breakdown} />
            )}
          </Card>
        </div>

        <Card
          title="Device Fleet"
          subtitle="Live status of every registered device"
          actions={
            <Link
              href="/devices"
              className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
            >
              Manage all
              <ArrowUpRight size={14} />
            </Link>
          }
        >
          <DeviceTable fleet={fleet} loading={fleetLoading} compact />
        </Card>

        {overview && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryTile
              icon={Cpu}
              label="Installed capacity"
              value={splitPower(overview.total_capacity_w).value}
              unit={splitPower(overview.total_capacity_w).unit}
            />
            <SummaryTile
              icon={ArrowUpRight}
              label="Lifetime energy"
              value={formatEnergy(overview.lifetime_energy_kwh)}
            />
            <SummaryTile
              icon={Leaf}
              label="CO₂ avoided"
              value={formatNumber(overview.co2_avoided_kg / 1000, 2)}
              unit="t"
            />
          </div>
        )}
      </PageBody>
    </>
  );
}

function SummaryTile({ icon: Icon, label, value, unit }) {
  return (
    <div className="glass glass-hover flex items-center gap-4 rounded-2xl p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/60">
        <Icon size={20} className="text-slate-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="truncate text-lg font-bold text-slate-900">
          {value}
          {unit ? <span className="ml-1 text-sm font-medium text-slate-500">{unit}</span> : null}
        </p>
      </div>
    </div>
  );
}

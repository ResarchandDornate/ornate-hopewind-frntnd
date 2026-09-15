"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Gauge, MapPin, Thermometer, Zap } from "lucide-react";

import GenerationChart from "@/components/charts/GenerationChart";
import PowerConversionChart from "@/components/charts/PowerConversionChart";
import { StringCurrentChart, StringPowerBar } from "@/components/charts/StringCharts";
import TrendChart from "@/components/charts/TrendChart";
import KpiCard from "@/components/KpiCard";
import ParameterPanels from "@/components/ParameterPanels";
import ReadingsTable from "@/components/ReadingsTable";
import UnitTable from "@/components/UnitTable";
import { useShell } from "@/components/ShellContext";
import StatusBadge from "@/components/StatusBadge";
import Topbar from "@/components/Topbar";
import { Card, EmptyState, ErrorState, LoadingBlock, PageBody, SegmentedControl } from "@/components/ui";
import { useDeviceUnits, useSiteSummary } from "@/hooks/useDevices";
import { useGeneration } from "@/hooks/useDevices";
import { fetchDevice, fetchReadings } from "@/lib/devicesApi";
import { computeStatus, formatFaultBitmask, formatLastSeen, hasActiveFault } from "@/lib/deviceStatus";
import { formatNumber, formatPower, formatTemperature, splitPower } from "@/lib/format";
import { formatCoordinates, formatLocation, hasCoordinates, mapsUrl } from "@/lib/location";
import { queryKeys } from "@/lib/queryKeys";

const RANGES = [
  { value: "1h", label: "1h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

/**
 * Datalogger detail, and — when `unitId` is given — ONE inverter behind it.
 *
 * The same screen serves both because a single inverter's view is this view
 * with the readings scoped to its Modbus slave address. Copying the file for
 * the unit route would leave two renderers of the same telemetry free to drift
 * apart, which is how the per-phase and string panels end up disagreeing.
 */
export default function DeviceDetailPage({ unitId = null }) {
  const { id } = useParams();
  const { connected, lastMessageAt, openNav } = useShell();
  const [range, setRange] = useState("24h");

  const deviceQuery = useQuery({
    queryKey: queryKeys.devices.detail(id),
    queryFn: () => fetchDevice(id),
    refetchInterval: 15000,
    enabled: Boolean(id),
  });

  // page_size is raised because the history table and chart both read this one
  // query; the default 100 rows covers barely four hours at a 15-minute cadence.
  // inverter_id is part of the KEY as well as the request: without it, switching
  // between two units on the same logger would serve the previous unit's cached
  // rows and silently show inverter 3's data under inverter 7's heading.
  const readingsQuery = useQuery({
    queryKey: queryKeys.readings({ device: id, range, inverter_id: unitId ?? "all" }),
    queryFn: () =>
      fetchReadings({
        device: id,
        range,
        page_size: 1000,
        ordering: "-timestamp",
        ...(unitId != null ? { inverter_id: unitId } : {}),
      }),
    refetchInterval: 20000,
    enabled: Boolean(id),
  });

  // On a single-inverter page the curve must be that unit's, not the whole
  // site's — otherwise "Inverter 1" would plot all eight summed together.
  const generationQuery = useGeneration(range, id, unitId);

  // Only on the datalogger view. On a single inverter these would describe its
  // siblings, which is not what the page is about.
  const unitsQuery = useDeviceUnits(unitId == null ? id : null);
  const siteQuery = useSiteSummary(unitId == null ? id : null);
  const units = unitsQuery.data?.units ?? [];
  // A logger fronting exactly one inverter is the common small-site case — the
  // drill-down list would just be a single row pointing at the same telemetry
  // already on this page, so it earns its space only from two units up.
  const showUnitList = unitId == null && units.length > 1;

  const device = deviceQuery.data;
  const rawReadings = readingsQuery.data?.results ?? [];
  // PF is 0-1 and efficiency is 0-100. Rescaling PF to the same 0-100 basis is
  // what lets both share one axis honestly; a second y-scale would not.
  const readings = useMemo(
    () =>
      rawReadings.map((reading) => ({
        ...reading,
        pf_pct:
          reading.power_factor === null || reading.power_factor === undefined
            ? null
            : Number(reading.power_factor) * 100,
      })),
    [rawReadings]
  );
  const latest = readings[0] ?? null;
  const status = device ? computeStatus(device, latest) : "unknown";
  // Utility three-phase inverters report line voltage (Uab/Ubc/Uca); smaller
  // devices report phase-to-neutral. Chart whichever actually arrived.
  const usesLineVoltage = latest?.voltage_ab !== null && latest?.voltage_ab !== undefined;
  const power = splitPower(latest?.power);

  if (deviceQuery.isLoading) {
    return (
      <>
        <Topbar section="Devices" title="Device" connected={connected} onMenuClick={openNav} />
        <PageBody>
          <LoadingBlock label="Loading device…" className="h-80" />
        </PageBody>
      </>
    );
  }

  if (deviceQuery.isError) {
    return (
      <>
        <Topbar section="Devices" title="Device" connected={connected} onMenuClick={openNav} />
        <PageBody>
          <Card>
            <ErrorState error={deviceQuery.error} onRetry={deviceQuery.refetch} />
          </Card>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <Topbar
        section={unitId == null ? "Devices" : device?.name || "Datalogger"}
        title={unitId == null ? device?.name || "Device" : `Inverter ${unitId}`}
        connected={connected}
        lastMessageAt={lastMessageAt}
        onMenuClick={openNav}
      />

      <PageBody>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={unitId == null ? "/devices" : `/devices/${id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            {unitId == null ? "Back to devices" : `Back to ${device?.name || "datalogger"}`}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            {formatLocation(device).primary && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin size={13} className="text-slate-400" />
                {formatLocation(device).full || formatLocation(device).primary}
              </span>
            )}
            <StatusBadge status={status} />
            <span className="text-xs text-slate-500">
              {/* Arrival time, matching the devices table — a logger with an
                  unsynced clock otherwise reads hours stale here while its
                  data lands in real time. */}
              Last seen {formatLastSeen(device?.last_heard_at || device?.last_seen)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Active Power" value={power.value} unit={power.unit} icon={Zap} accent="orange" />
          <KpiCard
            label="Today's Yield"
            value={latest?.today_energy_kwh != null ? formatNumber(latest.today_energy_kwh, 2) : "—"}
            unit="kWh"
            icon={Gauge}
            accent="indigo"
          />
          <KpiCard
            label="Efficiency"
            value={latest?.efficiency != null ? formatNumber(latest.efficiency, 2) : "—"}
            unit="%"
            icon={Gauge}
            accent="blue"
            hint={latest?.grid_frequency != null ? `${formatNumber(latest.grid_frequency, 2)} Hz` : undefined}
          />
          <KpiCard
            // "Inverter Temp", because the source depends on the model. The
            // Hopewind protocol exposes ONE temperature register (40376,
            // internal) — no heatsink sensor and no ambient one — so a card
            // hard-labelled "Heatsink" read "—" forever on this fleet while
            // the reading it wanted sat one field away. Heatsink stays first
            // in the chain for models that do report it.
            label="Inverter Temp"
            value={formatTemperature(
              latest?.heatsink_temperature ??
                latest?.internal_temperature ??
                latest?.temperature
            )}
            icon={Thermometer}
            accent={hasActiveFault(latest) ? "red" : "green"}
            hint={latest?.device_status || undefined}
          />
        </div>

        {showUnitList && (
          <Card
            title="Inverters"
            subtitle={
              siteQuery.data
                ? `${siteQuery.data.units_online} of ${siteQuery.data.unit_count} online · ` +
                  `${((siteQuery.data.power ?? 0) / 1000).toFixed(1)} kW total` +
                  (siteQuery.data.units_faulted
                    ? ` · ${siteQuery.data.units_faulted} faulted`
                    : "")
                : `${units.length} behind this datalogger`
            }
          >
            <UnitTable deviceId={id} data={unitsQuery.data} isLoading={unitsQuery.isLoading} />
          </Card>
        )}

        <ParameterPanels reading={latest} />

        <Card
          title="Generation"
          subtitle={
            unitId != null
              ? `Inverter ${unitId} only`
              : generationQuery.data?.bucket === "day"
                ? "Site total energy per day"
                : generationQuery.data?.bucket === "minute"
                  ? "Site total power, per minute"
                  : "Site total power, hourly average"
          }
          actions={<SegmentedControl options={RANGES} value={range} onChange={setRange} size="sm" />}
        >
          {generationQuery.isLoading ? (
            <LoadingBlock label="Loading…" />
          ) : (
            <GenerationChart
              points={generationQuery.data?.points ?? []}
              bucket={generationQuery.data?.bucket}
              range={range}
            />
          )}
        </Card>

        <Card title="DC input vs AC output" subtitle="Conversion across the selected range">
          {readingsQuery.isLoading ? (
            <LoadingBlock label="Loading readings…" />
          ) : readingsQuery.isError ? (
            <ErrorState error={readingsQuery.error} onRetry={readingsQuery.refetch} />
          ) : (
            <PowerConversionChart readings={readings} />
          )}
        </Card>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card title="String current" subtitle="One line per MPPT string — a low line is a weak string">
            <StringCurrentChart readings={readings} metric="current" />
          </Card>
          <Card title="String power now" subtitle="Current output per string">
            <StringPowerBar strings={latest?.pv_strings ?? []} />
          </Card>
        </div>

        {/* Separate charts per unit rather than one chart with two y-axes:
            two arbitrary scales on one plot invent a correlation the data does
            not contain. */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card
            title={usesLineVoltage ? "Line voltage" : "Phase voltage"}
            subtitle="Volts — a spread between the three means grid imbalance"
          >
            <TrendChart
              readings={readings}
              unit="V"
              digits={1}
              series={
                usesLineVoltage
                  ? [
                      { key: "voltage_ab", label: "Uab" },
                      { key: "voltage_bc", label: "Ubc" },
                      { key: "voltage_ca", label: "Uca" },
                    ]
                  : [
                      { key: "voltage_a", label: "Ua" },
                      { key: "voltage_b", label: "Ub" },
                      { key: "voltage_c", label: "Uc" },
                    ]
              }
              emptyHint="This device reports a single phase, or no per-phase detail."
            />
          </Card>
          <Card title="Phase current" subtitle="Amps">
            <TrendChart
              readings={readings}
              unit="A"
              digits={2}
              series={[
                { key: "current_a", label: "Ia" },
                { key: "current_b", label: "Ib" },
                { key: "current_c", label: "Ic" },
              ]}
              emptyHint="This device reports a single phase, or no per-phase detail."
            />
          </Card>
          <Card title="Temperature" subtitle="Degrees Celsius">
            <TrendChart
              readings={readings}
              unit="°C"
              digits={1}
              series={[
                { key: "heatsink_temperature", label: "Heatsink" },
                { key: "internal_temperature", label: "Internal" },
                { key: "temperature", label: "Ambient" },
              ]}
            />
          </Card>
          <Card title="Efficiency & power factor" subtitle="Both dimensionless ratios (%, PF x100)">
            <TrendChart
              readings={readings}
              unit="%"
              digits={2}
              series={[
                { key: "efficiency", label: "Efficiency (%)" },
                { key: "pf_pct", label: "Power factor (x100)" },
              ]}
              emptyHint="Efficiency needs a DC reading; power factor needs a PF value."
            />
          </Card>
          <Card title="Grid frequency" subtitle="Hertz — drift outside 49.5-50.5 Hz is a grid event">
            <TrendChart
              readings={readings}
              unit="Hz"
              digits={2}
              series={[{ key: "grid_frequency", label: "Frequency" }]}
            />
          </Card>
          <Card title="Insulation resistance" subtitle="kΩ — a falling trend indicates moisture ingress">
            <TrendChart
              readings={readings}
              unit="kΩ"
              digits={0}
              series={[{ key: "insulation_resistance", label: "Riso" }]}
            />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <InstallationCard device={device} />

          <Card title="Device details" className="lg:col-span-1">
            <dl className="space-y-3 text-sm">
              <Detail label="Serial number" value={device?.serial_number} mono />
              <Detail label="Type" value={device?.device_type} />
              <Detail label="Model" value={device?.model} />
              <Detail label="Manufacturer" value={device?.manufacturer?.company_name} />
              <Detail
                label="Capacity"
                value={device?.capacity ? formatPower(device.capacity) : null}
              />
              <Detail label="Firmware" value={device?.firmware_version} />
              {hasActiveFault(latest) && (
                <Detail label="Fault mask" value={formatFaultBitmask(latest.fault_bitmask)} mono />
              )}
            </dl>
          </Card>

          {/* Server-paginated, so this reaches ALL stored history rather than
              whatever the chart's query happened to fetch. */}
          <ReadingsTable
            deviceId={id}
            unitId={unitId}
            serialNumber={device?.serial_number}
          />
        </div>
      </PageBody>
    </>
  );
}

function InstallationCard({ device }) {
  const { address, city, state, country, full } = formatLocation(device);
  const coordinates = formatCoordinates(device);
  const url = mapsUrl(device);

  return (
    <Card
      title="Installation"
      subtitle="Where this device is sited"
      actions={
        url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
          >
            Open in Maps
            <ExternalLink size={13} />
          </a>
        ) : null
      }
    >
      {full || coordinates ? (
        <dl className="space-y-3 text-sm">
          <Detail label="Address" value={address} />
          <Detail label="City" value={city} />
          <Detail label="State / Province" value={state} />
          <Detail label="Country" value={country} />
          <Detail label="Coordinates" value={coordinates} mono />
          <Detail label="Commissioned" value={device?.installation_date} />
        </dl>
      ) : (
        <EmptyState
          icon={MapPin}
          title="No location recorded"
          hint="Set the address and coordinates in Django admin, or when registering the device."
          className="h-48"
        />
      )}
      {!hasCoordinates(device) && full && (
        <p className="mt-4 text-xs text-slate-400">
          No GPS coordinates stored — the map link searches by address instead.
        </p>
      )}
    </Card>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right font-medium text-slate-900 ${mono ? "font-mono text-xs" : ""}`}>
        {value || "—"}
      </dd>
    </div>
  );
}

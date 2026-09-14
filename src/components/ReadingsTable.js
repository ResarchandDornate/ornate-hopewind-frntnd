"use client";

import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, ChevronRight, Cpu, Download } from "lucide-react";

import { Card, EmptyState, ErrorState, LoadingBlock } from "@/components/ui";
import { fetchReadings } from "@/lib/devicesApi";
import { formatDateTime, formatNumber, formatPower, formatTemperature } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Full stored history for a datalogger, or for one inverter behind it.
 *
 * This paginates SERVER-side rather than slicing a fixed window client-side.
 * The previous table read the chart's query and rendered `.slice(0, 200)`, so
 * "history" stopped at whatever the chart happened to have fetched — on a
 * 30-second cadence that is about 100 minutes for a single inverter, and the
 * rows past it were simply unreachable.
 *
 * On the datalogger view every unit's rows interleave, so the inverter column
 * is not optional there: eight machines reporting the same second are otherwise
 * eight identical-looking rows.
 */

const PAGE_SIZE = 50;

// Grouped so the table opens readable and widens on demand. A utility inverter
// reports ~40 fields; showing them all at once makes the one column an operator
// came for impossible to find.
const GROUPS = [
  { key: "ac", label: "AC detail" },
  { key: "dc", label: "DC & efficiency" },
  { key: "energy", label: "Energy" },
  { key: "health", label: "Health" },
];

const num = (value, digits, unit) =>
  value === null || value === undefined || value === ""
    ? "—"
    : `${formatNumber(value, digits)}${unit ? ` ${unit}` : ""}`;

function Th({ children, className = "" }) {
  return (
    <th
      className={`whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return (
    <td className={`whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-700 ${className}`}>
      {children}
    </td>
  );
}

// CSV, not Excel: it opens in Excel anyway and survives being piped into a
// script, which an operator sharing a fault window with the OEM usually wants.
function toCsv(rows, showInverter) {
  const headers = [
    "timestamp",
    ...(showInverter ? ["inverter"] : []),
    "power_w", "voltage_ab_v", "voltage_bc_v", "voltage_ca_v",
    "current_a_a", "current_b_a", "current_c_a",
    "grid_frequency_hz", "power_factor", "reactive_power_var",
    "total_dc_power_w", "efficiency_pct",
    "today_energy_kwh", "total_energy_kwh",
    "today_runtime_h", "total_runtime_h",
    "internal_temperature_c", "heatsink_temperature_c",
    "insulation_resistance", "leakage_current",
    "grid_connected", "hw_fault", "fault_bitmask",
    "active_faults", "active_alarms",
    "queued_offline", "timestamp_is_estimated",
  ];

  const cell = (value) => {
    if (value === null || value === undefined) return "";
    const text = Array.isArray(value) ? value.join(" | ") : String(value);
    // Quote anything that could break the column layout downstream.
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const lines = rows.map((r) =>
    [
      r.timestamp,
      ...(showInverter ? [r.inverter_id] : []),
      r.power, r.voltage_ab, r.voltage_bc, r.voltage_ca,
      r.current_a, r.current_b, r.current_c,
      r.grid_frequency, r.power_factor, r.reactive_power,
      r.total_dc_power, r.efficiency,
      r.today_energy_kwh, r.total_energy_kwh,
      r.today_runtime_hours, r.total_runtime_hours,
      r.internal_temperature, r.heatsink_temperature,
      r.insulation_resistance, r.leakage_current,
      r.grid_connected, r.hw_fault, r.fault_bitmask,
      r.active_faults, r.active_alarms,
      r.queued_offline, r.timestamp_is_estimated,
    ]
      .map(cell)
      .join(",")
  );

  return [headers.join(","), ...lines].join("\n");
}

export default function ReadingsTable({ deviceId, unitId = null, serialNumber = "" }) {
  const [page, setPage] = useState(1);
  const [groups, setGroups] = useState(() => new Set());
  const [exporting, setExporting] = useState(false);

  const showInverter = unitId == null;

  const params = useMemo(
    () => ({
      device: deviceId,
      page,
      page_size: PAGE_SIZE,
      ordering: "-timestamp",
      ...(unitId != null ? { inverter_id: unitId } : {}),
    }),
    [deviceId, page, unitId]
  );

  const query = useQuery({
    queryKey: queryKeys.readings({ history: true, ...params }),
    queryFn: () => fetchReadings(params),
    enabled: Boolean(deviceId),
    // Without this the table blanks to a spinner on every page step, which
    // makes paging through history feel like it is reloading the screen.
    placeholderData: keepPreviousData,
    refetchInterval: page === 1 ? 20000 : false,
  });

  const rows = query.data?.results ?? [];
  const total = query.data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const shows = (key) => groups.has(key);

  const toggle = (key) =>
    setGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  async function exportCsv() {
    setExporting(true);
    try {
      // The whole filtered history, not the page on screen — an export that
      // silently gave you 50 of 40,000 rows would be worse than none.
      // 5000 is the server's max_page_size.
      const all = await fetchReadings({ ...params, page: 1, page_size: 5000 });
      const csv = toCsv(all.results ?? [], showInverter);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const scope = unitId != null ? `inv${unitId}` : "all";
      link.href = url;
      link.download = `${serialNumber || deviceId}-${scope}-readings.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const rangeFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(page * PAGE_SIZE, total);

  return (
    <Card
      title="Reading history"
      subtitle={
        total
          ? `${rangeFrom.toLocaleString()}–${rangeTo.toLocaleString()} of ${total.toLocaleString()} stored readings`
          : "Every reading stored for this device"
      }
      className="lg:col-span-3"
      bodyClassName="p-0"
      actions={
        <div className="flex flex-wrap items-center gap-1.5">
          {GROUPS.map((group) => (
            <button
              key={group.key}
              type="button"
              onClick={() => toggle(group.key)}
              aria-pressed={shows(group.key)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                shows(group.key)
                  ? "bg-orange-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {group.label}
            </button>
          ))}
          <button
            type="button"
            onClick={exportCsv}
            disabled={exporting || total === 0}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
          >
            <Download size={12} />
            {exporting ? "Preparing…" : "CSV"}
          </button>
        </div>
      }
    >
      {query.isLoading ? (
        <LoadingBlock label="Loading history…" className="h-64" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Cpu}
          title="No readings stored yet"
          hint="Rows appear as soon as the datalogger publishes telemetry."
          className="h-64"
        />
      ) : (
        <>
          {/* Scrolls inside its own box: with every group enabled this table is
              far wider than a laptop screen, and the page must not scroll. */}
          <div className="scrollbar-thin max-h-[36rem] overflow-auto">
            <table className="w-full text-sm">
              {/* bg-white/85, not /90: globals.css retargets white SURFACES to
                  the dark sheet by an explicit list of opacity steps, and only
                  /80 and /85 are on it. An unlisted step stays literally white
                  and the header blinds you on the dark theme. */}
              <thead className="sticky top-0 z-10 bg-white/85 backdrop-blur-md">
                <tr className="border-b border-slate-200">
                  <Th>Time</Th>
                  {showInverter && <Th>Inverter</Th>}
                  <Th className="text-right">Power</Th>
                  {shows("ac") && (
                    <>
                      <Th>Uab</Th>
                      <Th>Ubc</Th>
                      <Th>Uca</Th>
                      <Th>Ia</Th>
                      <Th>Ib</Th>
                      <Th>Ic</Th>
                      <Th>Freq</Th>
                      <Th>PF</Th>
                      <Th>Q</Th>
                    </>
                  )}
                  {shows("dc") && (
                    <>
                      <Th>DC power</Th>
                      <Th>Efficiency</Th>
                    </>
                  )}
                  {shows("energy") && (
                    <>
                      <Th>Today</Th>
                      <Th>Total</Th>
                      <Th>Run today</Th>
                      <Th>Run total</Th>
                    </>
                  )}
                  {shows("health") && (
                    <>
                      <Th>Riso</Th>
                      <Th>I leak</Th>
                      <Th>Heatsink</Th>
                    </>
                  )}
                  <Th>Temp</Th>
                  <Th>Alerts</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const faults = r.active_faults || [];
                  const alarms = r.active_alarms || [];
                  return (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <Td className="text-xs text-slate-500">
                        {formatDateTime(r.timestamp)}
                        {r.queued_offline && (
                          <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                            backlog
                          </span>
                        )}
                        {r.timestamp_is_estimated && (
                          <span
                            className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600"
                            title="Device clock was unsynced — stored under arrival time."
                          >
                            est.
                          </span>
                        )}
                      </Td>
                      {showInverter && (
                        <Td className="font-semibold text-slate-800">
                          {r.inverter_id === 0 ? "direct" : r.inverter_id}
                        </Td>
                      )}
                      <Td className="text-right font-semibold text-slate-900">
                        {formatPower(r.power)}
                      </Td>
                      {shows("ac") && (
                        <>
                          <Td>{num(r.voltage_ab, 1, "V")}</Td>
                          <Td>{num(r.voltage_bc, 1, "V")}</Td>
                          <Td>{num(r.voltage_ca, 1, "V")}</Td>
                          <Td>{num(r.current_a, 1, "A")}</Td>
                          <Td>{num(r.current_b, 1, "A")}</Td>
                          <Td>{num(r.current_c, 1, "A")}</Td>
                          <Td>{num(r.grid_frequency, 2, "Hz")}</Td>
                          <Td>{num(r.power_factor, 3)}</Td>
                          <Td>{num(r.reactive_power, 0, "var")}</Td>
                        </>
                      )}
                      {shows("dc") && (
                        <>
                          <Td>{r.total_dc_power == null ? "—" : formatPower(r.total_dc_power)}</Td>
                          <Td>{num(r.efficiency, 2, "%")}</Td>
                        </>
                      )}
                      {shows("energy") && (
                        <>
                          <Td>{num(r.today_energy_kwh, 1, "kWh")}</Td>
                          <Td>{num(r.total_energy_kwh, 0, "kWh")}</Td>
                          <Td>{num(r.today_runtime_hours, 1, "h")}</Td>
                          <Td>{num(r.total_runtime_hours, 0, "h")}</Td>
                        </>
                      )}
                      {shows("health") && (
                        <>
                          <Td>{num(r.insulation_resistance, 0)}</Td>
                          <Td>{num(r.leakage_current, 1)}</Td>
                          <Td>{formatTemperature(r.heatsink_temperature)}</Td>
                        </>
                      )}
                      <Td>
                        {formatTemperature(
                          r.internal_temperature ?? r.temperature
                        )}
                      </Td>
                      <Td>
                        {faults.length || alarms.length || r.hw_fault ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"
                            title={[...faults, ...alarms].join(", ") || "Hardware fault flag set"}
                          >
                            <AlertTriangle size={12} />
                            {faults.length ? `${faults.length}F` : ""}
                            {faults.length && alarms.length ? " " : ""}
                            {alarms.length ? `${alarms.length}A` : ""}
                            {!faults.length && !alarms.length ? "HW" : ""}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5">
            <span className="text-xs text-slate-500">
              Page {page.toLocaleString()} of {pageCount.toLocaleString()}
              {query.isFetching && " · updating…"}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Newer
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
              >
                Older <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

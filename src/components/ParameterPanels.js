"use client";

import { Activity, Sun } from "lucide-react";

import { Card, EmptyState } from "@/components/ui";
import { formatNumber, formatPower } from "@/lib/format";

/**
 * Hopewind-style parameter readout for one device.
 *
 * Grouped the way an operator diagnoses: AC output, DC input per string, energy
 * counters, then health. A parameter the device does not report renders "—"
 * rather than 0, because a missing reading and a genuine zero mean different
 * things — a phase reading 0 V is a fault, a phase reading "—" is a
 * single-phase device.
 */

const dash = "—";

function fmt(value, unit, digits = 2) {
  if (value === null || value === undefined || value === "") return dash;
  const number = Number(value);
  if (Number.isNaN(number)) return dash;
  return `${formatNumber(number, digits)}${unit ? ` ${unit}` : ""}`;
}

function ParamGrid({ rows }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {row.label}
          </dt>
          <dd
            className={`truncate text-sm font-semibold tabular-nums ${
              row.value === dash ? "text-slate-400" : "text-slate-900"
            }`}
            title={row.title}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AcOutputPanel({ reading }) {
  // A utility three-phase inverter measures phase-to-PHASE (Uab/Ubc/Uca).
  // Smaller devices report phase-to-neutral. Labelling a 690 V line voltage as
  // "Phase A" would misstate the machine by a factor of root 3, so the label
  // follows whichever the device actually sent.
  const isLineVoltage = reading?.voltage_ab !== null && reading?.voltage_ab !== undefined;
  const voltageRows = isLineVoltage
    ? [
        { label: "Line voltage Uab", value: fmt(reading?.voltage_ab, "V") },
        { label: "Line voltage Ubc", value: fmt(reading?.voltage_bc, "V") },
        { label: "Line voltage Uca", value: fmt(reading?.voltage_ca, "V") },
      ]
    : [
        { label: "Phase A voltage", value: fmt(reading?.voltage_a, "V") },
        { label: "Phase B voltage", value: fmt(reading?.voltage_b, "V") },
        { label: "Phase C voltage", value: fmt(reading?.voltage_c, "V") },
      ];

  const rows = [
    ...voltageRows,
    { label: "Phase A current", value: fmt(reading?.current_a, "A") },
    { label: "Phase B current", value: fmt(reading?.current_b, "A") },
    { label: "Phase C current", value: fmt(reading?.current_c, "A") },
    { label: "Grid frequency", value: fmt(reading?.grid_frequency, "Hz") },
    { label: "Active power", value: reading ? formatPower(reading.power) : dash },
    { label: "Reactive power", value: fmt(reading?.reactive_power, "var") },
    { label: "Apparent power", value: fmt(reading?.apparent_power, "VA") },
    { label: "Power factor", value: fmt(reading?.power_factor, "", 3) },
    {
      label: "Grid",
      value: reading ? (reading.grid_connected ? "Connected" : "Disconnected") : dash,
    },
  ];

  return (
    <Card title="AC output" subtitle="Grid side, per phase">
      <ParamGrid rows={rows} />
    </Card>
  );
}

export function DcInputPanel({ reading }) {
  const strings = Array.isArray(reading?.pv_strings) ? reading.pv_strings : [];
  const mppt = Array.isArray(reading?.mppt_inputs) ? reading.mppt_inputs : [];

  return (
    <Card
      title="DC input"
      subtitle={
        mppt.length || strings.length
          ? `${mppt.length} MPPT tracker(s), ${strings.length} string(s)`
          : "PV side"
      }
    >
      <ParamGrid
        rows={[
          { label: "Total DC power", value: reading ? formatPower(reading.total_dc_power) : dash },
          { label: "AC / DC delta", value: reading ? formatPower(reading.delta) : dash },
          { label: "Efficiency", value: fmt(reading?.efficiency, "%") },
        ]}
      />

      {mppt.length > 0 && (
        <div className="scrollbar-thin mt-5 -mx-5 overflow-x-auto px-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            MPPT trackers
          </p>
          <table className="w-full min-w-[380px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                {["Tracker", "Voltage", "Power"].map((heading) => (
                  <th
                    key={heading}
                    className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mppt.map((entry) => (
                <tr key={entry.index} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-4 font-semibold text-slate-900">MPPT{entry.index}</td>
                  <td className="py-2 pr-4 tabular-nums text-slate-700">{fmt(entry.voltage, "V")}</td>
                  <td className="py-2 pr-4 tabular-nums text-slate-700">
                    {entry.power === null || entry.power === undefined
                      ? dash
                      : formatPower(entry.power)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {strings.length > 0 ? (
        <div className="scrollbar-thin mt-5 -mx-5 overflow-x-auto px-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            String currents
          </p>
          <table className="w-full min-w-[380px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                {["String", "Current", "Share"].map((heading) => (
                  <th
                    key={heading}
                    className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {strings.map((entry) => {
                // Compared on CURRENT, not power: this inverter measures string
                // current only, and with no documented string-to-tracker map,
                // per-string power cannot be derived.
                const best = Math.max(...strings.map((s) => Number(s.current) || 0));
                const share = best ? ((Number(entry.current) || 0) / best) * 100 : 0;
                return (
                  <tr key={entry.index} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 font-semibold text-slate-900">PV{entry.index}</td>
                    <td className="py-2 pr-4 tabular-nums text-slate-700">
                      {fmt(entry.current, "A")}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(share, 100)}%`,
                              background: share < 85 ? "#d03b3b" : "#eb6834",
                            }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-slate-500">
                          {share.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-400">
            Share is each string against the strongest. A string well below the rest points at
            shading, soiling or a disconnected module.
          </p>
        </div>
      ) : (
        <EmptyState
          icon={Sun}
          title="No string-level data"
          hint="String currents populate from Modbus registers 40316-40347."
          className="h-32"
        />
      )}
    </Card>
  );
}

export function EnergyPanel({ reading }) {
  return (
    <Card title="Energy & runtime" subtitle="Counters reported by the device">
      <ParamGrid
        rows={[
          { label: "Today's yield", value: fmt(reading?.today_energy_kwh, "kWh") },
          { label: "Total yield", value: fmt(reading?.total_energy_kwh, "kWh") },
          { label: "Runtime today", value: fmt(reading?.today_runtime_hours, "h") },
          { label: "Total runtime", value: fmt(reading?.total_runtime_hours, "h") },
        ]}
      />
      <p className="mt-4 text-xs text-slate-400">
        These are the device&apos;s own counters. The portal&apos;s energy charts are
        derived independently from power readings, so small differences are expected.
      </p>
    </Card>
  );
}

export function HealthPanel({ reading }) {
  return (
    <Card title="Health & protection" subtitle="Thermal and insulation monitoring">
      <ParamGrid
        rows={[
          { label: "Internal temp", value: fmt(reading?.internal_temperature, "°C", 1) },
          { label: "Heatsink temp", value: fmt(reading?.heatsink_temperature, "°C", 1) },
          { label: "Ambient temp", value: fmt(reading?.temperature, "°C", 1) },
          { label: "Humidity", value: fmt(reading?.humidity, "%", 1) },
          {
            label: "Insulation (Riso)",
            value: fmt(reading?.insulation_resistance, "kΩ", 0),
            title: "Insulation resistance — a falling value indicates moisture or damage",
          },
          { label: "Leakage current", value: fmt(reading?.leakage_current, "mA", 1) },
          { label: "Device state", value: reading?.device_status || dash },
          {
            label: "Fault mask",
            value: reading?.fault_bitmask || dash,
          },
        ]}
      />
    </Card>
  );
}

export function FaultPanel({ reading }) {
  const faults = Array.isArray(reading?.active_faults) ? reading.active_faults : [];
  const alarms = Array.isArray(reading?.active_alarms) ? reading.active_alarms : [];

  if (!faults.length && !alarms.length) {
    return (
      <Card title="Faults & alarms" subtitle="Decoded from the device fault words">
        <EmptyState
          icon={Activity}
          title="No active faults or alarms"
          hint="All fault and alarm words read zero."
          className="h-32"
        />
      </Card>
    );
  }

  return (
    <Card
      title="Faults & alarms"
      subtitle={`${faults.length} fault(s), ${alarms.length} alarm(s)`}
    >
      {faults.length > 0 && (
        <ul className="space-y-2">
          {faults.map((label) => (
            <li
              key={label}
              className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50/60 px-3 py-2 text-sm"
            >
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#d03b3b]" />
              <span className="text-slate-800">{label}</span>
            </li>
          ))}
        </ul>
      )}
      {alarms.length > 0 && (
        <ul className={`space-y-2 ${faults.length ? "mt-3" : ""}`}>
          {alarms.map((label) => (
            <li
              key={label}
              className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-sm"
            >
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#fab219]" />
              <span className="text-slate-800">{label}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** All panels, in diagnostic order. */
export default function ParameterPanels({ reading }) {
  if (!reading) {
    return (
      <Card title="Parameters">
        <EmptyState
          icon={Activity}
          title="No reading available"
          hint="Parameters appear once this device publishes telemetry."
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <AcOutputPanel reading={reading} />
      <DcInputPanel reading={reading} />
      <EnergyPanel reading={reading} />
      <HealthPanel reading={reading} />
      <FaultPanel reading={reading} />
    </div>
  );
}

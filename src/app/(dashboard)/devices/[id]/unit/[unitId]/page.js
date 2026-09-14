"use client";

import { useParams } from "next/navigation";

import DeviceDetailPage from "../../page";

/**
 * One inverter behind a datalogger: /devices/<id>/unit/<unitId>
 *
 * Deliberately a thin wrapper rather than a copy. The datalogger view already
 * renders every telemetry panel this needs — per-phase AC, strings, MPPT,
 * faults, trends — so scoping it by Modbus slave address is the only real
 * difference. Two copies would drift.
 */
export default function UnitDetailPage() {
  const { unitId } = useParams();
  const parsed = Number(unitId);
  return <DeviceDetailPage unitId={Number.isFinite(parsed) ? parsed : null} />;
}

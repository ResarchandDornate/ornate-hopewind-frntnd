"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  fetchComparison,
  fetchDevices,
  fetchEnergySummary,
  fetchFaults,
  fetchGeneration,
  fetchLatestTelemetry,
  fetchOverview,
} from "@/lib/devicesApi";
import { computeStatus } from "@/lib/deviceStatus";
import { queryKeys } from "@/lib/queryKeys";

// Polling intervals are the fallback path — the WebSocket normally pushes
// first. They stay short enough that a dropped socket is not obvious to the
// user, and long enough not to trip the API's per-user throttle.
const LIVE_REFETCH_MS = 15000;

export function useOverview() {
  return useQuery({
    queryKey: queryKeys.overview,
    queryFn: fetchOverview,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useGeneration(range = "24h", deviceId) {
  return useQuery({
    queryKey: queryKeys.generation(range, deviceId),
    queryFn: () => fetchGeneration(range, deviceId),
    refetchInterval: 60000,
  });
}

export function useEnergySummary(period = "day", deviceId) {
  return useQuery({
    queryKey: queryKeys.energySummary(period, deviceId),
    queryFn: () => fetchEnergySummary(period, deviceId),
    refetchInterval: 120000,
  });
}

export function useComparison(range = "7d") {
  return useQuery({
    queryKey: queryKeys.comparison(range),
    queryFn: () => fetchComparison(range),
    refetchInterval: 120000,
  });
}

export function useDevices(params) {
  return useQuery({
    queryKey: queryKeys.devices.list(params),
    queryFn: () => fetchDevices(params),
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useLatestTelemetry() {
  return useQuery({
    queryKey: queryKeys.devices.latestTelemetry,
    queryFn: fetchLatestTelemetry,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useFaults(limit = 300) {
  return useQuery({
    queryKey: queryKeys.devices.faults(limit),
    queryFn: () => fetchFaults(limit),
    refetchInterval: 30000,
  });
}

/**
 * Devices joined to their newest reading.
 *
 * The two live in separate endpoints (one row per device, one row per reading)
 * and every table in the app wants them together, so the join happens once here
 * rather than in each page.
 */
export function useDeviceFleet(params) {
  const devicesQuery = useDevices(params);
  const telemetryQuery = useLatestTelemetry();

  const fleet = useMemo(() => {
    const devices = devicesQuery.data ?? [];
    const telemetry = telemetryQuery.data ?? {};

    return devices.map((device) => {
      const reading = telemetry[String(device.id)] ?? null;
      return {
        ...device,
        reading,
        status: computeStatus(device, reading),
        power: reading ? Number(reading.power) : null,
        temperature: reading?.temperature ?? null,
        faultBitmask: reading?.fault_bitmask ?? null,
        hwFault: reading?.hw_fault ?? false,
      };
    });
  }, [devicesQuery.data, telemetryQuery.data]);

  return {
    fleet,
    isLoading: devicesQuery.isLoading || telemetryQuery.isLoading,
    isError: devicesQuery.isError,
    // Only the device list failing is fatal — with telemetry down the table
    // still renders rows, just without live values.
    error: devicesQuery.error ?? telemetryQuery.error,
    refetch: devicesQuery.refetch,
  };
}

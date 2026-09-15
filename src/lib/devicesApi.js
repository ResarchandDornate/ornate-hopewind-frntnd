import { getData, getList } from "./api";

// One module holding every backend path the app uses. Pages call these instead
// of writing URLs inline, so an endpoint rename is a one-line change here.

const qs = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.append(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : "";
};

// ---- Dashboard ----
export const fetchOverview = () => getData("/devices/devices/overview/");

export const fetchGeneration = (range = "24h", deviceId, inverterId = null) =>
  getData(
    `/devices/devices/generation/${qs({
      range,
      device: deviceId,
      ...(inverterId != null ? { inverter_id: inverterId } : {}),
    })}`
  );

export const fetchEnergySummary = (period = "day", deviceId) =>
  getData(`/devices/devices/energy_summary/${qs({ period, device: deviceId })}`);

export const fetchComparison = (range = "7d") =>
  getData(`/devices/devices/comparison/${qs({ range })}`);

// ---- Devices ----
export const fetchDevices = (params) => getList(`/devices/devices/${qs(params)}`);

export const fetchDevice = (id) => getData(`/devices/devices/${id}/`);

export const fetchDeviceStatus = (id) => getData(`/devices/devices/${id}/status/`);

// A datalogger is a GATEWAY, not one machine: it fronts up to 247 Modbus
// slaves. These two power the drill-down — the unit list behind one logger,
// and that logger's whole-site rollup.
export const fetchDeviceUnits = (id) => getData(`/devices/devices/${id}/units/`);

export const fetchSiteSummary = (id) => getData(`/devices/devices/${id}/site-summary/`);

/** Latest live reading per device, keyed by device id. */
export const fetchLatestTelemetry = () => getData("/devices/devices/latest_telemetry/");

// Per-datalogger rollup for the fleet table: power SUMMED across a gateway's
// inverters, temperature AVERAGED. latest_telemetry/ returns the newest single
// reading, which on an 8-inverter gateway is one unit presented as the site.
export const fetchFleetSummary = () => getData("/devices/devices/fleet-summary/");

export const fetchFaults = (limit = 300) =>
  getData(`/devices/devices/faults/${qs({ limit })}`);

// ---- History ----
export const fetchReadings = (params) => getData(`/devices/readings/${qs(params)}`);

export const fetchAggregates = (params) => getData(`/devices/aggregates/${qs(params)}`);

export const fetchAnalytics = (params) =>
  getData(`/devices/aggregates/analytics/${qs(params)}`);

export const fetchUserSummary = () => getData("/devices/aggregates/user-summary/");

export const fetchUserTotal = () => getData("/devices/aggregates/user-total/");

// ---- Energy rollups for one device ----
export const fetchMonthlyEnergy = (id, year, month) =>
  getData(`/devices/devices/${id}/monthly_energy/${qs({ year, month })}`);

export const fetchYearlyEnergy = (id, year) =>
  getData(`/devices/devices/${id}/yearly_energy/${qs({ year })}`);

// ---- Ops ----
export const fetchMqttHealth = () => getData("/devices/mqtt/health/");

export const fetchDbHealth = () => getData("/devices/health/db/");

export const fetchMe = () => getData("/auth/me/");

export const fetchManufacturers = () => getList("/devices/manufacturers/");

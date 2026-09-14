// Central query-key registry. Keeping keys in one place is what makes targeted
// invalidation possible - a page can invalidate `devices.all` without knowing
// which components happen to be subscribed to it.
export const queryKeys = {
  overview: ["overview"],
  generation: (range, deviceId) => ["generation", range, deviceId ?? "all"],
  energySummary: (period, deviceId) => ["energy-summary", period, deviceId ?? "all"],
  comparison: (range) => ["comparison", range],
  devices: {
    all: ["devices"],
    list: (params) => ["devices", "list", params ?? {}],
    detail: (id) => ["devices", "detail", String(id)],
    latestTelemetry: ["devices", "latest-telemetry"],
    fleetSummary: ["devices", "fleet-summary"],
    faults: (limit) => ["devices", "faults", limit ?? 300],
    units: (id) => ["devices", "units", String(id)],
    siteSummary: (id) => ["devices", "site-summary", String(id)],
  },
  readings: (params) => ["readings", params ?? {}],
  aggregates: (params) => ["aggregates", params ?? {}],
  analytics: (params) => ["analytics", params ?? {}],
  userSummary: ["aggregates", "user-summary"],
  userTotal: ["aggregates", "user-total"],
  mqttHealth: ["mqtt", "health"],
  me: ["me"],
};

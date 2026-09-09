import { format, parseISO } from "date-fns";

const nf = (digits) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return nf(digits).format(Number(value));
}

/** Watts, scaled to kW/MW once the number stops being readable in W. */
export function formatPower(watts, { withUnit = true } = {}) {
  if (watts === null || watts === undefined || Number.isNaN(Number(watts))) {
    return withUnit ? "—" : "—";
  }
  const value = Number(watts);
  const abs = Math.abs(value);

  let scaled = value;
  let unit = "W";
  if (abs >= 1_000_000) {
    scaled = value / 1_000_000;
    unit = "MW";
  } else if (abs >= 1000) {
    scaled = value / 1000;
    unit = "kW";
  }

  const digits = unit === "W" ? 0 : 2;
  const text = nf(digits).format(scaled);
  return withUnit ? `${text} ${unit}` : text;
}

/** Split form, for KPI cards that render the unit in its own element. */
export function splitPower(watts) {
  if (watts === null || watts === undefined || Number.isNaN(Number(watts))) {
    return { value: "—", unit: "" };
  }
  const full = formatPower(watts);
  const [value, unit = ""] = full.split(" ");
  return { value, unit };
}

export function formatEnergy(kwh, digits = 2) {
  if (kwh === null || kwh === undefined || Number.isNaN(Number(kwh))) return "—";
  const value = Number(kwh);
  if (Math.abs(value) >= 1000) {
    return `${nf(digits).format(value / 1000)} MWh`;
  }
  return `${nf(digits).format(value)} kWh`;
}

export function formatTemperature(celsius) {
  if (celsius === null || celsius === undefined || Number.isNaN(Number(celsius))) return "—";
  return `${nf(1).format(Number(celsius))} °C`;
}

const toDate = (value) => {
  if (!value) return null;
  try {
    return typeof value === "string" ? parseISO(value) : new Date(value);
  } catch {
    return null;
  }
};

export function formatDateTime(value) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return "—";
  return format(date, "dd MMM yyyy, HH:mm:ss");
}

export function formatTime(value) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return "—";
  return format(date, "HH:mm");
}

/** Axis label that stays readable whether the bucket is minutes or days. */
export function formatBucketLabel(value, bucket) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  if (bucket === "day") return format(date, "dd MMM");
  if (bucket === "hour") return format(date, "dd MMM HH:00");
  return format(date, "HH:mm");
}

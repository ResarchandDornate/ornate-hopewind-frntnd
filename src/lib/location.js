/**
 * Installation-location formatting, shared by the fleet table and the device
 * page so both describe a site the same way.
 *
 * Every field is optional - a device auto-provisioned from MQTT has a serial
 * and nothing else until someone fills the site in - so each part is included
 * only when present rather than rendering "undefined, undefined".
 */
export function formatLocation(device) {
  const city = device?.city?.trim();
  const state = device?.state?.trim();
  const country = device?.country?.trim();
  const address = device?.address?.trim();

  // City is the useful headline; fall back to whatever coarser field exists.
  const primary = city || state || country || "";
  const secondary = [city ? state : null, country].filter(Boolean).join(", ");
  const full = [address, city, state, country].filter(Boolean).join(", ");

  return { primary, secondary, full, address, city, state, country };
}

export function hasCoordinates(device) {
  return (
    device?.latitude !== null &&
    device?.latitude !== undefined &&
    device?.longitude !== null &&
    device?.longitude !== undefined
  );
}

export function formatCoordinates(device) {
  if (!hasCoordinates(device)) return null;
  return `${Number(device.latitude).toFixed(5)}, ${Number(device.longitude).toFixed(5)}`;
}

/** Link out to a map rather than embedding one - no extra dependency, and it
 *  opens in whatever the viewer already uses. */
export function mapsUrl(device) {
  if (hasCoordinates(device)) {
    return `https://www.google.com/maps/search/?api=1&query=${device.latitude},${device.longitude}`;
  }
  const { full } = formatLocation(device);
  return full ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}` : null;
}

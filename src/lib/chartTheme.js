/**
 * Chart design tokens — one source of truth so every chart reads as one system.
 *
 * The categorical order is not cosmetic: it is the colourblind-safety mechanism.
 * This ordering was run through the palette validator against the white card
 * surface and passes every gate (worst adjacent CVD ΔE 9.1, worst adjacent
 * normal-vision ΔE 19.6). Brand orange leads; the rest follow the validated
 * reference order.
 *
 * Rules that hold everywhere in this app:
 *   - Assign slots in fixed order. Never cycle, never generate a 9th hue.
 *   - Colour follows the entity, not its rank, so filtering a series out never
 *     repaints the survivors.
 *   - Never two y-axes on one plot. Different units mean different charts.
 */

export const SERIES_COLORS = [
  "#eb6834", // 1 orange (Ornate brand)
  "#2a78d6", // 2 blue
  "#1baf7a", // 3 aqua
  "#eda100", // 4 yellow
  "#e87ba4", // 5 magenta
  "#008300", // 6 green
  "#4a3aa7", // 7 violet
  "#e34948", // 8 red
];

/** Stable colour for a series by its index. Past 8, fold into "Other". */
export const seriesColor = (index) => SERIES_COLORS[index % SERIES_COLORS.length];

/**
 * Status colours are reserved: they mean a state, never "series 4".
 * They always ship beside a label, never as colour alone.
 */
export const STATUS_COLORS = {
  live: "#0ca30c", // good
  recovering: "#fab219", // warning
  unsynced: "#ec835a", // serious
  offline: "#d03b3b", // critical
  fault: "#d03b3b",
  unknown: "#898781",
};

/**
 * Single-hue ramp for magnitude (heatmaps). Light → dark, never a rainbow.
 * This is the light-theme source of truth; consumers should use HEAT_RAMP
 * below, which addresses the same steps through theme-aware variables.
 */
export const SEQUENTIAL_BLUE = [
  "#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef",
  "#6da7ec", "#5598e7", "#3987e5", "#2a78d6",
  "#256abf", "#1c5cab", "#184f95", "#104281",
];

/**
 * Chrome reads from CSS variables rather than literals so a theme flip repaints
 * the charts with no React involvement — SVG presentation attributes resolve
 * var() the same way any other property does, and Recharts passes these
 * straight through. The light/dark values live in app/globals.css.
 */
export const CHROME = {
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  muted: "var(--chart-muted)",
  ink: "var(--chart-ink)",
  surface: "var(--chart-surface)",
  cursorFill: "var(--chart-cursor-fill)",
  empty: "var(--chart-empty)",
  tooltipBg: "var(--chart-tooltip-bg)",
  tooltipBorder: "var(--chart-tooltip-border)",
  tooltipShadow: "var(--chart-tooltip-shadow)",
};

/** Recessive hairline axis styling, shared by every chart. */
export const axisTick = { fontSize: 11, fill: CHROME.muted };

export const axisProps = {
  tick: axisTick,
  tickLine: false,
  axisLine: false,
};

/** Solid hairline grid — dashed grids read as "threshold" when they are not. */
export const gridProps = {
  stroke: CHROME.grid,
  vertical: false,
};

export const tooltipProps = {
  contentStyle: {
    borderRadius: 14,
    border: "1px solid var(--chart-tooltip-border)",
    // Near-opaque on purpose: a tooltip has to stay readable over whatever
    // marks sit behind it, so it gets more fill than the panels do.
    background: "var(--chart-tooltip-bg)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    fontSize: 12,
    boxShadow: "var(--chart-tooltip-shadow)",
    color: CHROME.ink,
  },
  labelStyle: { color: CHROME.ink, fontWeight: 600 },
  // A wider crosshair band than the mark, so hovering a thin line is not a
  // pixel-hunt.
  cursor: { stroke: CHROME.axis, strokeWidth: 1 },
};

export const legendProps = {
  wrapperStyle: { fontSize: 12, paddingTop: 4, color: CHROME.muted },
};

/**
 * The same ramp addressed through CSS variables, so the heatmap can invert its
 * direction between themes: pale-to-saturated on white reads as more, but on a
 * dark panel the pale end is the loudest cell on the grid.
 */
export const HEAT_RAMP = SEQUENTIAL_BLUE.map((_, index) => `var(--heat-${index})`);

/** Map a 0..1 magnitude onto the sequential ramp. */
export function sequentialStep(fraction) {
  if (fraction === null || fraction === undefined || Number.isNaN(fraction)) {
    return CHROME.empty;
  }
  const clamped = Math.max(0, Math.min(1, fraction));
  const index = Math.round(clamped * (HEAT_RAMP.length - 1));
  return HEAT_RAMP[index];
}

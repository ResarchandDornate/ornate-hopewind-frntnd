"use client";

import { CHROME } from "@/lib/chartTheme";

/**
 * The tooltip every chart shares.
 *
 * The reading is the point of a tooltip, so the value is set large and in its
 * series colour while the series name stays small and recessive. This mirrors
 * the crosshair readout GenerationChart already draws by hand, so hovering any
 * chart in the app now gives the same shape of answer.
 *
 * Why a custom content component rather than more `contentStyle`: Recharts
 * renders each item row as one line and styles it through `itemStyle`, which
 * cannot address the name and the value separately. Taking over the body is the
 * only way to size and colour them differently.
 *
 * Charts pass their existing `formatter` straight through — Recharts clones this
 * element with the Tooltip's own props — so no call site has to restate how its
 * numbers are written.
 */

/**
 * Nudge a series colour toward the current ink colour so it stays readable on
 * whichever tooltip background is behind it.
 *
 * Needed because the categorical palette is tuned for marks on a chart surface,
 * not for text: #eda100 on a white tooltip is about 2:1, under the 3:1 that even
 * large text needs. Mixing toward --chart-ink darkens it on light backgrounds
 * and lightens it on dark ones, in both cases keeping the hue recognisable
 * against the mark it labels.
 */
export const legible = (color) => `color-mix(in srgb, ${color} 75%, ${CHROME.ink})`;

const SURFACE = {
  borderRadius: 12,
  border: `1px solid ${CHROME.tooltipBorder}`,
  background: CHROME.tooltipBg,
  boxShadow: CHROME.tooltipShadow,
  padding: "8px 11px",
};

export default function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  /** Force one colour for every row — for single-series charts coloured by Cell. */
  accent,
}) {
  if (!active || !payload?.length) return null;

  const rows = payload.filter(
    (entry) => entry.value !== null && entry.value !== undefined
  );
  if (!rows.length) return null;

  return (
    <div style={SURFACE}>
      {label !== undefined && label !== null && label !== "" && (
        <div
          style={{
            color: CHROME.muted,
            fontSize: 10,
            fontWeight: 500,
            marginBottom: 5,
          }}
        >
          {labelFormatter ? labelFormatter(label, payload) : label}
        </div>
      )}

      <div style={{ display: "grid", rowGap: 3 }}>
        {rows.map((entry, index) => {
          // A formatter may return either a bare value or [value, name].
          const formatted = formatter
            ? formatter(entry.value, entry.name, entry, index, payload)
            : entry.value;
          const [value, name] = Array.isArray(formatted)
            ? formatted
            : [formatted, entry.name];

          // A Bar coloured through <Cell> carries no `color` on its payload
          // entry, which is why a fallback chain is needed rather than
          // entry.color alone.
          const raw =
            accent || entry.color || entry.stroke || entry.fill || CHROME.ink;

          return (
            <div
              key={entry.dataKey ?? `${name}-${index}`}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: raw,
                  flexShrink: 0,
                }}
              />
              {name ? (
                <span style={{ color: CHROME.muted, fontSize: 11 }}>{name}</span>
              ) : null}
              <span
                style={{
                  marginLeft: "auto",
                  paddingLeft: 12,
                  color: legible(raw),
                  fontSize: 16,
                  fontWeight: 700,
                  lineHeight: 1.25,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

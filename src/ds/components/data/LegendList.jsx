import React from "react";

/** Legend beside a donut or line chart: dot, label, count, share. */
export function LegendList({ items = [], showShare = true, style }) {
  const total = items.reduce((s, i) => s + (i.value || 0), 0) || 1;
  return (
    <div style={{ display: "grid", gap: 10, ...style }}>
      {items.map((it, i) => (
        <div
          key={it.label}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%" }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              flex: "0 0 auto",
              background: it.color || "var(--tk-viz-" + ((i % 6) + 1) + ")",
            }}
          />
          <span
            style={{
              flex: 1,
              font: "400 13px/18px var(--tk-font-sans)",
              color: "var(--tk-ink-500)",
            }}
          >
            {it.label}
          </span>
          <span
            style={{
              font: "600 13px/18px var(--tk-font-sans)",
              color: "var(--tk-ink-900)",
            }}
          >
            {it.display ?? it.value}
          </span>
          {showShare && (it.value != null || Object.hasOwn(it, 'percent')) && (
            <span className="tk-meta" style={{ width: 46, textAlign: "right" }}>
              {Object.hasOwn(it, 'percent') && !Number.isFinite(it.percent) ? '—' : `(${Number.isFinite(it.percent)
                ? Math.round(it.percent * 10) / 10
                : Math.round((it.value / total) * 1000) / 10}%)`}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

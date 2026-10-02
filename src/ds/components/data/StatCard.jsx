import React from "react";
import { Card } from "../core/Card.jsx";
import { Icon } from "../../assets/icons/Icon.jsx";

const TINT = {
  blue: ["var(--tk-blue-soft)", "var(--tk-blue)"],
  green: ["var(--tk-success-soft)", "var(--tk-success)"],
  amber: ["var(--tk-warning-soft)", "var(--tk-warning)"],
  red: ["var(--tk-danger-soft)", "var(--tk-danger)"],
  purple: ["var(--tk-purple-soft)", "var(--tk-purple)"],
  teal: ["var(--tk-teal-soft)", "var(--tk-teal)"],
  navy: ["var(--tk-neutral-soft)", "var(--tk-navy)"],
};

/**
 * The KPI tile that opens every console page: icon tile, label, big figure, delta or caption.
 * Set `labelPosition="bottom"` for the minimal variant — label sits under the value, no caption.
 * The figure never wraps: it scales down to fit the card (see `.tk-stat-card` in styles.css).
 */
export function StatCard({
  icon,
  tint = "blue",
  label,
  value,
  delta,
  direction = "up",
  caption,
  sparkline,
  layout = "row",
  labelPosition = "top",
  style,
}) {
  const [bg, fg] = TINT[tint] || TINT.blue;
  const good = direction === "up";
  const labelBelow = labelPosition === "bottom";
  const sideIcon = icon && layout !== "stack";
  // Inputs for the fit-to-card type scale: how many characters the figure has,
  // and how much of the card's inner width the icon tile and its gap take up.
  const fit = {
    "--tk-stat-len": typeof value === "string" || typeof value === "number" ? Math.max(1, String(value).length) : undefined,
    "--tk-stat-chrome": sideIcon ? "60px" : "2px",
  };
  const labelEl = (
    <span
      style={{
        font: "600 13px/18px var(--tk-font-sans)",
        color: "var(--tk-ink-400)",
        marginTop: labelBelow ? 2 : 0,
      }}
    >
      {label}
    </span>
  );
  const tile = (
    <span
      style={{
        width: 42,
        height: 42,
        borderRadius: "var(--tk-r-lg)",
        background: bg,
        color: fg,
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
      }}
    >
      <Icon name={icon} size={20} />
    </span>
  );
  return (
    <Card className="tk-stat-card" style={{ display: "grid", gap: 12, minWidth: 0, ...fit, ...style }}>
      <div
        style={{
          display: "flex",
          flexDirection: layout === "stack" ? "column" : "row",
          alignItems: layout === "stack" ? "flex-start" : "start",
          gap: 16,
          minWidth: 0,
        }}
      >
        {icon && tile}
        <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
          {!labelBelow && labelEl}
          <span className="tk-metric">{value}</span>
          {labelBelow && labelEl}
          {!labelBelow && (delta || caption) && (
            <span
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 5,
                marginTop: 2,
                flexWrap: "wrap",
                minWidth: 0,
              }}
            >
              {delta && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    font: "600 12px/16px var(--tk-font-sans)",
                    flex: "0 0 auto",
                    color: good ? "var(--tk-success)" : "var(--tk-danger)",
                  }}
                >
                  <Icon name={good ? "arrow-up" : "arrow-down"} size={12} />
                  {delta}
                </span>
              )}
              {caption && (
                <span
                  style={{
                    font: "400 13px/15px var(--tk-font-sans)",
                    color: "var(--tk-ink-400)",
                  }}
                >
                  {caption}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
      {sparkline}
    </Card>
  );
}

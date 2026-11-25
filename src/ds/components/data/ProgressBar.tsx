import React from "react";

export function ProgressBar({
  value = 0,
  max = 100,
  color = "var(--tk-blue)",
  height = 6,
  label,
  caption,
  style,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ display: "grid", gap: 6, ...style }}>
      {(label || caption) && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              font: "500 13px/18px var(--tk-font-sans)",
              color: "var(--tk-ink-500)",
              flex: 1,
            }}
          >
            {label}
          </span>
          <span className="tk-label">{caption}</span>
        </div>
      )}
      <div
        style={{
          height,
          borderRadius: 999,
          background: "var(--tk-viz-track)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: pct + "%",
            height: "100%",
            borderRadius: 999,
            background: color,
            transition: "width var(--tk-dur-slow) var(--tk-ease)",
          }}
        />
      </div>
    </div>
  );
}

export interface ProgressBarProps {
  value?: number;
  max?: number;
  color?: string;
  height?: number;
  label?: React.ReactNode;
  /** right-aligned caption, e.g. "65% used" or "₦10,000,000" */
  caption?: React.ReactNode;
  style?: React.CSSProperties;
}

import React from "react";
import { Card } from "../core/Card";
import { Icon } from "../../assets/icons/Icon";
import { StatusDot } from "../feedback/StatusDot";

/**
 * Frame for the live map cards. This system ships the CHROME only — header,
 * legend, zoom controls, expand — and leaves the map surface to the consumer's
 * real tile layer, passed as children. Do not fake a map with hand-drawn SVG.
 */
export function MapPanel({
  title = "Live Map",
  description,
  status,
  legend = [],
  height = 380,
  onExpand,
  children,
  style,
}: MapPanelProps) {
  return (
    <Card pad="none" style={{ overflow: "hidden", ...style }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          padding: "16px var(--tk-card-pad)",
        }}
      >
        <div>
          <h3
            className="tk-title"
            style={{ flex: 1, marginBottom: description ? 4 : 0 }}
          >
            {title}
          </h3>
          <p className="tk-meta">{description}</p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "16px var(--tk-card-pad)",
          }}
        >
          {status && <StatusDot tone="success" pulse label={status} />}
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              aria-label="Expand map"
              style={{
                width: 30,
                height: 30,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                borderRadius: "var(--tk-r-sm)",
                border: "1px solid var(--tk-line-strong)",
                background: "#fff",
                color: "var(--tk-ink-500)",
              }}
            >
              <Icon name="maximize-2" size={14} />
            </button>
          )}
        </div>
      </div>
      <div
        style={{
          position: "relative",
          height,
          margin: "0 var(--tk-card-pad) var(--tk-card-pad)",
          borderRadius: "var(--tk-r-lg)",
          overflow: "hidden",
          background: "var(--tk-surface-sunk)",
        }}
      >
        {children}
        {legend.length > 0 && (
          <div
            style={{
              position: "absolute",
              left: 12,
              top: 12,
              display: "grid",
              gap: 7,
              padding: "10px 12px",
              borderRadius: "var(--tk-r-sm)",
              background: "rgba(255,255,255,.94)",
              boxShadow: "var(--tk-shadow-card)",
            }}
          >
            {legend.map((l) => (
              <span
                key={l.label as React.Key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  font: "500 13px/16px var(--tk-font-sans)",
                  color: "var(--tk-ink-500)",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: l.color,
                  }}
                />
                {l.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

export interface MapLegendItem { label: React.ReactNode; color: string; }
export interface MapPanelProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  status?: React.ReactNode;
  legend?: MapLegendItem[];
  height?: number;
  onExpand?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

import React from "react";
import { Card } from "./Card";
import { Icon } from "../../assets/icons/Icon";
import { Tooltip } from "../feedback/Tooltip";

/** Card with the standard 16/600 title row: optional icon, count, right-hand link or control. */
export function SectionCard({
  title,
  description,
  icon,
  tooltip,
  count,
  action,
  footer,
  children,
  pad = "md",
  className,
  style,
}: SectionCardProps) {
  return (
    <Card
      pad="none"
      className={`tk-section-card${className ? ` ${className}` : ""}`}
      style={{ display: "flex", flexDirection: "column", ...style }}
    >
      <div className="tk-section-card-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          padding: "16px var(--tk-card-pad) 0",
        }}
      >
        {icon && <Icon name={icon} size={18} color="var(--tk-blue)" />}
        <div>
          <h3
            className="tk-section"
            style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: description ? 4 : 0 }}
          >
            {title}
            {tooltip && (
              <Tooltip label={tooltip}>
                <Icon name="info" size={14} color="var(--tk-ink-300)" />
              </Tooltip>
            )}
          </h3>
          <p className="tk-meta">{description}</p>
        </div>
        <div className="tk-section-card-action"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px ",
          }}
        >
          {count != null && (
            <span
              style={{
                font: "600 12px/1 var(--tk-font-sans)",
                color: "var(--tk-blue)",
                background: "var(--tk-blue-soft)",
                padding: "4px 8px",
                borderRadius: "var(--tk-r-xs)",
              }}
            >
              {count}
            </span>
          )}
          {action}
        </div>
      </div>
      <div className="tk-section-card-body"
        style={{
          padding:
            pad === "none" ? 0 : "14px var(--tk-card-pad) var(--tk-card-pad)",
          flex: 1,
          minWidth: 0,
        }}
      >
        {children}
      </div>
      {footer && (
        <div className="tk-section-card-footer"
          style={{
            borderTop: "1px solid var(--tk-line)",
            padding: "12px var(--tk-card-pad)",
            textAlign: "center",
          }}
        >
          {footer}
        </div>
      )}
    </Card>
  );
}

/**
 * @startingPoint section="Core" subtitle="Titled panel with footer link" viewport="700x260"
 */
export interface SectionCardProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Lucide glyph shown before the title */
  icon?: string;
  /** Hover explanation shown from an info glyph beside the title */
  tooltip?: React.ReactNode;
  /** blue pill count beside the title, e.g. 68 opportunities */
  count?: number | string;
  /** right-hand control: a "View all" link, a range Select, a Tabs strip */
  action?: React.ReactNode;
  /** centred footer link under a hairline, e.g. "View all events" */
  footer?: React.ReactNode;
  pad?: "none" | "md";
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

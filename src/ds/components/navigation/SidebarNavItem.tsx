import React from "react";
import { Icon } from "../../assets/icons/Icon";

/** One sidebar row. Active is a solid blue pill; idle rows wash sunk grey on hover. */
export function SidebarNavItem({
  icon,
  label,
  active,
  collapsed,
  expandable,
  expanded,
  badge,
  depth = 0,
  onClick,
  style,
}: SidebarNavItemProps) {
  const [hot, setHot] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        height: "var(--tk-h-nav-item)",
        padding: "0 12px 0 " + (12 + depth * 16) + "px",
        borderRadius: "var(--tk-r-md)",
        border: 0,
        cursor: "pointer",
        textAlign: "left",
        background: active
          ? "var(--tk-blue)"
          : hot
            ? "var(--tk-surface-sunk)"
            : "transparent",
        color: active ? "#fff" : "var(--tk-ink-500)",
        font: (active ? 600 : 500) + " 14px/1 var(--tk-font-sans)",
        transition: "var(--tk-transition)",
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={18} />}
      {!collapsed && (
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      )}
      {!collapsed && badge}
      {!collapsed && expandable && (
        <Icon name={expanded ? "chevron-down" : "chevron-right"} size={15} />
      )}
    </button>
  );
}

export interface SidebarNavItemProps {
  /** Lucide glyph id */
  icon?: string;
  label: React.ReactNode;
  active?: boolean;
  /** icon-only rail */
  collapsed?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  /** e.g. a <CountBadge/> */
  badge?: React.ReactNode;
  /** 1 for a child item under an expanded group */
  depth?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
}

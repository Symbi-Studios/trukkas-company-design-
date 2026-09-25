import React from "react";
import { Logo } from "../core/Logo.jsx";
import { Icon } from "../../assets/icons/Icon.jsx";

/** Fixed-width navigation column — white, with a hairline right edge.
 *  Children are SidebarSectionLabel + SidebarNavItem rows. */
export function Sidebar({ collapsed, children, header, footer, onCollapse, style }) {
  return (
    <aside
      className="tk-scroll tk-sidebar"
      data-collapsed={collapsed || undefined}
      style={{
        width: collapsed
          ? "var(--tk-w-sidebar-collapsed)"
          : "var(--tk-w-sidebar)",
        flex: "0 0 auto",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRight: "1px solid var(--tk-line)",
        height: "100%",
        overflowY: "auto",
        transition: "width var(--tk-dur-slow) var(--tk-ease)",
        ...style,
      }}
    >
      <div style={{ padding: "18px 14px 6px" }}>
        <Logo showWordmark={!collapsed} size={36} />
      </div>
      {header && <div style={{ padding: "8px 14px 6px" }}>{header}</div>}
      <nav
        style={{
          flex: 1,
          padding: "6px 10px 12px",
          display: "grid",
          alignContent: "start",
        }}
      >
        {children}
      </nav>
      {footer && <div style={{ padding: "0 10px 12px" }}>{footer}</div>}
      {onCollapse && (
        <button
          type="button"
          onClick={onCollapse}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            margin: "0 10px 14px",
            padding: "0 12px",
            height: 36,
            borderRadius: "var(--tk-r-md)",
            border: 0,
            background: "transparent",
            cursor: "pointer",
            color: "var(--tk-ink-400)",
            font: "500 13px/1 var(--tk-font-sans)",
          }}
        >
          <Icon
            name={collapsed ? "chevrons-right" : "chevrons-left"}
            size={16}
          />
          {!collapsed && "Collapse Menu"}
        </button>
      )}
    </aside>
  );
}

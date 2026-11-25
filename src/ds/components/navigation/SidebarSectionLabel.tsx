import React from 'react';

/** Uppercase group heading: OPERATIONS, FLEET, CARGO, PARTNERS, FINANCE,
 *  COMPLIANCE, INTELLIGENCE, ADMINISTRATION, SUPPORT SYSTEM. */
export function SidebarSectionLabel({ children, style }: SidebarSectionLabelProps) {
  return (
    <div style={{
      padding: '18px 12px 6px',
      font: '600 11px/14px var(--tk-font-sans)', letterSpacing: '0.6px', textTransform: 'uppercase',
      color: 'var(--tk-blue)', ...style,
    }}>{children}</div>
  );
}

export interface SidebarSectionLabelProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

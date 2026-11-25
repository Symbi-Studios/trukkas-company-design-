import React from 'react';

/** Hover explanation on a metric or an icon. Dark navy chip, 12px, one line where possible. */
export function Tooltip({ label, placement = 'top', children, style }: TooltipProps) {
  const [on, setOn] = React.useState(false);
  const pos = placement === 'bottom'
    ? { top: '100%', marginTop: 8 } : { bottom: '100%', marginBottom: 8 };
  return (
    <span style={{ position: 'relative', display: 'inline-flex', ...style }}
          onMouseEnter={() => setOn(true)} onMouseLeave={() => setOn(false)}>
      {children}
      {on && (
        <span role="tooltip" style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)', ...pos,
          background: 'var(--tk-navy)', color: '#fff', padding: '7px 10px',
          borderRadius: 'var(--tk-r-sm)', font: '400 12px/16px var(--tk-font-sans)',
          whiteSpace: 'nowrap', zIndex: 40, boxShadow: 'var(--tk-shadow-menu)',
          animation: 'tk-fade-in var(--tk-dur-fast) var(--tk-ease)',
        }}>{label}</span>
      )}
    </span>
  );
}

export interface TooltipProps {
  label: React.ReactNode;
  placement?: 'top' | 'bottom';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

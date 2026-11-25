import React from 'react';
import { Icon } from '../../assets/icons/Icon';

/** Toolbar filter dropdown: white, hairline border, caret. Reads "All Status", "All Types". */
export function FilterSelect({ label, icon, active = false, onClick, style }: FilterSelectProps) {
  const [hot, setHot] = React.useState(false);
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, height: 'var(--tk-h-filter)',
        padding: '0 12px', borderRadius: 'var(--tk-r-md)',
        border: '1px solid ' + (active ? 'var(--tk-blue)' : 'var(--tk-line-strong)'),
        background: hot ? 'var(--tk-surface-sunk)' : '#fff',
        color: active ? 'var(--tk-blue)' : 'var(--tk-ink-500)',
        font: '500 14px/1 var(--tk-font-sans)', cursor: 'pointer',
        transition: 'var(--tk-transition)', whiteSpace: 'nowrap', ...style,
      }}>
      {icon && <Icon name={icon} size={16} />}
      {label}
      <Icon name="chevron-down" size={15} color="var(--tk-ink-400)" />
    </button>
  );
}

export interface FilterSelectProps {
  label: React.ReactNode;
  /** leading Lucide glyph, e.g. "filter", "calendar", "sliders-horizontal" */
  icon?: string;
  /** blue border once a value is chosen */
  active?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

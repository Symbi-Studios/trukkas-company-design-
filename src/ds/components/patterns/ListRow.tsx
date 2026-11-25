import React from 'react';
import { Icon } from '../../assets/icons/Icon';

const TINT = { blue: ['var(--tk-blue-soft)', 'var(--tk-blue)'],
               green: ['var(--tk-success-soft)', 'var(--tk-success)'],
               amber: ['var(--tk-warning-soft)', 'var(--tk-warning)'],
               red: ['var(--tk-danger-soft)', 'var(--tk-danger)'],
               purple: ['var(--tk-purple-soft)', 'var(--tk-purple)'],
               neutral: ['var(--tk-surface-sunk)', 'var(--tk-ink-400)'] };

/** Rail list row: tinted icon tile, title + sub-line, trailing value, optional chevron. */
export function ListRow({ icon, iconTint = 'blue', avatar, title, subtitle, value, valueTone,
                          caption, trailing, chevron, onClick, style }: ListRowProps) {
  const [bg, fg] = TINT[iconTint] || TINT.blue;
  const [hot, setHot] = React.useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', margin: '0 -8px',
               borderRadius: 'var(--tk-r-sm)', cursor: onClick ? 'pointer' : 'default',
               background: hot && onClick ? 'var(--tk-surface-sunk)' : 'transparent',
               transition: 'var(--tk-transition)', ...style }}>
      {avatar || (icon && (
        <span style={{ width: 34, height: 34, borderRadius: 'var(--tk-r-sm)', background: bg, color: fg,
                       display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
          <Icon name={icon} size={17} />
        </span>
      ))}
      <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
        <span style={{ font: '600 13px/18px var(--tk-font-sans)', color: 'var(--tk-ink-900)',
                       overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        {subtitle && <span className="tk-meta">{subtitle}</span>}
      </div>
      {(value || caption) && (
        <div style={{ textAlign: 'right', display: 'grid', gap: 2 }}>
          {value && <span style={{ font: '600 13px/18px var(--tk-font-sans)',
                                   color: valueTone || 'var(--tk-ink-900)' }}>{value}</span>}
          {caption && <span className="tk-meta">{caption}</span>}
        </div>
      )}
      {trailing}
      {chevron && <Icon name="chevron-right" size={15} color="var(--tk-ink-300)" />}
    </div>
  );
}

export interface ListRowProps {
  icon?: string;
  iconTint?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'neutral';
  avatar?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  valueTone?: string;
  caption?: React.ReactNode;
  trailing?: React.ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

import React from 'react';
import { Icon } from '../../assets/icons/Icon';
import { CountBadge } from '../feedback/CountBadge';

const TINT = { red: ['var(--tk-danger-soft)', 'var(--tk-danger)'],
               amber: ['var(--tk-warning-soft)', 'var(--tk-warning)'],
               blue: ['var(--tk-blue-soft)', 'var(--tk-blue)'],
               green: ['var(--tk-success-soft)', 'var(--tk-success)'] };

/** "Alerts & Pending Actions": tinted glyph, what needs doing, the count, the permitted action. */
export function AlertRow({ icon = 'triangle-alert', tone = 'red', title, description, count, action, style }: AlertRowProps) {
  const [bg, fg] = TINT[tone] || TINT.red;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', ...style }}>
      <span style={{ width: 32, height: 32, borderRadius: 'var(--tk-r-sm)', background: bg, color: fg,
                     display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
        <Icon name={icon} size={16} />
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
        <span style={{ font: '600 13px/18px var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{title}</span>
        {description && <span className="tk-meta">{description}</span>}
      </div>
      {count != null && <CountBadge count={count} tone={tone === 'amber' ? 'warning' : 'danger'} />}
      {action}
    </div>
  );
}

export interface AlertRowProps {
  icon?: string;
  tone?: 'red' | 'amber' | 'blue' | 'green';
  title: React.ReactNode;
  description?: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

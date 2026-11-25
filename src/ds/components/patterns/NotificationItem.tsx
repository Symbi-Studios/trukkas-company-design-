import React from 'react';
import { Icon } from '../../assets/icons/Icon';

const TINT = { blue: ['var(--tk-blue-soft)', 'var(--tk-blue)'],
               orange: ['var(--tk-orange-soft)', 'var(--tk-orange)'],
               green: ['var(--tk-success-soft)', 'var(--tk-success)'],
               purple: ['var(--tk-purple-soft)', 'var(--tk-purple)'],
               red: ['var(--tk-danger-soft)', 'var(--tk-danger)'] };

/** Notification / announcement row: typed glyph, title, preview, meta, unread marker. */
export function NotificationItem({ icon = 'bell', tone = 'blue', title, preview, meta,
                                   badge, unread, onClick, style }: NotificationItemProps) {
  const [bg, fg] = TINT[tone] || TINT.blue;
  return (
    <div onClick={onClick} style={{ display: 'flex', gap: 12, padding: '14px 0',
                                    borderBottom: '1px solid var(--tk-line)',
                                    cursor: onClick ? 'pointer' : 'default', ...style }}>
      <span style={{ width: 32, height: 32, borderRadius: 'var(--tk-r-sm)', background: bg, color: fg,
                     display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
        <Icon name={icon} size={16} />
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 3 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ font: '600 13px/18px var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{title}</span>
          {unread && <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--tk-blue)' }} />}
        </span>
        {preview && (
          <span style={{ font: '400 12px/17px var(--tk-font-sans)', color: 'var(--tk-ink-400)',
                         overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</span>
        )}
        {meta && <span className="tk-meta">{meta}</span>}
      </div>
      {badge}
    </div>
  );
}

export interface NotificationItemProps {
  icon?: string;
  tone?: 'blue' | 'orange' | 'green' | 'purple' | 'red';
  title: React.ReactNode;
  preview?: React.ReactNode;
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  unread?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

import React from 'react';
import { Avatar } from '../core/Avatar';

/** Who did what, when — the Activity Log panel and the Notes list. */
export function ActivityFeed({ items = [], showDot = true, style }: ActivityFeedProps) {
  return (
    <div style={{ display: 'grid', gap: 16, ...style }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 10 }}>
          {!showDot && it.actor
            ? <Avatar name={typeof it.actor === 'string' ? it.actor : ''} size={28} />
            : <span style={{ width: 8, height: 8, borderRadius: 999, marginTop: 6, flex: '0 0 auto',
                             background: it.tone || 'var(--tk-blue)' }} />}
          <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
            <span style={{ font: '400 13px/18px var(--tk-font-sans)', color: 'var(--tk-ink-700)' }}>
              {it.text}
            </span>
            <span className="tk-meta">{it.actor}{it.actor && it.time ? ' · ' : ''}{it.time}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export interface ActivityItem {
  text: React.ReactNode;
  actor?: React.ReactNode;
  time?: React.ReactNode;
  tone?: string;
}
export interface ActivityFeedProps {
  items: ActivityItem[];
  showDot?: boolean;
  style?: React.CSSProperties;
}

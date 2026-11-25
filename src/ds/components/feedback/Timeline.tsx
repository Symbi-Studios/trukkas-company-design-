import React from 'react';
import { Icon } from '../../assets/icons/Icon';

const TONE = { done: 'var(--tk-success)', current: 'var(--tk-blue)', pending: 'var(--tk-ink-300)',
               danger: 'var(--tk-danger-solid)', warning: 'var(--tk-warning)' };

/** Vertical record of what happened: status timelines, activity logs, notification history. */
export function Timeline({ items = [], style }: TimelineProps) {
  return (
    <div style={{ display: 'grid', ...style }}>
      {items.map((it, i) => {
        const color = TONE[it.state || 'done'] || TONE.done;
        const last = i === items.length - 1;
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: 12 }}>
            <div style={{ display: 'grid', justifyItems: 'center' }}>
              <span style={{ width: 18, height: 18, borderRadius: 999, display: 'grid', placeItems: 'center',
                             background: it.state === 'pending' ? 'transparent' : color,
                             border: it.state === 'pending' ? '2px solid var(--tk-line-strong)' : 'none' }}>
                {it.icon && it.state !== 'pending' && <Icon name={it.icon} size={10} color="#fff" />}
              </span>
              {!last && <span style={{ width: 2, flex: 1, minHeight: 22, background: 'var(--tk-line)' }} />}
            </div>
            <div style={{ paddingBottom: last ? 0 : 18, display: 'grid', gap: 2 }}>
              <span style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ font: '600 13px/18px var(--tk-font-sans)',
                               color: it.state === 'pending' ? 'var(--tk-ink-400)' : 'var(--tk-ink-900)' }}>
                  {it.title}
                </span>
                {it.time && <span className="tk-mono">{it.time}</span>}
              </span>
              {it.description && (
                <span style={{ font: '400 12px/17px var(--tk-font-sans)', color: 'var(--tk-ink-400)' }}>
                  {it.description}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface TimelineItem {
  title: React.ReactNode;
  /** timestamp, rendered in mono */
  time?: React.ReactNode;
  description?: React.ReactNode;
  state?: 'done' | 'current' | 'pending' | 'danger' | 'warning';
  /** small glyph inside the node */
  icon?: string;
}
export interface TimelineProps { items: TimelineItem[]; style?: React.CSSProperties; }

import React from 'react';
import { SectionCard } from '../core/SectionCard';
import { Icon } from '../../assets/icons/Icon';

/** Rail panel of shortcuts. layout="list" is a stack of rows with a chevron;
 *  layout="grid" is the 3-across tile form used on the dashboard. */
export function QuickActionsCard({ title = 'Quick Actions', items = [], layout = 'list', style }: QuickActionsCardProps) {
  return (
    <SectionCard title={title} style={style}>
      {layout === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          {items.map(it => (
            <button key={it.label as React.Key} type="button" onClick={it.onClick}
              style={{ display: 'grid', justifyItems: 'center', gap: 8, padding: '14px 8px',
                       borderRadius: 'var(--tk-r-lg)', border: '1px solid var(--tk-line)',
                       background: '#fff', cursor: 'pointer' }}>
              <Icon name={it.icon} size={20} color="var(--tk-blue)" />
              <span style={{ font: '500 12px/16px var(--tk-font-sans)', color: 'var(--tk-ink-700)',
                             textAlign: 'center' }}>{it.label}</span>
              {it.hint && <span className="tk-meta">{it.hint}</span>}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid' }}>
          {items.map((it, i) => {
            const danger = it.tone === 'danger';
            const fg = danger ? 'var(--tk-danger)' : 'var(--tk-blue)';
            return (
              <button key={it.label as React.Key} type="button" onClick={it.onClick}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px',
                         border: 0, borderTop: i ? '1px solid var(--tk-line)' : 'none',
                         background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                <Icon name={it.icon} size={18} color={fg} />
                <span style={{ flex: 1, display: 'grid', gap: 2 }}>
                  <span style={{ font: '500 13px/18px var(--tk-font-sans)', color: danger ? 'var(--tk-danger)' : 'var(--tk-ink-700)' }}>{it.label}</span>
                  {it.hint && <span className="tk-meta">{it.hint}</span>}
                </span>
                <Icon name="chevron-right" size={15} color="var(--tk-ink-300)" />
              </button>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

export interface QuickAction { tone?: string; icon: string; label: React.ReactNode; hint?: React.ReactNode; onClick?: () => void; }
export interface QuickActionsCardProps {
  title?: React.ReactNode;
  items: QuickAction[];
  layout?: 'list' | 'grid';
  style?: React.CSSProperties;
}

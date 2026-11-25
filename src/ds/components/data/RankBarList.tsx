import React from 'react';

/** Ranked horizontal bars — "Top Routes by Volume". */
export function RankBarList({ items = [], numbered = true, color = 'var(--tk-blue)', style }: RankBarListProps) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div style={{ display: 'grid', gap: 12, ...style }}>
      {items.map((it, i) => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {numbered && <span className="tk-meta" style={{ width: 14 }}>{i + 1}.</span>}
          <span style={{ flex: '0 0 34%', font: '400 13px/18px var(--tk-font-sans)',
                         color: 'var(--tk-ink-700)', overflow: 'hidden', textOverflow: 'ellipsis',
                         whiteSpace: 'nowrap' }}>{it.label}</span>
          <span style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--tk-viz-track)' }}>
            <span style={{ display: 'block', width: (it.value / max) * 100 + '%', height: '100%',
                           borderRadius: 999, background: it.color || color }} />
          </span>
          <span style={{ width: 44, textAlign: 'right', font: '600 13px/18px var(--tk-font-sans)',
                         color: 'var(--tk-ink-900)' }}>{it.display ?? it.value}</span>
        </div>
      ))}
    </div>
  );
}

export interface RankBarItem { label: string; value: number; display?: React.ReactNode; color?: string; }
export interface RankBarListProps {
  items: RankBarItem[];
  numbered?: boolean;
  color?: string;
  style?: React.CSSProperties;
}

import React from 'react';

/** Underlined tab strip. The active tab is blue with a 2px blue rule. */
export function Tabs({ items = [], value, onChange, style }: TabsProps) {
  const accent = 'var(--tk-blue)';
  return (
    <div style={{ display: 'flex', gap: 26, borderBottom: '1px solid var(--tk-line)',
                  overflowX: 'auto', ...style }} className="tk-scroll tk-tabs" role="tablist">
      {items.map(it => {
        const key = typeof it === 'string' ? it : it.value;
        const label = typeof it === 'string' ? it : it.label;
        const on = key === value;
        return (
          <button key={key} type="button" role="tab" aria-selected={on} onClick={() => onChange?.(key)}
            style={{ border: 0, background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap',
                     height: 'var(--tk-h-tab)', padding: 0,
                     borderBottom: '2px solid ' + (on ? accent : 'transparent'),
                     color: on ? accent : 'var(--tk-ink-400)',
                     font: (on ? 600 : 500) + ' 14px/1 var(--tk-font-sans)',
                     transition: 'var(--tk-transition)' }}>
            {label}{typeof it === 'object' && it.count != null ? ' (' + it.count + ')' : ''}
          </button>
        );
      })}
    </div>
  );
}

export interface TabItem { value: string; label: React.ReactNode; count?: number; }
export interface TabsProps {
  items: Array<string | TabItem>;
  value?: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}

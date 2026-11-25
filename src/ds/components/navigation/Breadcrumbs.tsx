import React from 'react';
import { Icon } from '../../assets/icons/Icon';

export function Breadcrumbs({ items = [], style }: BreadcrumbsProps) {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', ...style }}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        const label = typeof it === 'string' ? it : it.label;
        return (
          <React.Fragment key={(label as string) + i}>
            {i > 0 && <Icon name="chevron-right" size={14} color="var(--tk-ink-300)" />}
            <span style={{ font: (last ? 600 : 400) + ' 13px/18px var(--tk-font-sans)',
                           color: last ? 'var(--tk-ink-900)' : 'var(--tk-ink-400)',
                           cursor: last ? 'default' : 'pointer' }}
                  onClick={() => !last && typeof it === 'object' && it.onClick?.()}>
              {label}
            </span>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export interface Crumb { label: React.ReactNode; onClick?: () => void; }
export interface BreadcrumbsProps { items: Array<string | Crumb>; style?: React.CSSProperties; }

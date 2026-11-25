import React from 'react';
import { Icon } from '../../assets/icons/Icon';

export interface CopyableIdProps {
  id: string;
  size?: 'sm' | 'md' | 'lg';
  onCopy?: (id: string) => void;
  style?: React.CSSProperties;
}

/** Canonical record ID with a copy affordance: TK-2026-000013, DEM-2026-000058, TKTS-2024-0248. */
export function CopyableId({ id, size = 'md', onCopy, style }: CopyableIdProps) {
  const [done, setDone] = React.useState(false);
  const fs = size === 'lg' ? 20 : size === 'sm' ? 12 : 14;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...style }}>
      <span style={{ font: `600 ${fs}px/1.3 var(--tk-font-mono)`, color: 'var(--tk-ink-900)',
                     letterSpacing: '-0.2px' }}>{id}</span>
      <button type="button" aria-label={'Copy ' + id}
        onClick={() => { onCopy?.(id); setDone(true); setTimeout(() => setDone(false), 1200); }}
        style={{ border: 0, background: 'transparent', padding: 2, cursor: 'pointer',
                 color: done ? 'var(--tk-success)' : 'var(--tk-ink-300)', lineHeight: 0 }}>
        <Icon name={done ? 'check' : 'copy'} size={14} />
      </button>
    </span>
  );
}

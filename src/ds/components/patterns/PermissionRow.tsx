import React from 'react';
import { Icon } from '../../assets/icons/Icon';
import { Radio } from '../forms/Radio';
import { Tag } from '../core/Tag';

/** One module row in the Roles & Permissions matrix: Full / Custom / No access. */
export function PermissionRow({ icon, module, actions, value = 'none', levels = ['full', 'custom', 'none'],
                                expandable = true, onChange, style }: PermissionRowProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, 130px)', alignItems: 'center',
                  padding: '12px 16px', borderBottom: '1px solid var(--tk-line)', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {expandable && <Icon name="chevron-right" size={15} color="var(--tk-ink-300)" />}
        <span style={{ width: 28, height: 28, borderRadius: 'var(--tk-r-sm)', display: 'grid',
                       placeItems: 'center', background: 'var(--tk-blue-soft)', color: 'var(--tk-blue)' }}>
          <Icon name={icon} size={15} />
        </span>
        <span style={{ font: '600 13px/18px var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{module}</span>
        {actions && <Tag tone="blue">{actions} actions</Tag>}
      </div>
      {levels.map(l => (
        <div key={l} style={{ display: 'grid', placeItems: 'center' }}>
          <Radio checked={value === l} onChange={() => onChange?.(l)} />
        </div>
      ))}
    </div>
  );
}

export interface PermissionRowProps {
  icon: string;
  module: React.ReactNode;
  actions?: number;
  value?: 'full' | 'custom' | 'none';
  levels?: string[];
  expandable?: boolean;
  onChange?: (level: string) => void;
  style?: React.CSSProperties;
}

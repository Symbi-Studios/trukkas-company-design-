import React from 'react';
import { Icon } from '../../assets/icons/Icon';

/** Describes the record that would be here, then offers the permitted action. */
export function EmptyState({ icon = 'inbox', title, description, action, style }: EmptyStateProps) {
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 10, padding: '48px 24px',
                  textAlign: 'center', ...style }}>
      <span style={{ width: 52, height: 52, borderRadius: 'var(--tk-r-lg)', display: 'grid',
                     placeItems: 'center', background: 'var(--tk-surface-sunk)', color: 'var(--tk-ink-300)' }}>
        <Icon name={icon} size={24} />
      </span>
      <span style={{ font: '600 16px/22px var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{title}</span>
      {description && (
        <span style={{ maxWidth: 380, font: '400 13px/19px var(--tk-font-sans)',
                       color: 'var(--tk-ink-400)' }}>{description}</span>
      )}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}

export interface EmptyStateProps {
  icon?: string;
  title: React.ReactNode;
  /** describe the record that would appear here, not the emptiness */
  description?: React.ReactNode;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

import React from 'react';
import { Icon } from '../../assets/icons/Icon';

/** Primary action with an attached caret, divided by a translucent white rule. */
export function SplitButton({ variant = 'primary', icon, children, onAction, onToggle, style }: SplitButtonProps) {
  const bg = variant === 'accent' ? 'var(--tk-orange)' : 'var(--tk-blue)';
  const btn = { background: 'transparent', border: 0, color: '#fff', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8, height: '100%', padding: '0 14px',
                font: '600 14px/1 var(--tk-font-sans)' };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'stretch', height: 'var(--tk-h-btn)',
                  background: bg, borderRadius: 'var(--tk-r-md)', overflow: 'hidden', ...style }}>
      <button type="button" onClick={onAction} style={btn}>
        {icon && <Icon name={icon} size={16} />}{children}
      </button>
      <div style={{ width: 1, background: 'rgba(255,255,255,.28)' }} />
      <button type="button" onClick={onToggle} aria-label="More options" style={{ ...btn, padding: '0 9px' }}>
        <Icon name="chevron-down" size={16} />
      </button>
    </div>
  );
}

export interface SplitButtonProps {
  variant?: 'primary' | 'accent';
  icon?: string;
  children?: React.ReactNode;
  onAction?: () => void;
  onToggle?: () => void;
  style?: React.CSSProperties;
}

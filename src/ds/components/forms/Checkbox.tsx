import React from 'react';
import { Icon } from '../../assets/icons/Icon';

export function Checkbox({ checked, indeterminate, label, hint, disabled, onChange, style }: CheckboxProps) {
  const on = checked || indeterminate;
  return (
    <label role="checkbox" aria-checked={indeterminate ? 'mixed' : !!checked} aria-disabled={!!disabled}
      tabIndex={disabled ? -1 : 0} onClick={() => !disabled && onChange?.(!checked)}
      onKeyDown={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          if (!disabled) onChange?.(!checked);
        }
      }}
      style={{ display: 'inline-flex', alignItems: hint ? 'flex-start' : 'center', gap: 10,
                    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }}>
      <span
        style={{ width: 18, height: 18, borderRadius: 5, flex: '0 0 auto', marginTop: hint ? 1 : 0,
                 background: on ? 'var(--tk-blue)' : '#fff',
                 border: '1px solid ' + (on ? 'var(--tk-blue)' : 'var(--tk-line-strong)'),
                 display: 'grid', placeItems: 'center', transition: 'var(--tk-transition)' }}>
        {on && <Icon name={indeterminate ? 'minus' : 'check'} size={12} color="#fff" />}
      </span>
      {label && (
        <span style={{ display: 'grid', gap: 2 }}>
          <span style={{ font: '400 14px/20px var(--tk-font-sans)', color: 'var(--tk-ink-700)' }}>{label}</span>
          {hint && <span className="tk-meta">{hint}</span>}
        </span>
      )}
    </label>
  );
}

export interface CheckboxProps {
  checked?: boolean;
  /** header checkbox state when only some rows are selected */
  indeterminate?: boolean;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
  style?: React.CSSProperties;
}

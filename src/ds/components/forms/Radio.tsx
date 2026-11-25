import React from 'react';
export function Radio({ checked, label, hint, disabled, onChange, style }: RadioProps) {
  return (
    <label style={{ display: 'inline-flex', alignItems: hint ? 'flex-start' : 'center', gap: 10,
                    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }}>
      <span onClick={() => !disabled && onChange?.(true)}
        style={{ width: 18, height: 18, borderRadius: 999, flex: '0 0 auto', marginTop: hint ? 1 : 0,
                 border: '1.5px solid ' + (checked ? 'var(--tk-blue)' : 'var(--tk-line-strong)'),
                 display: 'grid', placeItems: 'center', transition: 'var(--tk-transition)' }}>
        {checked && <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--tk-blue)' }} />}
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

export interface RadioProps {
  checked?: boolean;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
  style?: React.CSSProperties;
}

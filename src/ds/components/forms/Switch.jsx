import React from 'react';
export function Switch({ checked, label, hint, disabled, onChange, style }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: hint ? 'flex-start' : 'center', gap: 12,
                    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }}>
      <span onClick={() => !disabled && onChange?.(!checked)}
        style={{ width: 38, height: 22, borderRadius: 999, flex: '0 0 auto', padding: 2,
                 background: checked ? 'var(--tk-blue)' : '#D7DBE5',
                 transition: 'var(--tk-transition)', display: 'flex',
                 justifyContent: checked ? 'flex-end' : 'flex-start' }}>
        {checked === null ? <span className="tk-meta" aria-label="Unavailable">—</span> : <span style={{ width: 18, height: 18, borderRadius: 999, background: '#fff',
                       boxShadow: '0 1px 2px rgba(0,8,36,.2)', transition: 'var(--tk-transition)' }} />}
      </span>
      {label && (
        <span style={{ display: 'grid', gap: 2 }}>
          <span style={{ font: '500 14px/20px var(--tk-font-sans)', color: 'var(--tk-ink-700)' }}>{label}</span>
          {hint && <span className="tk-meta">{hint}</span>}
        </span>
      )}
    </label>
  );
}

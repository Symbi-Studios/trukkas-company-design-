import React from 'react';

const shell = (invalid: boolean, focused: boolean, disabled?: boolean) => ({
  display: 'flex', alignItems: 'center', gap: 8,
  height: 'var(--tk-h-input)', padding: '0 12px',
  background: disabled ? 'var(--tk-surface-sunk)' : '#fff',
  border: '1px solid ' + (invalid ? 'var(--tk-danger)' : focused ? 'var(--tk-blue)' : 'var(--tk-line-strong)'),
  borderRadius: 'var(--tk-r-md)',
  boxShadow: focused ? (invalid ? 'var(--tk-focus-ring-danger)' : 'var(--tk-focus-ring)') : 'none',
  transition: 'var(--tk-transition)',
});
const input = { flex: 1, border: 0, outline: 'none', background: 'transparent',
  font: '400 14px/20px var(--tk-font-sans)', color: 'var(--tk-ink-900)', minWidth: 0 };

export function Textarea({ label, hint, maxLength, value, rows = 4, style, ...rest }: TextareaProps) {
  const [f, setF] = React.useState(false);
  return (
    <label className="tk-field tk-textarea-field" style={{ display: 'grid', gap: 6, ...style }}>
      {label && <span style={{ font: '500 13px/18px var(--tk-font-sans)', color: 'var(--tk-ink-500)' }}>{label}</span>}
      <div style={{ ...shell(false, f, false), height: 'auto', padding: '10px 12px', alignItems: 'stretch',
                    flexDirection: 'column', gap: 4 }}>
        <textarea rows={rows} maxLength={maxLength} value={value} onFocus={() => setF(true)} onBlur={() => setF(false)}
                  {...rest} style={{ ...input, resize: 'vertical', width: '100%' }} />
        {maxLength != null && (
          <span className="tk-meta" style={{ alignSelf: 'flex-end' }}>
            {((value || '') as string | readonly string[]).length}/{maxLength}
          </span>
        )}
      </div>
      {hint && <span className="tk-meta">{hint}</span>}
    </label>
  );
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  /** renders the 0/500 counter inside the field */
  maxLength?: number;
}

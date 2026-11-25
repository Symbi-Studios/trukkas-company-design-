import React from 'react';
import { Icon } from '../../assets/icons/Icon';
import { DatePicker } from './DatePicker';

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

export function TextField({ label, required, hint, error, icon, suffix, disabled, style, ...rest }: TextFieldProps) {
  const [f, setF] = React.useState(false);
  if (rest.type === 'date' || rest.type === 'month') {
    const { type, ...dateProps } = rest;
    return <DatePicker {...dateProps} mode={type === 'month' ? 'month' : 'date'} label={label} required={required} hint={hint} error={error} icon={icon} suffix={suffix} disabled={disabled} style={style} />;
  }
  return (
    <label className="tk-field" style={{ display: 'grid', gap: 6, ...style }}>
      {label && (
        <span style={{ font: '500 13px/18px var(--tk-font-sans)', color: 'var(--tk-ink-500)' }}>
          {label}{required && <span style={{ color: 'var(--tk-danger)' }}> *</span>}
        </span>
      )}
      <div style={shell(!!error, f, disabled)}>
        {icon && <Icon name={icon} size={16} color="var(--tk-ink-300)" />}
        <input disabled={disabled} onFocus={() => setF(true)} onBlur={() => setF(false)}
               {...rest} style={input} />
        {suffix}
      </div>
      {(error || hint) && (
        <span className="tk-meta" style={{ color: error ? 'var(--tk-danger)' : 'var(--tk-ink-400)' }}>
          {error || hint}
        </span>
      )}
    </label>
  );
}

/**
 * @startingPoint section="Forms" subtitle="Labelled text input with hint and error" viewport="700x150"
 */
export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  required?: boolean;
  /** helper under the field */
  hint?: React.ReactNode;
  /** replaces hint and turns the border red */
  error?: React.ReactNode;
  /** leading Lucide glyph */
  icon?: string;
  /** trailing node — a unit, a counter, a small button */
  suffix?: React.ReactNode;
}

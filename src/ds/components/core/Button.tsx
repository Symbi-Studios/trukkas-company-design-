import React from 'react';
import { Icon } from '../../assets/icons/Icon';

/**
 * @startingPoint section="Core" subtitle="Action button, six fills" viewport="700x160"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = the one blue action per view; accent = the orange CTA on the navy shell */
  variant?: 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Lucide glyph id rendered before the label */
  icon?: string;
  /** Lucide glyph id rendered after the label — usually "chevron-down" */
  iconRight?: string;
  fullWidth?: boolean;
}

const FILL = {
  primary:   { bg: 'var(--tk-blue)',   fg: '#fff', bd: 'transparent', hover: 'var(--tk-blue-hover)' },
  accent:    { bg: 'var(--tk-orange)', fg: '#fff', bd: 'transparent', hover: 'var(--tk-orange-hover)' },
  secondary: { bg: '#fff', fg: 'var(--tk-blue)', bd: 'var(--tk-blue)', hover: 'var(--tk-blue-soft)' },
  outline:   { bg: '#fff', fg: 'var(--tk-ink-700)', bd: 'var(--tk-line-strong)', hover: 'var(--tk-surface-sunk)' },
  ghost:     { bg: 'transparent', fg: 'var(--tk-ink-500)', bd: 'transparent', hover: 'var(--tk-surface-sunk)' },
  danger:    { bg: '#fff', fg: 'var(--tk-danger)', bd: 'var(--tk-danger-soft)', hover: 'var(--tk-danger-soft)' },
};
const SIZE = { sm: { h: 'var(--tk-h-btn-sm)', px: 10, fs: 13, ic: 14 },
               md: { h: 'var(--tk-h-btn)',    px: 14, fs: 14, ic: 16 },
               lg: { h: 'var(--tk-h-btn-lg)', px: 18, fs: 15, ic: 18 } };

export function Button({
  variant = 'primary', size = 'md', icon, iconRight, disabled, fullWidth,
  children, style, ...rest
}: ButtonProps) {
  const f = FILL[variant] || FILL.primary;
  const s = SIZE[size] || SIZE.md;
  const [hot, setHot] = React.useState(false);
  return (
    <button
      type="button" disabled={disabled}
      onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      {...rest}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: s.h, padding: `0 ${s.px}px`, width: fullWidth ? '100%' : undefined,
        borderRadius: 'var(--tk-r-md)',
        border: '1px solid ' + (disabled ? 'transparent' : f.bd),
        background: disabled ? 'var(--tk-neutral-soft)' : (hot ? f.hover : f.bg),
        color: disabled ? 'var(--tk-ink-300)' : f.fg,
        font: `600 ${s.fs}px/1 var(--tk-font-sans)`,
        cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
        transition: 'var(--tk-transition)', ...style,
      }}>
      {icon && <Icon name={icon} size={s.ic} />}
      {children}
      {iconRight && <Icon name={iconRight} size={s.ic} />}
    </button>
  );
}

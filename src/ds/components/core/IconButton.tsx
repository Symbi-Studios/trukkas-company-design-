import React from 'react';
import { Icon } from '../../assets/icons/Icon';

export function IconButton({ icon, size = 32, tone = 'ghost', label, style, ...rest }: IconButtonProps) {
  const tones = {
    ghost: { bg: 'transparent', fg: 'var(--tk-ink-400)', bd: 'transparent' },
    sunk:  { bg: 'var(--tk-surface-sunk)', fg: 'var(--tk-ink-500)', bd: 'transparent' },
    outline: { bg: '#fff', fg: 'var(--tk-ink-500)', bd: 'var(--tk-line-strong)' },
    blue:  { bg: 'var(--tk-blue-soft)', fg: 'var(--tk-blue)', bd: 'transparent' },
  };
  const t = tones[tone] || tones.ghost;
  const [hot, setHot] = React.useState(false);
  return (
    <button type="button" aria-label={label || icon}
      onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)} {...rest}
      style={{
        width: size, height: size, display: 'grid', placeItems: 'center',
        borderRadius: 'var(--tk-r-sm)', border: '1px solid ' + t.bd,
        background: hot && tone === 'ghost' ? 'var(--tk-surface-sunk)' : t.bg,
        color: t.fg, cursor: 'pointer', transition: 'var(--tk-transition)', ...style,
      }}>
      <Icon name={icon} size={Math.round(size * 0.5)} />
    </button>
  );
}

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  /** square edge in px, default 32 */
  size?: number;
  tone?: 'ghost' | 'sunk' | 'outline' | 'blue';
  label?: string;
}

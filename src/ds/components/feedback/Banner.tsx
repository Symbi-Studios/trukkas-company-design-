import React from 'react';
import { Icon } from '../../assets/icons/Icon';

const TONES = {
  info:    ['var(--tk-info-soft)', 'var(--tk-blue)', 'info'],
  success: ['var(--tk-success-soft)', 'var(--tk-success)', 'circle-check'],
  warning: ['var(--tk-warning-soft)', 'var(--tk-warning)', 'triangle-alert'],
  danger:  ['var(--tk-danger-soft)', 'var(--tk-danger)', 'circle-alert'],
};

/** Inline explanatory strip. Says what happened, why, and what may be done next. */
export function Banner({ tone = 'info', icon, title, children, action, style }: BannerProps) {
  const [bg, fg, def] = TONES[tone] || TONES.info;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
                  borderRadius: 'var(--tk-r-lg)', background: bg, ...style }}>
      <Icon name={icon || def} size={18} color={fg} style={{ marginTop: 1 }} />
      <div style={{ flex: 1, display: 'grid', gap: 3 }}>
        {title && <span style={{ font: '600 14px/20px var(--tk-font-sans)', color: fg }}>{title}</span>}
        {children && (
          <span style={{ font: '400 13px/19px var(--tk-font-sans)', color: 'var(--tk-ink-500)' }}>{children}</span>
        )}
      </div>
      {action}
    </div>
  );
}

export interface BannerProps {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  /** override the default glyph for the tone */
  icon?: string;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** trailing control, usually a small Button */
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

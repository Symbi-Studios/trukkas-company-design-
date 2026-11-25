import React from 'react';
const MAP = { success: 'var(--tk-success)', info: 'var(--tk-blue)', warning: 'var(--tk-warning)',
              danger: 'var(--tk-danger-solid)', neutral: 'var(--tk-ink-300)', purple: 'var(--tk-purple)' };
export function StatusDot({ tone = 'neutral', size = 8, pulse = false, label, style }: StatusDotProps) {
  const dot = (
    <span style={{ width: size, height: size, borderRadius: 999, background: MAP[tone] || MAP.neutral,
                   flex: '0 0 auto', animation: pulse ? 'tk-fade-in 1.2s var(--tk-ease) infinite alternate' : undefined }} />
  );
  if (!label) return dot;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
                   font: '500 13px/18px var(--tk-font-sans)', color: 'var(--tk-ink-500)', ...style }}>
      {dot}{label}
    </span>
  );
}

export interface StatusDotProps {
  tone?: 'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'purple';
  size?: number;
  /** slow fade — used on "Live" map headers */
  pulse?: boolean;
  label?: React.ReactNode;
  style?: React.CSSProperties;
}

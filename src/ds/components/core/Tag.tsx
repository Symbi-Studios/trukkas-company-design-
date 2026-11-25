import React from 'react';

/** Softer, smaller sibling of Badge: taxonomy rather than status —
 *  cargo category, document type, role, service offered. */
export function Tag({ children, tone = 'neutral', icon, style }: TagProps) {
  const map = {
    neutral: ['var(--tk-neutral-soft)', 'var(--tk-ink-500)'],
    blue:    ['var(--tk-blue-soft)', 'var(--tk-blue-ink)'],
    orange:  ['var(--tk-orange-soft)', 'var(--tk-orange-ink)'],
    purple:  ['var(--tk-purple-soft)', 'var(--tk-purple)'],
    teal:    ['var(--tk-teal-soft)', 'var(--tk-teal)'],
    danger:  ['var(--tk-danger-soft)', 'var(--tk-danger)'],
    success: ['var(--tk-success-soft)', 'var(--tk-success)'],
  };
  const [bg, fg] = map[tone] || map.neutral;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 'var(--tk-h-tag)',
                   padding: '0 7px', borderRadius: 'var(--tk-r-xs)', background: bg, color: fg,
                   font: '500 11px/1 var(--tk-font-sans)', whiteSpace: 'nowrap', ...style }}>
      {icon}{children}
    </span>
  );
}

export interface TagProps {
  children?: React.ReactNode;
  tone?: 'neutral' | 'blue' | 'orange' | 'purple' | 'teal' | 'danger' | 'success';
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

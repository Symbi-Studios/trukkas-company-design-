import React from 'react';

/** The console's definition row: 13px muted label, 14px ink value.
 *  layout="row" for detail panels (label left, value right),
 *  layout="stack" for header fact columns. */
export function LabelValue({ label, value, hint, layout = 'row', valueTone, style }: LabelValueProps) {
  const val = (
    <span style={{ font: '600 14px/20px var(--tk-font-sans)',
                   color: valueTone || 'var(--tk-ink-900)', textAlign: layout === 'row' ? 'right' : 'left' }}>
      {value}
    </span>
  );
  if (layout === 'stack') {
    return (
      <div style={{ display: 'grid', gap: 4, ...style }}>
        <span className="tk-meta">{label}</span>{val}
        {hint && <span className="tk-meta">{hint}</span>}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '9px 0', ...style }}>
      <span style={{ font: '400 13px/20px var(--tk-font-sans)', color: 'var(--tk-ink-400)', flex: 1 }}>{label}</span>
      {val}
    </div>
  );
}

export interface LabelValueProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** small caption under the value in stack layout, e.g. "7 days overdue" */
  hint?: React.ReactNode;
  layout?: 'row' | 'stack';
  /** override the value colour, e.g. var(--tk-danger) for an overdue figure */
  valueTone?: string;
  style?: React.CSSProperties;
}

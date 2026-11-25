import React from 'react';

/** Donut with a centred total. Segments are { label, value, color }. */
export function DonutChart({ data = [], size = 168, thickness = 22, centerValue, centerLabel, style }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size} style={style}>
      <g transform={'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')'}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="var(--tk-viz-track)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={d.color || 'var(--tk-viz-' + ((i % 6) + 1) + ')'}
                    strokeWidth={thickness}
                    strokeDasharray={len + ' ' + (c - len)}
                    strokeDashoffset={-offset} />
          );
          offset += len;
          return el;
        })}
      </g>
      {(centerValue != null) && (
        <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle"
              style={{ font: '700 26px var(--tk-font-sans)', fill: 'var(--tk-ink-900)' }}>{centerValue}</text>
      )}
      {centerLabel && (
        <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle"
              style={{ font: '400 11px var(--tk-font-sans)', fill: 'var(--tk-ink-400)' }}>{centerLabel}</text>
      )}
    </svg>
  );
}

export interface DonutSegment { label: string; value: number; color?: string; }
export interface DonutChartProps {
  data: DonutSegment[];
  size?: number;
  thickness?: number;
  /** big number in the hole, e.g. 24 or "72%" */
  centerValue?: React.ReactNode;
  /** small caption under it, e.g. "Total Trucks" */
  centerLabel?: React.ReactNode;
  style?: React.CSSProperties;
}

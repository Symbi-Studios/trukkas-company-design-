import React from 'react';

/** Tiny trend line under a KPI figure on Reports & Analytics. */
export function Sparkline({ points = [], color = 'var(--tk-viz-1)', width = 200, height = 34, style }: SparklineProps) {
  const max = Math.max(...points, 1), min = Math.min(...points, 0);
  const step = width / Math.max(1, points.length - 1);
  const y = (v: number) => height - ((v - min) / (max - min || 1)) * (height - 4) - 2;
  const d = points.map((p, i) => (i ? 'L' : 'M') + i * step + ' ' + y(p)).join(' ');
  return (
    <svg viewBox={'0 0 ' + width + ' ' + height} width="100%" height={height} preserveAspectRatio="none" style={style}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export interface SparklineProps {
  points: number[];
  color?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

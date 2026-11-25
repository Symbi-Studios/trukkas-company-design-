import React from 'react';
export function Divider({ vertical = false, inset = 0, style }: DividerProps) {
  return vertical
    ? <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--tk-line)', margin: `${inset}px 0`, ...style }} />
    : <div style={{ height: 1, background: 'var(--tk-line)', margin: `0 ${inset}px`, ...style }} />;
}

export interface DividerProps { vertical?: boolean; inset?: number; style?: React.CSSProperties; }

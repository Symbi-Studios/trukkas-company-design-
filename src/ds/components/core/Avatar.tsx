import React from 'react';

export interface AvatarProps {
  /** used for the initials and for the deterministic fill colour */
  name?: string;
  src?: string;
  /** 28 in a table row, 36 default, 44 in a detail header */
  size?: number;
  /** rounded square — used for the account chip in the top bar */
  square?: boolean;
  tone?: string;
  style?: React.CSSProperties;
}

const PALETTE = ['var(--tk-blue)', 'var(--tk-purple)', 'var(--tk-success)', 'var(--tk-orange)', 'var(--tk-teal)', 'var(--tk-navy)'];

export function Avatar({ name = '', src, size = 36, square = false, tone, style }: AvatarProps) {
  const words = name.split(/\s+/).filter(Boolean);
  const initials = (words.length > 1
    ? words.slice(0, 2).map(w => w[0]).join('')
    : (words[0] || '').slice(0, 2)).toUpperCase();
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = tone || PALETTE[hash % PALETTE.length];
  return (
    <div title={name} style={{
      width: size, height: size, flex: '0 0 auto',
      borderRadius: square ? 'var(--tk-r-sm)' : 'var(--tk-r-pill)',
      background: src ? `center/cover no-repeat url(${src})` : bg,
      color: '#fff', display: 'grid', placeItems: 'center',
      font: `600 ${Math.round(size * 0.36)}px/1 var(--tk-font-sans)`, ...style,
    }}>{!src && initials}</div>
  );
}

import React from 'react';
import { Icon } from '../../assets/icons/Icon';

const ROLE_COLORS = ['#0241E8', '#7C3AED', '#0E9AA7', '#12A150', '#F5A524', '#FD5301', '#E02B22', '#EC4899', '#8A90A8'];

/** Fixed palette used to colour-code roles. Never a free colour picker. */
export function ColorSwatchPicker({ value, onChange, colors = ROLE_COLORS, style }: ColorSwatchPickerProps) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', ...style }}>
      {colors.map(c => (
        <button key={c} type="button" onClick={() => onChange?.(c)} aria-label={c}
          style={{ width: 26, height: 26, borderRadius: 'var(--tk-r-sm)', background: c, border: 0,
                   cursor: 'pointer', display: 'grid', placeItems: 'center',
                   outline: value === c ? '2px solid var(--tk-blue)' : 'none', outlineOffset: 2 }}>
          {value === c && <Icon name="check" size={14} color="#fff" />}
        </button>
      ))}
    </div>
  );
}
export { ROLE_COLORS };

export interface ColorSwatchPickerProps {
  value?: string;
  onChange?: (color: string) => void;
  /** defaults to ROLE_COLORS, the nine role colours used in Administration */
  colors?: string[];
  style?: React.CSSProperties;
}

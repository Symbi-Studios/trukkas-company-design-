import React from 'react';
import { Icon } from '../../assets/icons/Icon.jsx';

/** Selectable tile: a radio in the corner, an icon tile, a title and a description.
 *  Selection is a blue border and a cool-blue fill — never a solid colour. */
export function ChoiceCard({ selected, icon, title, description, onSelect, style, disabled = false }) {
  return (
    <button type="button" onClick={onSelect} disabled={disabled} aria-disabled={disabled || undefined}
      style={{ textAlign: 'left', display: 'grid', gap: 8, padding: 14, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
               borderRadius: 'var(--tk-r-lg)',
               border: '1px solid ' + (selected ? 'var(--tk-blue)' : 'var(--tk-line-strong)'),
               background: selected ? 'var(--tk-surface-cool)' : '#fff',
               transition: 'var(--tk-transition)', ...style }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 16, height: 16, borderRadius: 999, display: 'grid', placeItems: 'center',
                       border: '1.5px solid ' + (selected ? 'var(--tk-blue)' : 'var(--tk-line-strong)') }}>
          {selected && <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--tk-blue)' }} />}
        </span>
        {icon && (
          <span style={{ width: 26, height: 26, borderRadius: 'var(--tk-r-sm)', display: 'grid',
                         placeItems: 'center', background: 'var(--tk-blue-soft)', color: 'var(--tk-blue)' }}>
            <Icon name={icon} size={14} />
          </span>
        )}
        <span style={{ font: '600 14px/18px var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{title}</span>
      </span>
      {description && <span className="tk-meta" style={{ lineHeight: '16px' }}>{description}</span>}
    </button>
  );
}

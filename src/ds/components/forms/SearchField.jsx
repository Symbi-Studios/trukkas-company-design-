import React from 'react';
import { Icon } from '../../assets/icons/Icon.jsx';

/** Wide search input. variant="global" is the top-bar field with the ⌘K hint. */
export function SearchField({ placeholder = 'Search…', variant = 'panel', shortcut = '⌘ K', style, className, onFocus, onBlur, ...rest }) {
  const [f, setF] = React.useState(false);
  const global = variant === 'global';
  return (
    <div className={["tk-search-field", className].filter(Boolean).join(" ")} style={{
      display: 'flex', alignItems: 'center', gap: 10, height: 'var(--tk-h-search)',
      padding: '0 12px', background: global ? 'var(--tk-surface-sunk)' : '#fff',
      border: '1px solid ' + (f ? 'var(--tk-blue)' : global ? 'transparent' : 'var(--tk-line-strong)'),
      borderRadius: 'var(--tk-r-md)', boxShadow: f ? 'var(--tk-focus-ring)' : 'none',
      transition: 'var(--tk-transition)', ...style,
    }}>
      <Icon name="search" size={16} color="var(--tk-ink-300)" />
      <input placeholder={placeholder} {...rest}
             onFocus={(e) => { setF(true); onFocus?.(e); }} onBlur={(e) => { setF(false); onBlur?.(e); }}
             style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', minWidth: 0,
                      font: 'var(--tk-body-weight) var(--tk-body-size)/var(--tk-body-lh) var(--tk-font-sans)', color: 'var(--tk-ink-900)' }} />
      {global && (
        <kbd style={{ font: 'var(--tk-micro-weight) var(--tk-micro-size)/var(--tk-micro-lh) var(--tk-font-sans)', color: 'var(--tk-ink-400)',
                      background: '#fff', border: '1px solid var(--tk-line-strong)',
                      borderRadius: 6, padding: '4px 6px' }}>{shortcut}</kbd>
      )}
    </div>
  );
}

import React from 'react';
import { Icon } from '../../assets/icons/Icon.jsx';
import { Avatar } from '../core/Avatar.jsx';
import { DropdownMenu } from '../feedback/DropdownMenu.jsx';

/** Sidebar control for switching between the trucking companies the signed-in
 *  account manages. Collapses to just the avatar when the sidebar is collapsed. */
export function CompanySwitcher({ company, companies = [], collapsed, onSelect, style }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;
    function closeOnOutsideClick(event) {
      if (!ref.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  if (!company) return null;
  const canSwitch = companies.length > 1;

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        onClick={() => canSwitch && setOpen((v) => !v)}
        aria-haspopup={canSwitch ? 'menu' : undefined}
        aria-expanded={canSwitch ? open : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: collapsed ? 0 : '8px 8px', border: '1px solid var(--tk-line)',
          borderRadius: 'var(--tk-r-md)', background: open ? 'var(--tk-surface-sunk)' : 'transparent',
          cursor: canSwitch ? 'pointer' : 'default', justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <Avatar name={company.name} square size={32} tone="var(--tk-navy)" />
        {!collapsed && (
          <>
            <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <span style={{
                display: 'block', font: '600 13px/17px var(--tk-font-sans)', color: 'var(--tk-ink-900)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{company.name}</span>
              <span style={{ display: 'block', font: '400 12px/16px var(--tk-font-sans)', color: 'var(--tk-ink-400)' }}>
                Trucking Company
              </span>
            </span>
            {canSwitch && <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color="var(--tk-ink-400)" />}
          </>
        )}
      </button>
      {open && canSwitch && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', zIndex: 100 }}>
          <DropdownMenu
            width={260}
            items={[
              { section: 'Your companies' },
              ...companies.map((entry) => ({
                label: entry.name,
                icon: entry.id === company.id ? 'check' : undefined,
                onClick: () => { setOpen(false); onSelect?.(entry); },
              })),
            ]}
          />
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { Icon } from '../../assets/icons/Icon.jsx';
import { Avatar } from '../core/Avatar.jsx';
import { SearchField } from '../forms/SearchField.jsx';
import { DropdownMenu } from '../feedback/DropdownMenu.jsx';

/** Sticky application bar: menu toggle, global search, system health, notifications, account. */
export function TopBar({ onMenu, searchPlaceholder = 'Search jobs, trucks, companies, exporters...',
                         health = 'System Health', notifications = 0, user, role, style,
                         searchValue, onSearch, onNotifications, onViewProfile, onLogout, avatarSrc }) {
  const [accountOpen, setAccountOpen] = React.useState(false);
  const accountRef = React.useRef(null);

  React.useEffect(() => {
    if (!accountOpen) return undefined;
    function closeOnOutsideClick(event) {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setAccountOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [accountOpen]);

  return (
    <header className="tk-topbar" style={{
      display: 'flex', alignItems: 'center', gap: 16, height: 'var(--tk-h-topbar)',
      padding: '0 var(--tk-page-gutter)', background: '#fff',
      borderBottom: '1px solid var(--tk-line)', ...style,
    }}>
      {onMenu && (
        <button className="tk-topbar-menu" type="button" onClick={onMenu} aria-label="Toggle navigation"
          style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer',
                   borderRadius: 'var(--tk-r-sm)', border: '1px solid var(--tk-line-strong)',
                   background: '#fff', color: 'var(--tk-ink-500)' }}>
          <Icon name="menu" size={16} />
        </button>
      )}
      <SearchField className="tk-global-search" variant="global" placeholder={searchPlaceholder} style={{ flex: '0 1 440px' }}
        value={searchValue} onChange={onSearch} />
      <div className="tk-topbar-spacer" style={{ flex: 1 }} />
      <button className="tk-topbar-notifications" type="button" aria-label="Notifications" onClick={onNotifications}
        style={{ position: 'relative', width: 38, height: 38, display: 'grid', placeItems: 'center',
                 border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--tk-ink-500)' }}>
        <Icon name="bell" size={20} />
        {notifications > 0 && (
          <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 17, height: 17, padding: '0 4px',
                         borderRadius: 999, background: 'var(--tk-danger-solid)', color: '#fff',
                         font: '600 10px/17px var(--tk-font-sans)', textAlign: 'center' }}>{notifications}</span>
        )}
      </button>
      {health && (
        <span className="tk-topbar-health" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 14px',
                       borderRadius: 'var(--tk-r-md)', border: '1px solid var(--tk-line-strong)',
                       font: '500 13px/1 var(--tk-font-sans)', color: 'var(--tk-ink-700)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--tk-success)' }} />
          {health}
        </span>
      )}
      <div ref={accountRef} style={{ position: 'relative' }}>
        <button className="tk-topbar-account" type="button" onClick={() => setAccountOpen((open) => !open)}
          aria-haspopup="menu" aria-expanded={accountOpen}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, border: 0,
                   background: accountOpen ? 'var(--tk-surface-sunk)' : 'transparent', cursor: 'pointer',
                   padding: '5px 7px', borderRadius: 'var(--tk-r-md)' }}>
          <Avatar name={user} src={avatarSrc} square size={34} tone="var(--tk-navy)" />
          <span style={{ textAlign: 'left', lineHeight: 1.25 }}>
            <span style={{ display: 'block', font: '600 14px var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{user}</span>
            <span style={{ display: 'block', font: '400 12px var(--tk-font-sans)', color: 'var(--tk-ink-400)' }}>{role}</span>
          </span>
          <Icon name={accountOpen ? 'chevron-up' : 'chevron-down'} size={16} color="var(--tk-ink-400)" />
        </button>
        {accountOpen && (
          <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 100 }}>
            <DropdownMenu width={224} items={[
              { section: 'Account' },
              { label: 'View profile', icon: 'user-round', onClick: () => { setAccountOpen(false); onViewProfile?.(); } },
              { divider: true },
              { label: 'Log out', icon: 'log-out', tone: 'danger', onClick: () => { setAccountOpen(false); onLogout?.(); } },
            ]} />
          </div>
        )}
      </div>
    </header>
  );
}

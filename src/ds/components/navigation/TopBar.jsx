import React from 'react';
import { Icon } from '../../assets/icons/Icon.jsx';
import { Avatar } from '../core/Avatar.jsx';
import { SearchField } from '../forms/SearchField.jsx';
import { DropdownMenu } from '../feedback/DropdownMenu.jsx';

/**
 * Sticky application bar: menu toggle, global search, system health, notifications, account.
 * `searchResults` ([{ section, total, items: [{ key, icon, label, meta, tag }] }]) opens a
 * results dropdown under the search while it has text; picking a row calls `onSearchSelect(item)`.
 */
export function TopBar({ onMenu, searchPlaceholder = 'Search jobs, trucks, companies, exporters...',
                         health = 'System Health', notifications = 0, user, role, style,
                         searchValue, onSearch, searchResults, onSearchSelect,
                         onNotifications, onViewProfile, onLogout, avatarSrc }) {
  const [accountOpen, setAccountOpen] = React.useState(false);
  const accountRef = React.useRef(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const searchRef = React.useRef(null);
  const hasQuery = !!searchValue?.trim();
  const hits = (searchResults || []).flatMap((group) => group.items);
  const showResults = searchOpen && hasQuery && !!searchResults;

  React.useEffect(() => { setActive(0); }, [searchValue]);

  React.useEffect(() => {
    function focusOnShortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.querySelector('input')?.focus();
      }
    }
    function closeOnOutsideClick(event) {
      if (!searchRef.current?.contains(event.target)) setSearchOpen(false);
    }
    document.addEventListener('keydown', focusOnShortcut);
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('keydown', focusOnShortcut);
      document.removeEventListener('pointerdown', closeOnOutsideClick);
    };
  }, []);

  function pick(item) {
    setSearchOpen(false);
    searchRef.current?.querySelector('input')?.blur();
    onSearchSelect?.(item);
  }

  function onSearchKeyDown(event) {
    if (event.key === 'Escape') { setSearchOpen(false); return; }
    if (!showResults || hits.length === 0) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => (i + 1) % hits.length); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => (i - 1 + hits.length) % hits.length); }
    else if (event.key === 'Enter') { event.preventDefault(); pick(hits[active]); }
  }

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
      <div ref={searchRef} className="tk-global-search" style={{ position: 'relative', flex: '0 1 440px', minWidth: 0 }}>
        <SearchField variant="global" placeholder={searchPlaceholder} value={searchValue}
          onChange={(event) => { setSearchOpen(true); onSearch?.(event); }}
          onFocus={() => setSearchOpen(true)} onKeyDown={onSearchKeyDown}
          role="combobox" aria-expanded={showResults} aria-controls="tk-global-search-results" aria-autocomplete="list" />
        {showResults && (
          <div id="tk-global-search-results" role="listbox" className="tk-scroll" style={{
            position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 100, width: '100%', minWidth: 'min(360px, calc(100vw - 24px))',
            maxHeight: 'min(480px, calc(100dvh - 96px))', overflowY: 'auto', padding: 6, background: '#fff',
            borderRadius: 'var(--tk-r-lg)', border: '1px solid var(--tk-line)', boxShadow: 'var(--tk-shadow-menu)',
            animation: 'tk-menu-in var(--tk-dur) var(--tk-ease)',
          }}>
            {hits.length === 0 && (
              <div style={{ padding: '14px 10px', font: '400 13px/18px var(--tk-font-sans)', color: 'var(--tk-ink-400)' }}>
                No results for “{searchValue.trim()}”
              </div>
            )}
            {searchResults.map((group) => (
              <div key={group.section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 10px 6px', font: '600 10px/14px var(--tk-font-sans)',
                              letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--tk-ink-300)' }}>
                  <span>{group.section}</span>
                  {group.total > group.items.length && <span>{group.items.length} of {group.total}</span>}
                </div>
                {group.items.map((item) => {
                  const hot = hits[active] === item;
                  return (
                    <button key={item.key} type="button" role="option" aria-selected={hot}
                      onMouseEnter={() => setActive(hits.indexOf(item))} onClick={() => pick(item)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', border: 0,
                               borderRadius: 'var(--tk-r-sm)', cursor: 'pointer', textAlign: 'left',
                               background: hot ? 'var(--tk-surface-sunk)' : 'transparent', transition: 'var(--tk-transition)' }}>
                      <span style={{ width: 30, height: 30, flex: '0 0 auto', display: 'grid', placeItems: 'center',
                                     borderRadius: 'var(--tk-r-sm)', background: 'var(--tk-blue-soft)', color: 'var(--tk-blue)' }}>
                        <Icon name={item.icon || 'search'} size={15} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0, display: 'grid' }}>
                        <span style={{ font: '600 13px/18px var(--tk-font-sans)', color: 'var(--tk-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                        {item.meta && <span style={{ font: '400 12px/16px var(--tk-font-sans)', color: 'var(--tk-ink-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.meta}</span>}
                      </span>
                      {item.tag && <span style={{ flex: '0 0 auto', font: '500 11px/16px var(--tk-font-sans)', color: 'var(--tk-ink-400)' }}>{item.tag}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
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

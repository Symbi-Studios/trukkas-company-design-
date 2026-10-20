'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../assets/icons/Icon.jsx';

const useBrowserLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

/**
 * The "More Actions" sheet. items = [{ label, icon, tone, onClick } | { section: 'MANAGE RULE' } | { divider: true }]
 */
export function DropdownMenu({ items = [], width = 240, open = true, style }) {
  if (!open) return null;
  return <MenuContent items={items} width={width} style={style} />;
}

function MenuContent({ items, width, style }) {
  const anchorRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [portal, setPortal] = React.useState(null);

  useBrowserLayoutEffect(() => {
    // Keep inline design-system examples in flow. Floating menus must escape
    // scroll containers and card clipping rather than changing table overflow.
    const parent = anchorRef.current?.parentElement;
    if (parent && ['absolute', 'fixed'].includes(getComputedStyle(parent).position)) setPortal(document.body);
  }, []);

  useBrowserLayoutEffect(() => {
    if (!portal) return undefined;
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    const trigger = anchor.parentElement.parentElement;
    const control = trigger.firstElementChild ?? trigger;
    function positionMenu() {
      const point = anchor.getBoundingClientRect();
      const triggerRect = control.getBoundingClientRect();
      const viewport = window.visualViewport;
      const leftEdge = (viewport?.offsetLeft ?? 0) + 12;
      const topEdge = (viewport?.offsetTop ?? 0) + 12;
      const rightEdge = leftEdge + (viewport?.width ?? window.innerWidth) - 24;
      const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight) - 24;
      menu.style.maxWidth = `${Math.max(0, Math.min(280, rightEdge - leftEdge))}px`;
      const gap = Math.max(0, point.top - trigger.getBoundingClientRect().bottom);
      const belowTop = Math.max(point.top, triggerRect.bottom + gap);
      const below = Math.max(0, bottomEdge - belowTop);
      const above = Math.max(0, triggerRect.top - gap - topEdge);
      const desiredHeight = Math.min(520, menu.scrollHeight + 2);
      const flip = desiredHeight > below && above > below;
      menu.style.maxHeight = `${Math.min(520, flip ? above : below)}px`;
      const top = flip ? triggerRect.top - gap - menu.offsetHeight : belowTop;
      menu.style.left = `${Math.max(leftEdge, Math.min(point.left, rightEdge - menu.offsetWidth))}px`;
      menu.style.top = `${Math.max(topEdge, Math.min(top, bottomEdge - menu.offsetHeight))}px`;
      menu.style.visibility = triggerRect.bottom > topEdge && triggerRect.top < bottomEdge && triggerRect.right > leftEdge && triggerRect.left < rightEdge ? 'visible' : 'hidden';
    }
    positionMenu();
    const observer = new ResizeObserver(positionMenu);
    observer.observe(menu);
    observer.observe(trigger);
    observer.observe(control);
    window.addEventListener('scroll', positionMenu, true);
    window.addEventListener('resize', positionMenu);
    window.visualViewport?.addEventListener('resize', positionMenu);
    window.visualViewport?.addEventListener('scroll', positionMenu);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', positionMenu, true);
      window.removeEventListener('resize', positionMenu);
      window.visualViewport?.removeEventListener('resize', positionMenu);
      window.visualViewport?.removeEventListener('scroll', positionMenu);
    };
  }, [portal, width, style]);

  const menu = (
    <div ref={menuRef} className="tk-dropdown-menu" role="menu"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') event.stopPropagation(); }}
      style={{
      width, padding: 6, background: '#fff', borderRadius: 'var(--tk-r-lg)',
      border: '1px solid var(--tk-line)', boxShadow: 'var(--tk-shadow-menu)',
      animation: 'tk-menu-in var(--tk-dur) var(--tk-ease)', ...style,
      ...(portal ? { position: 'fixed', zIndex: 110, visibility: 'hidden' } : {}),
    }}>
      {items.map((it, i) => {
        if (it.divider) return <div key={i} style={{ height: 1, background: 'var(--tk-line)', margin: '6px 0' }} />;
        if (it.section) return (
          <div key={i} style={{ padding: '10px 10px 6px', font: '600 10px/14px var(--tk-font-sans)',
                                letterSpacing: '0.6px', textTransform: 'uppercase',
                                color: 'var(--tk-ink-300)' }}>{it.section}</div>
        );
        const danger = it.tone === 'danger';
        return <MenuRow key={i} item={it} danger={danger} />;
      })}
    </div>
  );
  return <>
    <span ref={anchorRef} aria-hidden="true" style={{ display: portal ? 'block' : 'none', width: style?.width ?? width, maxWidth: 'min(280px, calc(100vw - 24px))', height: 0 }} />
    {portal ? createPortal(menu, portal) : menu}
  </>;
}

function MenuRow({ item, danger }) {
  const [hot, setHot] = React.useState(false);
  return (
    <button type="button" role="menuitem" onClick={item.onClick}
      onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px',
               border: 0, borderRadius: 'var(--tk-r-sm)', cursor: 'pointer', textAlign: 'left',
               background: hot ? (danger ? 'var(--tk-danger-soft)' : 'var(--tk-surface-sunk)') : 'transparent',
               color: danger ? 'var(--tk-danger)' : 'var(--tk-ink-700)',
               font: '500 13px/18px var(--tk-font-sans)', transition: 'var(--tk-transition)' }}>
      {item.icon && <Icon name={item.icon} size={16} />}
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.trailing}
    </button>
  );
}

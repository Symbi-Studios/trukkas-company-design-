'use client';

import { useEffect } from 'react';

// The top-bar search is the current screen's search. The shell broadcasts what
// is typed there; a screen with its own search field reports back so the two
// always show the same text.
const TOP_BAR_EVENT = 'trukkas:global-search';
const SCREEN_EVENT = 'trukkas:page-search';

/** Runs `onSearch(text)` whenever the top-bar search changes. */
export function useTopBarSearch(onSearch: (text: string) => void) {
  useEffect(() => {
    const listener = (event: Event) => onSearch((event as CustomEvent<string>).detail || '');
    window.addEventListener(TOP_BAR_EVENT, listener);
    return () => window.removeEventListener(TOP_BAR_EVENT, listener);
  }, []);
}

/** Call from a screen's own search field so the top bar mirrors it. */
export function syncTopBarSearch(value: string) {
  window.dispatchEvent(new CustomEvent(SCREEN_EVENT, { detail: value }));
}

/** Shell side: subscribes to text typed into a screen's own search field. */
export function onScreenSearch(handler: (text: string) => void) {
  const listener = (event: Event) => handler((event as CustomEvent<string>).detail || '');
  window.addEventListener(SCREEN_EVENT, listener);
  return () => window.removeEventListener(SCREEN_EVENT, listener);
}

import { useCallback, useEffect, useState } from 'react';
import { Card, Icon } from '../ds.js';

/** Transient confirmation in the bottom-right corner. `const [toast, show] = useToast();` */
export function useToast(duration = 2600) {
  const [message, setMessage] = useState(null);
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(null), duration);
    return () => clearTimeout(timer);
  }, [message, duration]);
  return [message, useCallback((text) => setMessage(text), [])];
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div role="status" style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 200 }}>
      <Card style={{ display: 'flex', alignItems: 'center', gap: 8, boxShadow: 'var(--tk-shadow-menu)' }}>
        <Icon name="circle-check" size={16} color="var(--tk-success)" />
        {message}
      </Card>
    </div>
  );
}

/** Copies the current page (or `path`) URL and reports it through `show`. */
export async function copyLink(show, path) {
  const url = path ? window.location.origin + path : window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    show('Link copied to clipboard.');
  } catch {
    show(url);
  }
}

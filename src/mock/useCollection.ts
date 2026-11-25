import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot } from './db';

/** Subscribes a component to one domain's rows. Re-renders on any patch/prepend/setRows. */
export function useCollection(domain: string) {
  return useSyncExternalStore(
    (onChange) => subscribe(domain, onChange),
    () => getSnapshot(domain),
    () => getSnapshot(domain),
  );
}

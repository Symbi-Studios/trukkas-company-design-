// Tiny in-memory, pub/sub "database" the mock API layer reads and writes.
// Shaped so swapping api.js for real network calls later doesn't touch the
// components that call it — see HANDOFF.md, "Mock data contract".
type MockRow = Record<string, any>;
const state: Record<string, MockRow[]> = {};
const listeners = new Map<string, Set<() => void>>();

function emit(domain: string) {
  (listeners.get(domain) || new Set()).forEach(fn => fn());
}

export function seed(domain: string, rows: MockRow[]) {
  state[domain] = rows;
}

export function getSnapshot(domain: string) {
  return state[domain];
}

export function subscribe(domain: string, fn: () => void) {
  if (!listeners.has(domain)) listeners.set(domain, new Set());
  listeners.get(domain)!.add(fn);
  return () => listeners.get(domain)!.delete(fn);
}

export function setRows(domain: string, rows: MockRow[]) {
  state[domain] = rows;
  emit(domain);
}

export function patchRow(domain: string, idKey: string, id: unknown, changes: Partial<MockRow>) {
  state[domain] = (state[domain] || []).map(r => (r[idKey] === id ? { ...r, ...changes } : r));
  emit(domain);
  return state[domain].find(r => r[idKey] === id);
}

export function prependRow(domain: string, row: MockRow) {
  state[domain] = [row, ...(state[domain] || [])];
  emit(domain);
  return row;
}

export function getRow(domain: string, idKey: string, id: unknown) {
  return (state[domain] || []).find(r => r[idKey] === id);
}

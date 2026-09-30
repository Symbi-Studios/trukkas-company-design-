export function formatNaira(n) {
  const sign = n < 0 ? '-' : '';
  return `${sign}₦${Math.abs(n).toLocaleString('en-NG')}`;
}

/** Compact axis label: ₦0, ₦600K, ₦1.2M. */
export function formatNairaShort(n) {
  if (Math.abs(n) >= 1_000_000) return `₦${+(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `₦${Math.round(n / 1_000)}K`;
  return `₦${Math.round(n)}`;
}

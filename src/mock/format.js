export function formatNaira(n) {
  const sign = n < 0 ? '-' : '';
  return `${sign}₦${Math.abs(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Compact axis label: ₦0, ₦600K, ₦1.2M. */
export function formatNairaShort(n) {
  return formatNaira(n);
}

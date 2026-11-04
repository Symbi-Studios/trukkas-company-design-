// Amounts sent to the API must be expressible in whole kobo.
export function validMoneyAmount(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  const input = String(value).trim();
  return /^\d+(?:\.\d{1,2})?$/.test(input) && Number.isFinite(Number(input));
}

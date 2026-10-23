const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
const instant = (value) => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;

export function pinLockoutView(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const lockedUntil = instant(source.lockedUntil);
  const remainingAttempts = count(source.remainingAttempts);
  const consistent = remainingAttempts !== null && (source.locked === true
    ? lockedUntil !== null && remainingAttempts === 0
    : source.locked === false && source.lockedUntil === null);
  return {
    locked: consistent ? source.locked : null,
    lockedUntil, remainingAttempts,
    maxAttempts: count(source.maxAttempts), lockMinutes: count(source.lockMinutes),
  };
}

const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
const instant = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;

// OTP metadata is kept in memory. Codes and passwords never enter this view.
export function otpMetadata(source) {
  const expiresAt = instant(source?.expiresAt), resendAt = instant(source?.resendAvailableAt);
  const retryAfterSeconds = count(source?.retryAfterSeconds), remainingAttempts = count(source?.remainingAttempts);
  if (source?.length !== 6 || expiresAt === null || resendAt === null || expiresAt <= Date.now()
    || resendAt > expiresAt || retryAfterSeconds === null || remainingAttempts === null) return null;
  return { length: source.length, expiresAt, resendAt, retryAfterSeconds, remainingAttempts };
}

export const otpRemainingAttempts = count;
export const otpRetryAt = (source) => {
  const seconds = count(source?.retryAfterSeconds);
  return seconds === null ? null : Date.now() + seconds * 1000;
};

const uncertainResult = 'We couldn’t confirm what happened. Check the details before trying again.';
const technicalDetail = /\b(?:api|backend|database|db|http|endpoint|pagination|payload|schema|stack|traceback|sql|exception|server|response|idempotency|undefined|null|typeerror|referenceerror|syntaxerror|fetch|network|json|statuscode|prisma|url|econnrefused|econnreset)\b|https?:\/\/|\b(?:fetch|network)error\b|\bstatus(?:\s+code)?\s*[:=]?\s*[1-5]\d\d\b|\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b|\b\w+\.\w+(?:\.\w+)*\s+permission\b/i;

// Keep useful validation and the instructions for uncertain writes, while
// preventing transport and implementation details from reaching the screen.
function userMessage(value) {
  if (typeof value !== 'string' || !value.trim()) return uncertainResult;
  const message = value.trim();
  if (/\bpagination\b|\bcollection\b/i.test(message)) return 'We couldn’t load all the records. Refresh and check your changes before trying again.';
  if (/\bcsv columns\b/i.test(message)) return 'We couldn’t prepare the download. Please refresh and try again.';

  const readable = message
    .replace(/The API did not confirm/gi, 'We couldn’t confirm')
    .replace(/The API could not confirm/gi, 'We couldn’t confirm')
    .replace(/The API did not identify/gi, 'We couldn’t identify')
    .replace(/The API has not identified/gi, 'We couldn’t identify')
    .replace(/The API did not return/gi, 'We couldn’t load')
    .replace(/The API does not support/gi, 'We can’t support')
    .replace(/The API accepts up to/gi, 'You can add up to')
    .replace(/with a confirmed API ID/gi, 'from the list')
    .replace(/with a valid API ID/gi, 'from the list')
    .replace(/This (\w+(?:\s+\w+)?) has no API ID and cannot be marked as read\./gi, 'We couldn’t identify this $1 to mark it as read. Please refresh and try again.')
    .replace(/This (\w+(?:\s+\w+)?) has no API ID\./gi, 'We couldn’t identify this $1. Please refresh and try again.')
    .replace(/\bOTP\b/g, 'verification code')
    .replace(/\bserver logout\b/gi, 'sign-out');

  return technicalDetail.test(readable) || readable.length > 500 || /<\s*(?:!doctype|html|head|body)[\s>]/i.test(readable)
    ? uncertainResult : readable;
}

function readableBodyMessage(data) {
  if (typeof data === 'string') {
    const message = data.trim();
    if (message && message.length <= 500 && !/<\s*(?:!doctype|html|head|body)[\s>]/i.test(message)) {
      return message;
    }
    return null;
  }

  if (!data || typeof data !== 'object') return null;

  const validationMessages = Array.isArray(data.errors) ? data.errors.flatMap((entry) => {
    if (typeof entry === 'string') return [entry];
    if (typeof entry?.message === 'string') return [entry.message];
    return Array.isArray(entry?.message) ? entry.message.filter((value) => typeof value === 'string') : [];
  }).map((value) => value.trim()).filter(Boolean) : [];
  const withValidation = (message) => [...new Set([message, ...validationMessages].filter(Boolean))].join(' ');

  for (const value of [data.message, data.detail, data.error_description, data.error]) {
    if (Array.isArray(value)) {
      const message = value.filter((item) => typeof item === 'string').join(' ').trim();
      if (message) return withValidation(message);
    }
    if (typeof value === 'string' && value.trim()) return withValidation(value.trim());
  }

  return withValidation(null) || null;
}

export function getApiErrorMessage(error) {
  if (error?.status === 'FETCH_ERROR') {
    return 'We couldn’t connect. Check your connection, then check whether your changes were saved before trying again.';
  }

  if (error?.status === 'PARSING_ERROR') {
    return uncertainResult;
  }
  if (error?.status === 'TIMEOUT_ERROR') return 'This is taking too long. Check whether your changes were saved before trying again.';
  if (error?.status === 'CUSTOM_ERROR' && typeof error.error === 'string' && error.error.trim()) {
    return userMessage(error.error);
  }
  if (typeof error?.status === 'number' && error.status >= 500) return uncertainResult;

  const serverMessage = readableBodyMessage(error?.data);
  if (serverMessage) return userMessage(serverMessage);
  if (typeof error === 'string') return userMessage(error);
  if (typeof error?.message === 'string') return userMessage(error.message);
  if (typeof error?.status === 'number') return 'We couldn’t complete that. Please check your details and try again.';
  return uncertainResult;
}

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
    return 'Could not reach the Trukkas API. Check your connection and try again.';
  }

  const serverMessage = readableBodyMessage(error?.data);
  if (serverMessage) return serverMessage;

  if (error?.status === 'PARSING_ERROR') {
    return `The Trukkas API returned an unreadable response (HTTP ${error.originalStatus}).`;
  }
  if (error?.status === 'TIMEOUT_ERROR') return 'The Trukkas API request timed out.';
  if (error?.status === 'CUSTOM_ERROR' && typeof error.error === 'string' && error.error.trim()) {
    return error.error.trim();
  }
  if (typeof error?.status === 'number') return `Trukkas API request failed (HTTP ${error.status}).`;
  return 'The request failed before a server response was available.';
}

export const REQUIRED_DOCUMENT_TYPES = [
  'Registration', 'Insurance', 'Road Worthiness', 'Emission', 'Customs', 'Special Permit', 'Safety',
];

const DOCUMENT_STATUS_TONE = {
  Valid: 'success',
  'Expiring Soon': 'warning',
  Expired: 'danger',
  'N/A': 'neutral',
};

export function documentStatusTone(status) {
  return DOCUMENT_STATUS_TONE[status] || 'neutral';
}

export function summarizeDocuments(documents) {
  return documents.reduce((summary, document) => {
    summary.total += 1;
    if (document.status === 'Valid') summary.valid += 1;
    else if (document.status === 'Expiring Soon') summary.expiringSoon += 1;
    else if (document.status === 'Expired') summary.expired += 1;
    return summary;
  }, { total: 0, valid: 0, expiringSoon: 0, expired: 0 });
}

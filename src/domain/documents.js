// Compliance documents belong to one owner: the company itself (business
// onboarding / KYB), a vehicle, or a driver. Job and trip paperwork (waybills,
// delivery notes, bills of lading) is NOT here — it lives on the job/trip it
// belongs to (see jobs.js `documents` and trips.js `documents`).
//
// Each requirement: `type` (stored on the document), `label`, `required`,
// `expires` (needs an expiry date), `number` (captures an ID number),
// `sensitive` (ID number is masked — only the last 4 digits are kept),
// `file` (needs an uploaded file; false for number-only records like BVN).
export const COMPANY_REQUIREMENTS = [
  { type: 'CAC Certificate', label: 'CAC Certificate of Incorporation', required: true, file: true, number: 'RC Number', hint: 'Issued by the Corporate Affairs Commission.' },
  { type: 'CAC Status Report', label: 'CAC Status Report (Directors & Shareholders)', required: true, file: true, hint: 'Form CAC 1.1 or a recent status report listing directors.' },
  { type: 'Memorandum of Association', label: 'Memorandum of Association', required: true, file: true, hint: 'Memorandum (and Articles) of Association filed with the CAC.' },
  { type: 'TIN', label: 'Tax Identification Number (TIN) Certificate', required: true, file: true, number: 'TIN' },
  { type: 'NIN', label: "Director's NIN", required: true, file: false, number: 'NIN', sensitive: true, hint: 'National Identification Number of the director operating the account.' },
  { type: 'BVN', label: "Director's BVN", required: true, file: false, number: 'BVN', sensitive: true, hint: 'Bank Verification Number, used for payout verification.' },
  { type: 'Government ID', label: "Director's Government ID", required: true, file: true, expires: true, hint: 'International passport, driver’s licence or voter’s card.' },
  { type: 'Proof of Address', label: 'Proof of Business Address', required: true, file: true, hint: 'Utility bill or tenancy agreement dated within the last 3 months.' },
  { type: 'Bank Verification', label: 'Corporate Bank Account', required: true, file: true, number: 'Corporate Account Number', sensitive: true, hint: 'Corporate account number plus a bank reference or account confirmation letter.' },
  { type: 'Goods-in-Transit Insurance', label: 'Goods-in-Transit Insurance', required: false, file: true, expires: true, hint: 'Recommended: many forwarders require it for high-value cargo.' },
  { type: 'Haulage Permit', label: 'Haulage / Transport Operator Permit', required: false, file: true, expires: true, hint: 'State or federal operator permit, where applicable.' },
];

export const VEHICLE_REQUIREMENTS = [
  { type: 'Registration', label: 'Vehicle Registration (Vehicle Licence)', required: true, file: true, expires: true },
  { type: 'Proof of Ownership', label: 'Proof of Ownership', required: true, file: true, hint: 'Purchase receipt, customs papers or lease agreement.' },
  { type: 'Road Worthiness', label: 'Road Worthiness Certificate', required: true, file: true, expires: true },
  { type: 'Insurance', label: 'Insurance Certificate', required: true, file: true, expires: true, hint: 'At least third-party motor insurance.' },
  { type: 'Emission', label: 'Emission Test Report', required: false, file: true, expires: true },
  { type: 'Customs', label: 'Customs Papers', required: false, file: true, hint: 'For imported vehicles.' },
  { type: 'Special Permit', label: 'Special Permit', required: false, file: true, expires: true, hint: 'Heavy-duty, tanker or abnormal-load permits.' },
  { type: 'Safety', label: 'Safety / ADR Certificate', required: false, file: true, expires: true, hint: 'Required for hazardous cargo.' },
];

export const DRIVER_REQUIREMENTS = [
  { type: "Driver's License", label: "Driver's Licence", required: true, file: true, expires: true, number: 'Licence Number' },
  { type: 'NIN', label: 'National Identification Number (NIN)', required: true, file: false, number: 'NIN', sensitive: true },
  { type: 'Passport Photo', label: 'Passport Photograph', required: true, file: true, accept: 'image/*' },
  { type: 'Medical Fitness', label: 'Medical Fitness Certificate', required: true, file: true, expires: true },
  { type: 'Guarantor Form', label: 'Guarantor Form', required: true, file: true, hint: 'Signed guarantor form with the guarantor’s ID.' },
  { type: 'Proof of Address', label: 'Proof of Address', required: false, file: true },
  { type: 'Police Clearance', label: 'Police Clearance Report', required: false, file: true },
  { type: 'Defensive Driving', label: 'Defensive Driving Certificate', required: false, file: true, expires: true },
];

export const VEHICLE_PHOTO_SLOTS = ['Front', 'Back', 'Left Side', 'Right Side', 'Cab Interior', 'Odometer'];

export const REQUIREMENTS_BY_OWNER = { company: COMPANY_REQUIREMENTS, vehicle: VEHICLE_REQUIREMENTS, driver: DRIVER_REQUIREMENTS };

// Kept for older callers; the vehicle catalogue above is the source of truth.
export const REQUIRED_DOCUMENT_TYPES = VEHICLE_REQUIREMENTS.map((r) => r.type);

const DOCUMENT_STATUS_TONE = {
  Valid: 'success',
  Verified: 'success',
  'Expiring Soon': 'warning',
  'Pending Review': 'info',
  Expired: 'danger',
  Rejected: 'danger',
  Missing: 'neutral',
  'N/A': 'neutral',
};

export function documentStatusTone(status) {
  return DOCUMENT_STATUS_TONE[status] || 'neutral';
}

export function isDocumentOk(status) {
  return status === 'Valid' || status === 'Verified' || status === 'N/A' || status === 'Pending Review';
}

export function summarizeDocuments(documents) {
  return documents.reduce((summary, document) => {
    summary.total += 1;
    if (document.status === 'Valid' || document.status === 'Verified') summary.valid += 1;
    else if (document.status === 'Expiring Soon') summary.expiringSoon += 1;
    else if (document.status === 'Expired') summary.expired += 1;
    return summary;
  }, { total: 0, valid: 0, expiringSoon: 0, expired: 0 });
}

export function documentsFor(documents, ownerType, ownerId) {
  return documents.filter((d) => d.ownerType === ownerType && (ownerId == null || d.ownerId === ownerId));
}

/**
 * Requirement checklist for one owner. Each row pairs a requirement with its
 * latest document (or none → 'Missing'). `summary.complete` is true when every
 * required document is present and not expired.
 */
export function complianceFor(requirements, docs) {
  const rows = requirements.map((req) => {
    const doc = docs.find((d) => d.type === req.type) || null;
    return { req, doc, status: doc ? doc.status : 'Missing' };
  });
  const required = rows.filter((r) => r.req.required);
  const met = required.filter((r) => r.doc && r.status !== 'Expired' && r.status !== 'Rejected');
  return {
    rows,
    summary: {
      requiredTotal: required.length,
      requiredMet: met.length,
      missing: required.filter((r) => !r.doc).length,
      expiring: rows.filter((r) => r.status === 'Expiring Soon').length,
      expired: rows.filter((r) => r.status === 'Expired').length,
      complete: met.length === required.length,
    },
  };
}

/** Status for a newly uploaded document from its expiry date (YYYY-MM-DD or display date). */
export function statusFromExpiry(expiry, now = new Date()) {
  if (!expiry) return 'Pending Review';
  const date = new Date(expiry);
  if (Number.isNaN(date.getTime())) return 'Pending Review';
  const days = (date.getTime() - now.getTime()) / 86_400_000;
  if (days < 0) return 'Expired';
  if (days <= 60) return 'Expiring Soon';
  return 'Pending Review';
}

export function formatDisplayDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Keep only the last 4 digits of a sensitive ID number. */
export function maskNumber(value = '') {
  const digits = String(value).replace(/\s+/g, '');
  if (!digits) return '';
  return `•••••••${digits.slice(-4)}`;
}

export function ownerLink(doc) {
  if (doc.ownerType === 'vehicle') return `/fleet/${String(doc.ownerId).replace(/\s+/g, '-')}/documents`;
  if (doc.ownerType === 'driver') return `/drivers/${doc.ownerId}`;
  return '/documents';
}

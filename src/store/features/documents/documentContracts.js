import { COMPANY_REQUIREMENTS, maskNumber } from '../../../domain/documents.js';
import { dateLabel, fleetDocumentTypes, rows, safeUrl, text } from '../fleet/fleetContracts.js';

export const companyDocumentTypes = {
  'CAC Certificate': 'CAC_CERTIFICATE', 'CAC Status Report': 'CAC_STATUS_REPORT', TIN: 'TIN_CERTIFICATE',
  'Haulage Permit': 'OPERATING_LICENCE', 'Goods-in-Transit Insurance': 'GOODS_IN_TRANSIT_INSURANCE',
  'Proof of Address': 'PROOF_OF_ADDRESS', 'Memorandum of Association': 'MEMORANDUM_OF_ASSOCIATION',
  'Government ID': 'DIRECTOR_ID', 'Bank Verification': 'BANK_CONFIRMATION_LETTER',
};
const companyNames = Object.fromEntries(Object.entries(companyDocumentTypes).map(([label, wire]) => [wire, label]));
export const vehicleDocumentTypes = fleetDocumentTypes;
const vehicleNames = Object.fromEntries(Object.entries(vehicleDocumentTypes).map(([label, wire]) => [wire, label]));
export const driverDocumentTypes = {
  "Driver's License": 'DRIVERS_LICENCE', 'Passport Photo': 'PASSPORT_PHOTO', 'Medical Fitness': 'MEDICAL_CERTIFICATE',
  'Guarantor Form': 'GUARANTOR_FORM', 'Proof of Address': 'PROOF_OF_ADDRESS',
  'Police Clearance': 'POLICE_CLEARANCE', 'Defensive Driving': 'DEFENSIVE_DRIVING',
};
const driverNames = { ...Object.fromEntries(Object.entries(driverDocumentTypes).map(([label, wire]) => [wire, label])), NIN_SLIP: 'NIN Slip', OTHER: 'Other' };
const requiredCompanyTypes = ['CAC_CERTIFICATE', 'TIN_CERTIFICATE', 'GOODS_IN_TRANSIT_INSURANCE'];
export const COMPANY_DOCUMENT_REQUIREMENTS = COMPANY_REQUIREMENTS.map((requirement) => ({
  ...requirement, required: requiredCompanyTypes.includes(companyDocumentTypes[requirement.type]),
}));
const label = (mapping, value) => Object.hasOwn(mapping, value) ? mapping[value] : null;
export const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const dayKey = (value) => {
  if (validDate(value)) return value;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value)) || !validDate(value.slice(0, 10))) return null;
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Africa/Lagos' }).formatToParts(new Date(value));
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type).value).join('-');
};
export const documentDateKey = dayKey;
export function expiryDays(value) {
  const date = dayKey(value), today = dayKey(new Date().toISOString());
  return date ? Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000) : null;
}
const fileSize = (value) => !Number.isSafeInteger(value) || value < 0 ? '—' : value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${Math.round(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;
const expiryStatus = (source) => source === 'EXPIRED' ? 'Expired' : source === 'EXPIRING_SOON' ? 'Expiring Soon' : null;

export function companyDocumentView(source, companyId) {
  if (!text(source?.id) || !text(source.type)) return null;
  const expiry = source.expiresAt, days = expiryDays(expiry);
  return {
    id: source.id, ownerType: 'company', ownerId: companyId,
    type: label(companyNames, source.type) ?? text(source.label) ?? '—', name: text(source.fileName) ?? text(source.label) ?? '—',
    number: source.type === 'BANK_CONFIRMATION_LETTER' ? text(source.documentNumber) ? maskNumber(source.documentNumber) : '—' : text(source.documentNumber) ?? '—',
    status: source.status === 'REJECTED' ? 'Rejected' : expiryStatus(source.expiryStatus) ?? label({ APPROVED: 'Verified', PENDING: 'Pending Review' }, source.status) ?? '—',
    expiryDate: dateLabel(expiry), uploadedOn: dateLabel(source.uploadedAt), fileSize: fileSize(source.sizeBytes), url: safeUrl(source.url),
    expiryKnown: expiry === null || days !== null, expiryDays: days,
  };
}

export function companyLibraryView(source, companyId) {
  const entries = rows(source?.documents);
  if (!entries || entries.some((entry) => !text(entry.type) || (entry.status === 'MISSING' ? entry.id !== null : !text(entry.id)))) return null;
  const documents = entries.filter((entry) => entry.status !== 'MISSING').map((entry) => companyDocumentView(entry, companyId));
  if (documents.some((doc) => !doc) || new Set(documents.map((doc) => doc.id)).size !== documents.length || new Set(entries.map((entry) => entry.type)).size !== entries.length) return null;
  const missingTypes = entries.filter((entry) => entry.status === 'MISSING').map((entry) => label(companyNames, entry.type)).filter(Boolean);
  const required = requiredCompanyTypes.map((type) => entries.find((entry) => entry.type === type));
  const incomplete = required.some((entry) => entry && ['MISSING', 'REJECTED'].includes(entry.status));
  return { documents, missingTypes, verificationIncomplete: incomplete ? true : required.every((entry) => entry && ['PENDING', 'APPROVED'].includes(entry.status)) ? false : null };
}

export function companyComplianceView(library, verification) {
  const compliance = documentCompliance(COMPANY_DOCUMENT_REQUIREMENTS, library.documents, Object.keys(companyDocumentTypes), library.missingTypes);
  // Identity statuses belong in the existing checklist, but are not uploaded
  // documents: keep file IDs, counts and View actions tied to actual files.
  const statuses = { NOT_STARTED: 'Missing', PENDING_REVIEW: 'Pending Review', VERIFIED: 'Verified', REJECTED: 'Rejected' };
  const entries = compliance.rows.map((entry) => ['NIN', 'BVN'].includes(entry.req.type)
    ? { ...entry, status: label(statuses, verification?.[entry.req.type.toLowerCase()]?.status) ?? '—' }
    : entry);
  return { ...compliance, rows: entries, unavailableTypes: entries.filter((entry) => entry.status === '—').map((entry) => entry.req.type) };
}

export function vehicleDocumentView(source, truck) {
  if (!text(source?.id)) return null;
  const expiry = source.expiryDate, days = expiryDays(expiry);
  return {
    id: source.id, ownerType: 'vehicle', ownerId: truck.id, truckPlate: truck.plate,
    type: label(vehicleNames, source.type) ?? '—', name: text(source.name) ?? text(source.fileName) ?? '—', number: null,
    status: expiryStatus(source.expiryStatus) ?? (source.expiryStatus === 'OK' ? 'Valid' : source.status === 'UPLOADED' ? 'Uploaded' : '—'),
    expiryDate: dateLabel(expiry), uploadedOn: dateLabel(source.uploadedAt), fileSize: fileSize(source.sizeBytes), url: safeUrl(source.url),
    expiryKnown: expiry === null || days !== null, expiryDays: days,
  };
}

export function documentDriverView(source) {
  if (!text(source?.id)) return null;
  return { id: source.id, name: text(source.name) ?? '—', photo: safeUrl(source.avatarUrl),
    licenseNumber: text(source.license?.number) ?? '—', licenseExpiry: dateLabel(source.license?.expiresAt) };
}

// NIN is a separate identity record, not an uploaded file or document ID.
export function driverNinDocumentView(source, driver) {
  const statuses = { submitted: 'Pending Review', pending: 'Pending Review', verified: 'Verified', rejected: 'Rejected' };
  if (!source || source.status !== null && !Object.hasOwn(statuses, source.status)) return null;
  const candidate = text(source.maskedNin);
  const masked = candidate && /^[0-9*•]+$/.test(candidate) && /[*•]/.test(candidate) ? candidate : null;
  if (!masked && source.status === null) return null;
  const status = statuses[source.status] ?? '—';
  return { id: null, ownerType: 'driver', ownerId: driver.id, driverName: driver.name, type: 'NIN', name: 'NIN',
    number: masked ?? '—', status, uploadedOn: dateLabel(source.submittedAt), fileSize: '—', url: null,
    expiryDate: '—', expiryKnown: true, expiryDays: null };
}

export function driverDocumentView(source, driver) {
  if (!text(source?.id) || !text(source.type)) return null;
  const expiry = source.expiresAt, days = expiryDays(expiry);
  return {
    id: source.id, ownerType: 'driver', ownerId: driver.id, driverName: driver.name,
    type: label(driverNames, source.type) ?? '—', name: text(source.name) ?? text(source.fileName) ?? '—',
    number: source.type === 'NIN_SLIP' ? text(source.number) ? maskNumber(source.number) : '—' : text(source.number) ?? '—',
    status: expiryStatus(source.expiryStatus) ?? (source.expiryStatus === 'VALID' ? 'Valid' : source.status === 'UPLOADED' ? 'Uploaded' : '—'),
    expiryDate: dateLabel(expiry), uploadedOn: dateLabel(source.uploadedAt), fileSize: fileSize(source.sizeBytes), url: safeUrl(source.url),
    expiryKnown: expiry === null || days !== null, expiryDays: days,
  };
}

// A missing unsupported requirement is unknown, not evidence of noncompliance.
export function documentCompliance(requirements, documents, supportedTypes, missingTypes = null) {
  const entries = requirements.map((req) => {
    const doc = documents?.find((item) => item.type === req.type) ?? null;
    const knownMissing = !!documents && supportedTypes.includes(req.type) && (missingTypes === null || missingTypes.includes(req.type));
    return { req, doc, status: doc?.status ?? (knownMissing ? 'Missing' : '—') };
  });
  const required = entries.filter((entry) => entry.req.required);
  const uploadedWithoutExpiry = (entry) => entry.status === 'Uploaded' && entry.req.file !== false && !entry.req.expires
    && entry.doc?.expiryKnown === true && entry.doc.expiryDays === null && !!entry.doc.url;
  const known = required.every((entry) => entry.status !== '—'
    && (!entry.doc || !entry.req.expires || entry.doc.expiryKnown === true && entry.doc.expiryDays !== null)
    && (entry.status !== 'Uploaded' || uploadedWithoutExpiry(entry)));
  const met = required.filter((entry) => entry.doc && (['Valid', 'Verified', 'Pending Review', 'Expiring Soon'].includes(entry.status) || uploadedWithoutExpiry(entry))).length;
  const requiredMet = known ? met : null;
  const expiry = documentExpiryTotals([documents]);
  return {
    rows: entries,
    unavailableTypes: entries.filter((entry) => entry.status === '—').map((entry) => entry.req.type),
    summary: {
      requiredTotal: required.length, requiredMet, complete: known ? met === required.length : null,
      missing: known ? required.filter((entry) => entry.status === 'Missing').length : null,
      expired: expiry.expired, expiring: expiry.expiring,
    },
  };
}

export function documentExpiryTotals(collections) {
  if (collections.some((collection) => !Array.isArray(collection))) return { expiring: null, expired: null };
  const documents = collections.flat();
  if (documents.some((doc) => !doc.expiryKnown)) return { expiring: null, expired: null };
  return { expiring: documents.filter((doc) => doc.expiryDays !== null && doc.expiryDays >= 0 && doc.expiryDays <= 60).length,
    expired: documents.filter((doc) => doc.expiryDays !== null && doc.expiryDays < 0).length };
}

export const EMPTY_DOCUMENT_COMPANY = { name: '—', rcNumber: '—', verification: '—', director: { name: '—', role: '—', dob: '—' } };
export function documentCompanyView(user) {
  const director = user.companyProfile?.director;
  return { id: user.id, name: text(user.businessName) ?? '—', rcNumber: text(user.cacNumber) ?? '—',
    verification: label({ VERIFIED: 'Verified', IN_REVIEW: 'Pending Review', PENDING: 'Pending', REJECTED: 'Rejected' }, user.kycStatus) ?? '—',
    director: { name: text(director?.name) ?? '—', role: text(director?.role) ?? '—', dob: dateLabel(director?.dateOfBirth) } };
}

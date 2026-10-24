// Only documented company-facing DTOs belong here; screens consume view models.
import { VEHICLE_REQUIREMENTS } from '../../../domain/documents.js';

export const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
export const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : null;
export const rows = (value) => Array.isArray(value) && value.every(object) ? value : null;
export const number = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
export const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
export function safeUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
const instant = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) ? new Date(value) : null;
export function dateLabel(value) {
  let date = instant(value);
  if (!date && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const candidate = new Date(`${value}T00:00:00Z`);
    if (Number.isFinite(candidate.getTime()) && candidate.toISOString().slice(0, 10) === value) date = candidate;
  }
  return date ? new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }).format(date) : '—';
}
const boolean = (value) => typeof value === 'boolean' ? value : null;
const classes = { HEAD: 'Head', TRAILER: 'Trailer', TANKER: 'Tanker', SPECIALIZED: 'Specialized', OTHER: 'Other' };
export const vehicleClassToWire = (value) => Object.keys(classes).find((key) => classes[key] === value) ?? null;
const fuelLabel = (value) => ({ DIESEL: 'Diesel', PETROL: 'Petrol', CNG: 'CNG', LNG: 'LNG', ELECTRIC: 'Electric' })[value] ?? text(value) ?? '—';
const timestamp = (value) => instant(value) ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(instant(value)) : '—';
export const fleetDocumentTypes = {
  Registration: 'REGISTRATION', 'Road Worthiness': 'ROADWORTHINESS', Insurance: 'INSURANCE', Customs: 'CUSTOMS',
  'Vehicle Licence': 'VEHICLE_LICENCE', 'Hackney Permit': 'HACKNEY_PERMIT', 'Proof of Ownership': 'PROOF_OF_OWNERSHIP',
  Emission: 'EMISSION', 'Special Permit': 'SPECIAL_PERMIT', Safety: 'SAFETY', Other: 'OTHER',
};
export const fleetDocumentSupported = (type) => Object.hasOwn(fleetDocumentTypes, type);
const documentLabels = Object.fromEntries(Object.entries(fleetDocumentTypes).map(([label, type]) => [type, label]));
const ownershipLabels = { OWNED: 'Company Owned', LEASED: 'Leased', FINANCED: 'Hire Purchase / Financed' };
const specificationFields = {
  engineType: 'Engine Type', engineCapacity: 'Engine Capacity', transmission: 'Transmission', fuelType: 'Fuel Type',
  axleConfig: 'Axle Configuration', gvw: 'Gross Vehicle Weight', loadCapacity: 'Load Capacity', axles: 'Number of Axles',
  fuelTankCapacity: 'Fuel Tank Capacity', emissionStandard: 'Emission Standard', trailerCompatibility: 'Trailer Compatibility',
};

export const ownershipToWire = (value) => Object.keys(ownershipLabels).find((key) => ownershipLabels[key] === value) ?? null;
export function fleetSpecificationsBody(draft) {
  const fields = Object.entries(specificationFields).filter(([key]) => draft.vehicleClass !== 'Trailer' || ['axleConfig', 'gvw', 'loadCapacity', 'axles'].includes(key));
  return Object.fromEntries(fields.filter(([key]) => text(draft.specs?.[key])).map(([key, label]) => [label, draft.specs[key].trim()]));
}

export function fleetEditedSpecifications(source, draft, original) {
  const specifications = Object.fromEntries(Object.entries(object(source) ?? {}).filter(([, value]) => typeof value === 'string'));
  for (const [key, label] of Object.entries(specificationFields)) {
    if (draft.specs?.[key] === original.specs?.[key]) continue;
    delete specifications[key];
    delete specifications[label];
    if (text(draft.specs?.[key])) specifications[label] = draft.specs[key].trim();
  }
  return specifications;
}

export function fleetActivityView(entry) {
  return {
    id: text(entry.id) ?? text(entry.refId), title: text(entry.label) ?? '—', detail: text(entry.detail) ?? '—',
    time: timestamp(entry.at), occurredAt: instant(entry.at)?.getTime() ?? null,
    tone: entry.kind === 'MAINTENANCE' ? 'warning' : 'info',
  };
}

export function fleetDocumentCompliance(documents) {
  const known = Array.isArray(documents);
  const requirements = VEHICLE_REQUIREMENTS.map((req) => {
    const doc = known ? documents.find((item) => item.type === req.type) : undefined;
    return { req, doc, status: doc?.status ?? (known && fleetDocumentSupported(req.type) ? 'Missing' : '—') };
  });
  const required = requirements.filter(({ req }) => req.required);
  const statusesKnown = known && required.every(({ req, doc, status }) => !doc || ['Valid', 'Expiring Soon', 'Expired'].includes(status) || !req.expires && status === 'Uploaded');
  return { rows: requirements, summary: {
    missing: known ? required.filter(({ doc }) => !doc).length : '—',
    requiredTotal: required.length,
    requiredMet: statusesKnown ? required.filter(({ req, doc, status }) => doc && (['Valid', 'Expiring Soon'].includes(status) || !req.expires && status === 'Uploaded')).length : '—',
  } };
}
export function fleetDocumentView(source) {
  if (!text(source?.id)) return null;
  return {
    id: source.id, name: text(source.name) ?? text(source.fileName) ?? '—', type: documentLabels[source.type] ?? '—',
    url: safeUrl(source.url), expiryDate: dateLabel(source.expiryDate), uploadedOn: dateLabel(source.uploadedAt),
    status: ({ EXPIRED: 'Expired', EXPIRING_SOON: 'Expiring Soon', OK: 'Valid' })[source.expiryStatus] ?? (source.status === 'UPLOADED' ? 'Uploaded' : '—'),
  };
}

function fuelConsumptionLabel(source) {
  const value = number(source?.value), periodDays = count(source?.periodDays);
  if (value === null || source?.unit !== 'km/L' || periodDays === null || periodDays === 0) return '—';
  return value + ' km/L (' + periodDays + ' days)';
}

export function truckView(source, detail = false) {
  if (!text(source?.id)) return null;
  const driver = object(source.driver);
  const specs = object(source.specifications);
  const activity = detail ? rows(source.activity) : null;
  const roadWorthiness = detail ? rows(source.documents)?.find((doc) => doc.type === 'ROADWORTHINESS') : null;
  const vehicleClass = classes[source.vehicleClass] ?? '—';
  const status = source.availability === 'ON_TRIP' && source.status === 'ACTIVE' ? 'On Trip'
    : ({ PENDING_REVIEW: 'Pending Review', ACTIVE: 'Active', INACTIVE: 'Inactive', MAINTENANCE: 'In Maintenance', REJECTED: 'Rejected', APPROVED: 'Approved' })[source.status] ?? '—';
  return {
    editDraft: detail ? {
      plate: text(source.plateNumber) ?? '', make: text(source.make) ?? '', model: text(source.model) ?? '',
      year: text(source.year) ?? '', color: text(source.color) ?? '', vin: text(source.vin) ?? '', engineNumber: text(source.engineNumber) ?? '',
      vehicleClass: classes[source.vehicleClass] ?? '', ownership: ownershipLabels[source.ownership] ?? '',
      purchaseDate: dateLabel(source.purchaseDate) === '—' ? '' : source.purchaseDate.slice(0, 10),
      location: text(source.currentLocationNote?.location) ?? '', odometer: number(source.odometerKm) === null ? '' : String(source.odometerKm),
      notes: text(source.notes) ?? '',
      specs: Object.fromEntries(Object.entries(specificationFields).map(([key, label]) => [key, key === 'fuelType' ? (fuelLabel(source.fuelType ?? specs?.[label] ?? specs?.[key]) === '—' ? '' : fuelLabel(source.fuelType ?? specs?.[label] ?? specs?.[key])) : text(specs?.[label]) ?? text(specs?.[key]) ?? ''])),
    } : null,
    lastActive: timestamp(source.lastActivityAt),
    averageFuelConsumption: fuelConsumptionLabel(detail ? source.fuelConsumption : null),
    apiBacked: true, id: source.id, plate: text(source.plateNumber) ?? '—',
    status, wireStatus: text(source.status), onTrip: source.availability === 'ON_TRIP' || !!text(source.currentJob?.id),
    vehicleClass, type: [text(source.containerSize?.name ?? specs?.containerSize?.name), text(source.containerType?.name ?? specs?.containerType?.name)].filter(Boolean).join(' ') || text(source.truckType?.name ?? specs?.truckType?.name) || vehicleClass,
    make: text(source.make) ?? '—', model: text(source.model) ?? '—', makeModel: text(source.makeModel) ?? ([text(source.make), text(source.model)].filter(Boolean).join(' ') || '—'),
    year: text(source.year) ?? '—', vin: detail ? text(source.vin) ?? '—' : '—', engineNumber: detail ? text(source.engineNumber) ?? '—' : '—',
    purchaseDate: detail ? dateLabel(source.purchaseDate) : '—', color: text(source.color) ?? '—', ownership: detail ? ownershipLabels[source.ownership] ?? '—' : '—',
    insuranceExpiry: dateLabel(detail ? source.insuranceExpiry : source.insurance?.expiresAt), roadWorthinessExpiry: dateLabel(roadWorthiness?.expiryDate),
    odometer: number(detail ? source.odometerKm : source.mileageKm), odometerUpdated: detail ? timestamp(source.odometer?.updatedAt) : '—',
    location: detail ? text(source.currentLocationNote?.location) ?? '—' : '—', notes: detail ? text(source.notes) : null,
    notesAuthor: detail ? text(source.notesAuthorName) ?? '—' : '—', notesUpdated: detail ? timestamp(source.notesUpdatedAt) : '—',
    activityLog: activity?.map(fleetActivityView) ?? null,
    remindersEnabled: detail ? boolean(source.remindersEnabled) : null,
    driverId: text(driver?.id), driver: driver ? text(driver.name) ?? '—' : source.driver === null ? null : '—',
    driverKnown: source.driver === null || !!text(driver?.id),
    assignedDriver: driver ? { id: driver.id, name: text(driver.name) ?? '—', phone: text(driver.phone) ?? '—', rating: null, tripsCompleted: '—', licenseClass: '—', licenseNumber: '—', licenseExpiry: '—', status: '—', photo: safeUrl(driver.avatarUrl) } : null,
    specs: {
      ...Object.fromEntries(Object.entries(specificationFields).map(([key, label]) => [key, detail ? text(specs?.[label]) ?? text(specs?.[key]) ?? '—' : '—'])),
      fuelType: detail ? fuelLabel(source.fuelType ?? specs?.['Fuel Type'] ?? specs?.fuelType) : '—',
    },
    photos: Array.isArray(source.photos) ? source.photos.map(safeUrl).filter(Boolean).map((url) => ({ url, label: '—' })) : null,
  };
}

export function assignedFleetDriverView(source) {
  const rating = number(source.rating?.average);
  return {
    id: source.id, name: text(source.name) ?? '—', phone: text(source.phone) ?? '—', photo: safeUrl(source.avatarUrl),
    rating: rating !== null && rating <= 5 ? rating : null,
    tripsCompleted: count(source.stats?.completedTrips) ?? '—',
    licenseClass: text(source.license?.class) ?? '—', licenseNumber: text(source.license?.number) ?? '—',
    licenseExpiry: dateLabel(source.license?.expiresAt),
    status: ({ ACTIVE: 'Active', SUSPENDED: 'Suspended', INVITED: 'Invited', UNLINKED: 'Unlinked' })[source.status] ?? '—',
  };
}

export function driverView(source) {
  if (!text(source?.id)) return null;
  const rating = number(source.rating?.average);
  return {
    id: source.id, active: source.status === 'ACTIVE', name: text(source.name) ?? '—',
    phone: text(source.phone) ?? '—', photo: safeUrl(source.avatarUrl),
    kyc: source.kycStatus === 'VERIFIED' ? 'Verified' : text(source.kycStatus) ? 'KYC Pending' : '—',
    licenseClass: text(source.license?.class) ?? '—', licenseNumber: text(source.license?.number) ?? '—', licenseExpiry: dateLabel(source.license?.expiresAt),
    rating: rating !== null && rating <= 5 ? rating : null,
    tripsCompleted: count(source.completedTrips) ?? '—',
    status: ({ ACTIVE: 'Active', SUSPENDED: 'Suspended', INVITED: 'Invited', UNLINKED: 'Unlinked' })[source.status] ?? '—',
    onTrip: source.availability === 'ON_TRIP' || !!text(source.currentJob?.id),
    truckId: text(source.truck?.id), truckPlate: text(source.truck?.plateNumber),
  };
}

const maintenanceTypes = { PREVENTIVE: 'Preventive', REPAIR: 'Repair', INSPECTION: 'Inspection', BREAKDOWN: 'Breakdown' };
export const MAINTENANCE_SERVICE_TYPES = Object.values(maintenanceTypes);
export const maintenanceTypeToWire = (value) => Object.entries(maintenanceTypes).find(([wire, label]) => value === wire || value === label)?.[0] ?? null;
const maintenanceDateInput = (value) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return dateLabel(value) === '—' ? '' : value;
  const date = instant(value);
  if (!date) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Africa/Lagos' }).formatToParts(date);
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type).value).join('-');
};

export function maintenanceDueView(source) {
  if (!object(source) || !text(source.id)) return null;
  return { id: source.id, truckId: text(source.truckId), serviceType: maintenanceTypes[source.type] ?? '—', date: dateLabel(source.dueDate) };
}

export function maintenanceView(source) {
  if (!text(source?.id)) return null;
  const overdue = source.isOverdue === true || source.displayStatus === 'OVERDUE';
  return {
    id: source.id, reference: text(source.reference) ?? '—', truckId: text(source.truck?.id), truckPlate: text(source.truck?.plateNumber) ?? '—',
    wireStatus: text(source.status), status: overdue && ['REQUESTED', 'SCHEDULED', 'IN_PROGRESS'].includes(source.status) ? 'Overdue' : ({ REQUESTED: 'Requested', SCHEDULED: 'Upcoming', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled', REJECTED: 'Rejected' })[source.status] ?? '—',
    date: dateLabel(source.dueDate), dueAt: text(source.dueDate), dateInput: maintenanceDateInput(source.dueDate), serviceType: text(source.typeLabel) ?? maintenanceTypes[source.type] ?? '—', serviceCategory: maintenanceTypes[source.type] ?? '', description: text(source.description) ?? '—',
    canEdit: ['REQUESTED', 'SCHEDULED'].includes(source.status), canComplete: ['SCHEDULED', 'IN_PROGRESS'].includes(source.status),
    canStart: source.status === 'SCHEDULED', canCancel: ['REQUESTED', 'SCHEDULED'].includes(source.status),
    estimatedCost: source.currency === 'NGN' ? number(source.estimatedCost) : null,
    odometer: number(source.odometerKm), cost: source.currency === 'NGN' ? number(source.actualCost) : null,
    nextDue: dateLabel(source.nextDueDate),
  };
}

export function fleetTripView(source) {
  if (!text(source?.id)) return null;
  const earnings = object(source.money?.earnings);
  const releasedAmount = (payment) => !object(payment) || number(payment.amount) === null ? null : payment.paidAt === null ? 0 : instant(payment.paidAt) ? payment.amount : null;
  const mobilization = releasedAmount(earnings?.mobilization), final = releasedAmount(earnings?.final);
  const released = earnings?.currency === 'NGN' && earnings.serviceFee === 0 && mobilization !== null && final !== null ? mobilization + final : null;
  return {
    id: source.id, number: text(source.tripNumber) ?? '—',
    status: ({ DRIVER_ASSIGNED: 'Assigned', DRIVER_EN_ROUTE: 'Assigned', DRIVER_ARRIVED: 'Assigned', PICKUP_COMPLETED: 'Picked Up', IN_TRANSIT: 'In Transit', CARGO_ARRIVED: 'At Destination', DEMURRAGE_IN_PROGRESS: 'At Destination', OFFLOADING: 'At Destination', OFFLOAD_COMPLETED: 'At Destination', CONTAINER_RETURNED: 'At Destination', COMPLETED: 'Completed', CANCELLED: 'Cancelled', DISPUTED: 'Disputed' })[source.status] ?? '—',
    route: text(source.origin) && text(source.destination) ? `${source.origin.trim()} → ${source.destination.trim()}` : '—',
    cargoType: text(source.cargo?.description) ?? '—', pickupDate: dateLabel(source.pickupDate),
    budget: released,
    payments: released === null ? null : [earnings.mobilization, earnings.final].filter((payment) => instant(payment.paidAt)).map((payment) => ({ amount: payment.amount, paidAt: payment.paidAt })),
  };
}

export const total = (collection, field) => !Array.isArray(collection) || collection.some((row) => number(row[field]) === null) ? null : collection.reduce((sum, row) => sum + row[field], 0);

export function fleetEarningsSeries(trips) {
  if (!Array.isArray(trips) || trips.some((trip) => !Array.isArray(trip.payments))) return null;
  const monthKey = (date) => {
    const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: 'Africa/Lagos' }).formatToParts(date);
    return `${parts.find((part) => part.type === 'year').value}-${parts.find((part) => part.type === 'month').value}`;
  };
  const [year, month] = monthKey(new Date()).split('-').map(Number);
  const months = Array.from({ length: 6 }, (_, index) => new Date(Date.UTC(year, month - 6 + index, 1)));
  const keys = months.map(monthKey);
  const payments = trips.flatMap((trip) => trip.payments);
  return { labels: months.map((date) => new Intl.DateTimeFormat('en-NG', { month: 'short', timeZone: 'Africa/Lagos' }).format(date)), points: keys.map((key) => payments.filter((payment) => monthKey(new Date(payment.paidAt)) === key).reduce((sum, payment) => sum + payment.amount, 0)) };
}

export function fleetSummaryView(source) {
  const total = count(source?.total), active = count(source?.active), onTrip = count(source?.onTrip);
  const maintenance = count(source?.inMaintenance), inactive = count(source?.inactive);
  const available = active !== null && onTrip !== null && onTrip <= active ? active - onTrip : null;
  const categories = [
    { label: 'Active', value: available, color: 'var(--tk-success)' },
    { label: 'On Trip', value: onTrip, color: 'var(--tk-blue)' },
    { label: 'In Maintenance', value: maintenance, color: 'var(--tk-warning)' },
    { label: 'Inactive', value: inactive, color: 'var(--tk-danger)' },
  ];
  categories.forEach((item) => { item.display = item.value ?? '—'; item.percent = item.value !== null && total > 0 ? item.value / total * 100 : null; });
  return { total, active, maintenance, inactive, categories,
    chart: total !== null && categories.every((item) => item.value !== null) && categories.reduce((sum, item) => sum + item.value, 0) === total ? categories : [],
  };
}

export function fleetFuelView(source) {
  if (!text(source?.id)) return null;
  return { id: source.id, date: dateLabel(source.date), litres: number(source.litres), amount: number(source.amount),
    pricePerLitre: number(source.pricePerLitre), odometer: number(source.odometerKm), station: text(source.station) ?? '—', fuelType: fuelLabel(source.fuelType) };
}
export function fleetFuelLogsView(source) {
  const logs = rows(source?.fuelLogs)?.map(fleetFuelView);
  if (!logs || logs.some((row) => !row) || new Set(logs.map((row) => row.id)).size !== logs.length) return null;
  const summary = source.summary;
  return { logs, entries: count(summary?.entries), totalLitres: number(summary?.totalLitres),
    totalAmount: summary?.currency === 'NGN' ? number(summary.totalAmount) : null,
    averagePricePerLitre: summary?.currency === 'NGN' ? number(summary.averagePricePerLitre) : null,
    monthLitres: number(summary?.thisMonth?.litres), monthAmount: summary?.currency === 'NGN' ? number(summary.thisMonth?.amount) : null };
}

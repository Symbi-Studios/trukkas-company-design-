// Only documented company-facing DTOs belong here; screens consume view models.
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
const personName = (user) => [text(user?.firstName), text(user?.lastName)].filter(Boolean).join(' ') || '—';
const boolean = (value) => typeof value === 'boolean' ? value : null;
const classes = { HEAD: 'Head', TRAILER: 'Trailer', TANKER: 'Tanker', SPECIALIZED: 'Specialized', OTHER: 'Other' };
export const vehicleClassToWire = (value) => Object.keys(classes).find((key) => classes[key] === value) ?? null;
const fuelLabel = (value) => ({ DIESEL: 'Diesel', PETROL: 'Petrol', CNG: 'CNG', LNG: 'LNG', ELECTRIC: 'Electric' })[value] ?? text(value) ?? '—';
const timestamp = (value) => instant(value) ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(instant(value)) : '—';
export const fleetDocumentTypes = { Registration: 'REGISTRATION', 'Road Worthiness': 'ROADWORTHINESS', Insurance: 'INSURANCE', Customs: 'CUSTOMS' };
export const fleetDocumentSupported = (type) => Object.hasOwn(fleetDocumentTypes, type);
const documentLabels = { REGISTRATION: 'Registration', ROADWORTHINESS: 'Road Worthiness', INSURANCE: 'Insurance', CUSTOMS: 'Customs', VEHICLE_LICENCE: 'Vehicle Licence', HACKNEY_PERMIT: 'Hackney Permit', OTHER: 'Other' };
export function fleetDocumentView(source) {
  if (!text(source?.id)) return null;
  return {
    id: source.id, name: text(source.name) ?? text(source.fileName) ?? '—', type: documentLabels[source.type] ?? '—',
    url: safeUrl(source.url), expiryDate: dateLabel(source.expiryDate), uploadedOn: dateLabel(source.uploadedAt),
    status: ({ EXPIRED: 'Expired', EXPIRING_SOON: 'Expiring Soon', OK: 'Valid' })[source.expiryStatus] ?? (source.status === 'UPLOADED' ? 'Uploaded' : '—'),
  };
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
    apiBacked: true, id: source.id, plate: text(source.plateNumber) ?? '—',
    status, wireStatus: text(source.status), onTrip: source.availability === 'ON_TRIP' || !!text(source.currentJob?.id),
    vehicleClass, type: [text(source.containerSize?.name ?? specs?.containerSize?.name), text(source.containerType?.name ?? specs?.containerType?.name)].filter(Boolean).join(' ') || text(source.truckType?.name ?? specs?.truckType?.name) || vehicleClass,
    make: text(source.make) ?? '—', model: text(source.model) ?? '—', makeModel: text(source.makeModel) ?? ([text(source.make), text(source.model)].filter(Boolean).join(' ') || '—'),
    year: text(source.year) ?? '—', vin: detail ? text(source.vin) ?? '—' : '—', engineNumber: detail ? text(source.engineNumber) ?? '—' : '—',
    purchaseDate: '—', color: text(source.color) ?? '—', ownership: detail && source.ownership === 'OWNED' ? 'Company Owned' : '—',
    insuranceExpiry: dateLabel(detail ? source.insuranceExpiry : source.insurance?.expiresAt), roadWorthinessExpiry: dateLabel(roadWorthiness?.expiryDate),
    odometer: number(detail ? source.odometerKm : source.mileageKm), odometerUpdated: timestamp(detail ? source.lastActivityAt : source.location?.updatedAt),
    location: '—', notes: detail ? text(source.notes) : null,
    activityLog: activity?.map((entry) => ({ id: text(entry.id), title: text(entry.label) ?? '—', detail: '—', time: timestamp(entry.at), tone: entry.kind === 'MAINTENANCE' ? 'warning' : 'info' })) ?? null,
    remindersEnabled: detail ? boolean(source.remindersEnabled) : null,
    driverId: text(driver?.id), driver: driver ? text(driver.name) ?? '—' : source.driver === null ? null : '—',
    driverKnown: source.driver === null || !!text(driver?.id),
    assignedDriver: driver ? { id: driver.id, name: text(driver.name) ?? '—', phone: text(driver.phone) ?? '—', rating: null, tripsCompleted: '—', licenseClass: '—', licenseNumber: '—', licenseExpiry: '—', status: '—', photo: safeUrl(driver.avatarUrl) } : null,
    specs: { ...Object.fromEntries(['engineType', 'engineCapacity', 'transmission', 'fuelType', 'axleConfig', 'gvw', 'loadCapacity', 'axles', 'fuelTankCapacity', 'emissionStandard', 'trailerCompatibility'].map((key) => [key, '—'])), fuelType: detail ? fuelLabel(source.fuelType ?? specs?.fuelType) : '—' },
    photos: Array.isArray(source.photos) ? source.photos.map(safeUrl).filter(Boolean).map((url) => ({ url, label: '—' })) : null,
  };
}

export function driverView(source) {
  if (!text(source?.userId)) return null;
  return {
    id: source.userId, active: source.status === 'ACTIVE', name: personName(source.user),
    phone: text(source.user?.phone) ?? '—', photo: safeUrl(source.user?.avatarUrl),
    kyc: source.user?.kycStatus === 'VERIFIED' ? 'Verified' : text(source.user?.kycStatus) ? 'KYC Pending' : '—',
    licenseClass: '—', licenseNumber: '—', licenseExpiry: '—', rating: null, tripsCompleted: '—', status: '—',
    truckId: text(source.truck?.id), truckPlate: text(source.truck?.plateNumber),
  };
}

const maintenanceTypes = { PREVENTIVE: 'Preventive', REPAIR: 'Repair', INSPECTION: 'Inspection', BREAKDOWN: 'Breakdown' };
export const MAINTENANCE_SERVICE_TYPES = Object.values(maintenanceTypes);
export const maintenanceTypeToWire = (value) => Object.entries(maintenanceTypes).find(([wire, label]) => value === wire || value === label)?.[0] ?? null;
const maintenanceDateInput = (value) => dateLabel(value) === '—' ? '' : value.slice(0, 10);

export function maintenanceDueView(source) {
  if (!object(source) || !text(source.id)) return null;
  return { id: source.id, truckId: text(source.truckId), serviceType: maintenanceTypes[source.type] ?? '—', date: dateLabel(source.dueDate) };
}

export function maintenanceView(source) {
  if (!text(source?.id)) return null;
  const overdue = source.isOverdue === true || source.displayStatus === 'OVERDUE';
  return {
    id: source.id, truckId: text(source.truck?.id), truckPlate: text(source.truck?.plateNumber) ?? '—',
    wireStatus: text(source.status), status: overdue && ['REQUESTED', 'SCHEDULED', 'IN_PROGRESS'].includes(source.status) ? 'Overdue' : ({ REQUESTED: 'Requested', SCHEDULED: 'Upcoming', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled', REJECTED: 'Rejected' })[source.status] ?? '—',
    date: dateLabel(source.dueDate), dueAt: text(source.dueDate), dateInput: maintenanceDateInput(source.dueDate), serviceType: text(source.typeLabel) ?? maintenanceTypes[source.type] ?? '—', serviceCategory: maintenanceTypes[source.type] ?? '', description: text(source.description) ?? '—',
    canEdit: ['REQUESTED', 'SCHEDULED'].includes(source.status), canComplete: ['SCHEDULED', 'IN_PROGRESS'].includes(source.status),
    estimatedCost: source.currency === 'NGN' ? number(source.estimatedCost) : null,
    odometer: number(source.odometerKm), cost: source.currency === 'NGN' ? number(source.actualCost) : null,
    nextDue: '—',
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

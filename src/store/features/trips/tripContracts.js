// Keep wire formats here; screens use the existing trip/job view models.
export const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
export const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : null;
export const rows = (value) => Array.isArray(value) && value.every(object) ? value : null;
export const number = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
export const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
const boolean = (value) => typeof value === 'boolean' ? value : null;
const decimal = (value) => number(value) ?? (typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value)) ? Number(value) : null);

const stages = {
  DRIVER_ASSIGNED: 'Assigned', DRIVER_EN_ROUTE: 'Assigned', DRIVER_ARRIVED: 'Assigned',
  PICKUP_COMPLETED: 'Picked Up', IN_TRANSIT: 'In Transit', CARGO_ARRIVED: 'At Destination',
  OFFLOADING: 'At Destination', OFFLOAD_COMPLETED: 'At Destination', CONTAINER_RETURNED: 'At Destination',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled', DISPUTED: 'Disputed',
};
const movementTypes = { PORT_TO_DESTINATION: 'Port-to-Destination', PORT_TO_PORT: 'Port-to-Port', BULK_BREAK: 'Break-bulk', EXPORT: 'Export' };
const label = (value, values) => typeof value === 'string' && Object.hasOwn(values, value) ? values[value] : '—';
export const tripStatusLabel = (value) => label(value, stages);
const instant = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) ? new Date(value) : null;
const dateOnly = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
};
export function dateLabel(value) {
  const date = instant(value) ?? dateOnly(value);
  return date ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Africa/Lagos' }).format(date) : '—';
}
const timeLabel = (value) => instant(value) ? new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(instant(value)) : '—';
export const timestampLabel = (value) => instant(value) ? `${dateLabel(value)} · ${timeLabel(value)}` : '—';
export function safeUrl(value) {
  if (!text(value)) return null;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
export const coordinates = (place) => typeof place?.latitude === 'number' && Number.isFinite(place.latitude) && Math.abs(place.latitude) <= 90
  && typeof place?.longitude === 'number' && Number.isFinite(place.longitude) && Math.abs(place.longitude) <= 180 ? [place.latitude, place.longitude] : null;
const personName = (person) => [text(person?.firstName), text(person?.lastName)].filter(Boolean).join(' ') || '—';

function documentView(doc) {
  const bytes = number(doc.sizeBytes);
  return {
    id: text(doc.id), name: text(doc.fileName) ?? text(doc.type) ?? '—',
    url: safeUrl(doc.url), uploadedOn: dateLabel(doc.uploadedAt),
    size: bytes === null ? '—' : `${(bytes / 1024).toLocaleString('en-NG', { maximumFractionDigits: 1 })} KB`,
    status: ({ UPLOADED: 'Uploaded', APPROVED: 'Uploaded', PENDING: 'Pending', REJECTED: 'Rejected' })[doc.status] ?? '—',
    kind: doc.mimeType === 'application/pdf' ? 'pdf' : typeof doc.mimeType === 'string' && doc.mimeType.startsWith('image/') ? 'image' : null,
  };
}

function jobView(job, id) {
  const containers = rows(job?.containers);
  const tonnages = containers?.map((container) => decimal(container.goodsTonnage));
  return {
    apiBacked: true, id, number: text(job?.jobNumber) ?? '—',
    title: text(containers?.map((container) => [text(container.containerSize?.name), text(container.containerType?.name)].filter(Boolean).join(' ')).filter(Boolean).join(', ')) ?? '—',
    cargoType: text(job?.cargoDescription) ?? '—', category: '—',
    origin: text(job?.route?.origin?.address) ?? '—', destination: text(job?.route?.destination?.address) ?? '—',
    routeCoordinates: { origin: coordinates(job?.route?.origin), destination: coordinates(job?.route?.destination) },
    distanceKm: number(job?.feeBreakdown?.recommendedFare?.distanceKm),
    weightKg: tonnages?.length && tonnages.every((value) => value !== null) ? tonnages.reduce((sum, value) => sum + value * 1000, 0) : null,
    quantity: containers === null || containers === undefined ? '—' : containers.length,
    cargoValue: null, tripType: label(job?.movementType, movementTypes),
    specialInstructions: text(job?.specialInstructions) ?? '—',
    trucksRequired: null, documents: rows(job?.documents)?.map(documentView) ?? null,
  };
}

export function tripView(source, job = null) {
  if (!object(source) || !text(source.id)) return null;
  const status = label(source.status ?? job?.status, stages);
  const phase = status === 'Assigned' ? 'Upcoming' : ['Picked Up', 'In Transit', 'At Destination'].includes(status) ? 'Active'
    : ['Completed', 'Cancelled', 'Disputed'].includes(status) ? status : null;
  const jobId = text(source.jobId) ?? text(job?.id) ?? source.id; // The company API defines one trip per job.
  const progress = number(source.progress);
  const pickup = job?.tdoDate;
  const delivery = job?.estimatedDeliveryAt;
  const view = jobView(job, jobId);
  // The list documents these flat route, truck and driver labels. Detail-only
  // cargo fields come from the documented GET /jobs/{id} response, never fixtures.
  if (!job) {
    view.number = text(source.jobNumber) ?? text(source.tripNumber) ?? '—';
    view.origin = text(source.origin) ?? '—';
    view.destination = text(source.destination) ?? '—';
    view.tripType = label(source.movementType, movementTypes);
  }
  const earnings = object(source.money?.earnings);
  const timeline = rows(source.timeline);
  return {
    apiBacked: true, id: source.id, number: text(source.tripNumber) ?? text(source.jobNumber) ?? text(job?.jobNumber) ?? '—',
    jobId, job: view, wireStatus: text(source.status ?? job?.status), status, phase,
    open: phase === 'Active' || phase === 'Upcoming',
    pickupComplete: ['Picked Up', 'In Transit', 'At Destination', 'Completed'].includes(status) ? true : status === 'Assigned' ? false : null,
    delivered: status === 'Completed' ? true : phase === 'Active' || phase === 'Upcoming' ? false : null,
    delayed: boolean(source.attention?.delayed) ?? boolean(source.isDelayed),
    progress: progress !== null && progress <= 100 ? progress : null,
    truckId: text(job?.truck?.id), truckPlate: text(source.truckPlate) ?? text(job?.truck?.plateNumber) ?? '—',
    driverId: text(job?.driver?.id), driverName: text(source.driverName) ?? personName(job?.driver),
    driverAssigned: job?.driver === null || source.attention?.unassigned === true ? false : object(job?.driver) ? true : null,
    driverPhone: text(job?.driver?.phone) ?? '—', trailer: null, truck: job?.truck ? { makeModel: '—', status: '—' } : null,
    pickupDate: dateLabel(pickup), pickupTime: timeLabel(pickup), deliveryDate: dateLabel(delivery),
    pickupMonth: instant(pickup) || dateOnly(pickup) ? dateLabel(pickup).replace(/ \d+,/, '') : null,
    // No documented company detail schema establishes GPS, notes or cost fields.
    currentLocation: '—', lastUpdated: '—', speedKmh: null, liveCoordinates: null,
    stageDates: Object.fromEntries(Object.values(stages).map((stage) => [stage, '—'])),
    timeline: timeline?.map((event) => ({
      title: text(event.title) ?? '—', detail: text(event.detail) ?? '—',
      date: dateLabel(event.timestamp), time: timeLabel(event.timestamp),
      state: ['done', 'active', 'pending', 'cancelled'].includes(event.state) ? event.state : null,
      reference: text(event.reference), location: text(event.location), icon: 'circle',
    })) ?? null,
    documents: rows(source.documents)?.map(documentView) ?? null,
    notes: null, costs: null, messages: null,
    revenue: earnings?.currency === 'NGN' ? number(earnings.gross) : null,
  };
}

export function tripCollectionView(data) {
  const collection = rows(data?.trips);
  if (!collection || collection.some((trip) => !text(trip.id))) return null;
  return collection.map((trip) => tripView(trip));
}

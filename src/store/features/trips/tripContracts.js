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
  PICKUP_COMPLETED: 'Picked Up', IN_TRANSIT: 'In Transit', CARGO_ARRIVED: 'At Destination', DEMURRAGE_IN_PROGRESS: 'At Destination',
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
    id: text(doc.id), name: text(doc.name) ?? text(doc.fileName) ?? text(doc.type) ?? '—',
    url: safeUrl(doc.url), uploadedOn: dateLabel(doc.uploadedAt),
    size: bytes === null ? '—' : `${(bytes / 1024).toLocaleString('en-NG', { maximumFractionDigits: 1 })} KB`,
    status: ({ UPLOADED: 'Uploaded', APPROVED: 'Uploaded', PENDING: 'Pending', REJECTED: 'Rejected' })[doc.status] ?? '—',
    uploadable: false,
    kind: doc.mimeType === 'application/pdf' ? 'pdf' : typeof doc.mimeType === 'string' && doc.mimeType.startsWith('image/') ? 'image' : null,
  };
}

function proofOfDeliveryDocument(value) {
  const pod = object(value);
  if (!pod || (!text(pod.photoUrl) && !text(pod.submittedAt) && !text(pod.rejectedAt))) return null;
  return {
    id: 'trip-proof-of-delivery', name: 'Proof of Delivery', url: safeUrl(pod.photoUrl),
    uploadedOn: dateLabel(pod.submittedAt), size: '—', status: text(pod.rejectedAt) ? 'Rejected' : 'Uploaded',
    uploadable: false, kind: null,
  };
}

function forwarderDocuments(documents) {
  const source = object(documents);
  if (!source) return null;
  return [
    ['tdo', 'TDO'], ['exitNote', 'Exit Note'], ['gatePass', 'Gate Pass'],
  ].flatMap(([field, name]) => {
    const url = text(source[field]);
    return url ? [{ id: `forwarder-${field}`, name, url: safeUrl(url), uploadedOn: '—', size: '—', status: '—', kind: null }] : [];
  });
}

const costLabels = { FUEL: 'Fuel', TOLL: 'Tolls & Levies', DRIVER_ALLOWANCE: 'Driver Allowance', MAINTENANCE: 'Repairs', PORT_CHARGES: 'Port Charges', PARKING: 'Parking', OTHER: 'Other' };
const costLabel = (value) => label(value, costLabels);
const costWireValues = Object.fromEntries(Object.entries(costLabels).map(([value, labelText]) => [labelText, value]));
export const tripCostCategoryToWire = (value) => Object.hasOwn(costWireValues, value) ? costWireValues[value] : null;

function timelineStage(labelText) {
  const normalized = text(labelText)?.toLowerCase();
  return ({
    'job accepted': 'Assigned', 'pickup completed': 'Picked Up', 'in transit': 'In Transit',
    'cargo arrived': 'At Destination', 'offload completed': 'At Destination',
    'proof of delivery submitted': 'At Destination', 'container returned': 'At Destination', 'job completed': 'Completed',
  })[normalized] ?? null;
}

function dispatchView(source, jobId) {
  const dispatch = object(source);
  const required = count(dispatch?.trucksForThisJob), dispatched = count(dispatch?.dispatched), remaining = count(dispatch?.remaining);
  // One company job owes one truck, regardless of the forwarder's original request.
  if (required !== 1 || dispatched === null || remaining === null || dispatched + remaining !== required) return null;
  return { job: { id: jobId, title: text(dispatch.title) ?? '—' }, required, dispatched, remaining };
}

export function tripView(source, isDetail = false, jobDetails = null) {
  if (!object(source) || !text(source.id)) return null;
  const route = object(source.route);
  const cargo = object(source.cargo);
  const driver = source.driver === null && isDetail ? null : object(source.driver) ?? object(jobDetails?.driver);
  const truck = source.truck === null && isDetail ? null : object(source.truck) ?? object(jobDetails?.truck);
  const status = label(source.status, stages);
  const phase = status === 'Assigned' ? 'Upcoming' : ['Picked Up', 'In Transit', 'At Destination'].includes(status) ? 'Active'
    : ['Completed', 'Cancelled', 'Disputed'].includes(status) ? status : null;
  const jobId = text(source.jobId) ?? source.id; // The company API defines one trip per job.
  const progress = number(source.progress);
  const pickup = source.pickupDate ?? jobDetails?.tdoDate;
  const delivery = source.deliveryDueAt ?? jobDetails?.estimatedDeliveryAt;
  const containers = rows(cargo?.containers) ?? rows(jobDetails?.containers);
  const containerWeight = containers?.map((container) => decimal(container.tonnage) ?? decimal(container.goodsTonnage));
  const weightTonnes = decimal(cargo?.weightTonnes)
    ?? (containerWeight?.length && containerWeight.every((value) => value !== null) ? containerWeight.reduce((sum, value) => sum + value, 0) : null);
  const extraDocuments = isDetail ? rows(source.extraDocuments)?.map(documentView) ?? null : null;
  const podDocument = isDetail ? proofOfDeliveryDocument(source.pod) : null;
  const tripDocuments = extraDocuments === null ? null : [...(podDocument ? [podDocument] : []), ...extraDocuments];
  const listedForwarderDocuments = isDetail ? forwarderDocuments(source.documents) : null;
  const jobForwarderDocuments = isDetail ? rows(jobDetails?.documents)?.map(documentView) ?? null : null;
  const pod = isDetail ? object(source.pod) : null;
  const podSubmitted = pod && safeUrl(pod.photoUrl) && instant(pod.submittedAt) && !text(pod.rejectedAt) ? true
    : isDetail && (source.pod === null || pod && (text(pod.rejectedAt) || pod.photoUrl === null && pod.submittedAt === null)) ? false : null;
  const afterArrival = ['CARGO_ARRIVED', 'DEMURRAGE_IN_PROGRESS', 'OFFLOADING', 'OFFLOAD_COMPLETED', 'CONTAINER_RETURNED'].includes(source.status);
  const notes = isDetail ? rows(source.notes) : null;
  const costsPayload = isDetail ? object(source.costs) : null;
  const costs = rows(costsPayload?.items)?.map((item) => ({
    id: text(item.id), category: costLabel(item.category), description: text(item.description) ?? '—',
    date: dateLabel(item.createdAt), amount: item.currency === 'NGN' ? number(item.amount) : null,
  })) ?? null;
  const timeline = isDetail ? rows(source.timeline) : null;
  const stageDates = Object.fromEntries(['Assigned', 'Picked Up', 'In Transit', 'At Destination', 'Completed'].map((stage) => [stage, '—']));
  timeline?.forEach((event) => {
    const stage = timelineStage(event.label);
    const date = dateLabel(event.at);
    if (stage && stageDates[stage] === '—' && date !== '—') stageDates[stage] = date;
  });
  const mappedTimeline = timeline?.map((event) => ({
    title: text(event.label) ?? '—', detail: text(event.detail) ?? '—',
    date: dateLabel(event.at), time: timeLabel(event.at),
    state: ['pending', 'active', 'done', 'cancelled'].includes(event.state) ? event.state
      : event.state === undefined ? event.done === true ? 'done' : event.done === false ? 'pending' : null : null,
    reference: text(event.reference), location: text(event.location), icon: 'circle',
  })) ?? null;
  const location = isDetail ? object(source.location) : null;
  const locationNote = isDetail ? object(source.locationNote) : null;
  const revenue = number(isDetail ? source.money?.agreedPrice ?? source.agreedPrice : source.agreedPrice);
  const driverUnassigned = boolean(source.attention?.unassigned) ?? boolean(source.needsAssignment);
  const driverAssigned = isDetail && source.driver === null ? false : driver ? true : driverUnassigned === null ? null : !driverUnassigned;
  const numberValue = text(source.tripNumber) ?? '—';
  const title = containers?.map((container) => [text(container.size) ?? text(container.containerSize?.name), text(container.type) ?? text(container.containerType?.name)].filter(Boolean).join(' ')).filter(Boolean).join(', ');
  const coordinatesPayload = object(isDetail ? source.coordinates : null);
  const jobRoute = object(jobDetails?.route);
  const jobOrigin = object(jobRoute?.origin);
  const jobDestination = object(jobRoute?.destination);
  const forwarderDocs = jobForwarderDocuments?.length ? jobForwarderDocuments : listedForwarderDocuments ?? jobForwarderDocuments;
  const view = {
    apiBacked: true, id: jobId, number: text(source.tripNumber) ?? '—',
    title: text(title) ?? text(cargo?.type) ?? text(source.cargoType) ?? text(jobDetails?.cargoDescription) ?? '—',
    cargoType: text(cargo?.description) ?? text(cargo?.type) ?? text(source.cargoType) ?? text(jobDetails?.cargoDescription) ?? '—', category: label(cargo?.type ?? source.cargoType, { CONTAINER: 'Container', BULK_BREAK: 'Break-bulk' }),
    origin: text(source.origin) ?? text(route?.pickupAddress) ?? text(jobOrigin?.address) ?? '—',
    destination: text(source.destination) ?? text(route?.deliveryAddress) ?? text(jobDestination?.address) ?? '—',
    routeCoordinates: { origin: coordinates(coordinatesPayload?.pickup) ?? coordinates(jobOrigin), destination: coordinates(coordinatesPayload?.delivery) ?? coordinates(jobDestination) },
    distanceKm: number(source.distanceKm) ?? number(jobDetails?.feeBreakdown?.recommendedFare?.distanceKm),
    weightKg: weightTonnes === null ? null : weightTonnes * 1000,
    quantity: count(cargo?.containerCount) ?? (containers ? containers.length : '—'),
    cargoValue: null, // Declared cargo value and its currency are not captured by the API.
    tripType: label(source.movementType ?? jobDetails?.movementType, movementTypes),
    specialInstructions: text(source.specialInstructions) ?? text(jobDetails?.specialInstructions) ?? '—',
    trucksRequired: count(cargo?.trucksRequired), documents: forwarderDocs,
  };
  return {
    apiBacked: true, id: source.id, number: numberValue,
    jobId, job: view, dispatch: dispatchView(source.dispatch, jobId), wireStatus: text(source.status), status, phase,
    open: phase === 'Active' || phase === 'Upcoming',
    pickupComplete: ['Picked Up', 'In Transit', 'At Destination', 'Completed'].includes(status) ? true : status === 'Assigned' ? false : null,
    delivered: status === 'Completed' ? true : phase === 'Active' || phase === 'Upcoming' ? false : null,
    delayed: boolean(source.attention?.delayed) ?? boolean(source.isDelayed),
    progress: progress !== null && progress <= 100 ? progress : null,
    truckId: text(truck?.id), truckPlate: text(source.truckPlate) ?? text(truck?.plateNumber) ?? '—',
    driverId: text(driver?.id), driverName: text(source.driverName) ?? text(driver?.name) ?? personName(driver),
    driverAssigned, driverPhone: text(driver?.phone) ?? '—', trailer: null,
    driverPhoto: safeUrl(driver?.avatarUrl),
    truck: truck ? { makeModel: text(truck.makeModel) ?? text(truck.label) ?? '—', status: label(truck.status, { ACTIVE: 'Active', INACTIVE: 'Inactive', MAINTENANCE: 'In Maintenance', PENDING_REVIEW: 'Pending Review', REJECTED: 'Rejected' }) } : null,
    pickupDate: dateLabel(pickup), pickupTime: timeLabel(pickup), deliveryDate: dateLabel(delivery),
    pickupMonth: instant(pickup) || dateOnly(pickup) ? dateLabel(pickup).replace(/ \d+,/, '') : null,
    currentLocation: text(locationNote?.location) ?? '—', locationNoteUpdated: timestampLabel(locationNote?.updatedAt), lastUpdated: timestampLabel(location?.updatedAt), speedKmh: number(location?.speedKmH),
    routeDuration: isDetail && number(source.routeDurationMinutes) !== null ? source.routeDurationMinutes.toLocaleString('en-NG', { maximumFractionDigits: 1 }) + ' min' : null,
    liveCoordinates: location ? coordinates(location) : null,
    stageDates, timeline: mappedTimeline,
    documents: tripDocuments,
    notes: notes?.map((note) => ({ id: text(note.id), author: text(note.authorName) ?? '—', body: text(note.body) ?? '—', time: timestampLabel(note.createdAt) })) ?? null,
    costs, costTotal: costsPayload?.currency === 'NGN' ? number(costsPayload.total) : null,
    messages: null, revenue,
    cancellationRequested: boolean(source.cancellationRequested),
    podSubmitted,
    actions: {
      arrival: source.status === 'DRIVER_EN_ROUTE',
      pod: afterArrival && podSubmitted !== true,
      unlock: ['CARGO_ARRIVED', 'DEMURRAGE_IN_PROGRESS'].includes(source.status),
      offloadComplete: source.status === 'OFFLOADING',
      containerReturned: source.status === 'OFFLOAD_COMPLETED',
    },
  };
}

export function tripMessageViews(messages, driverId, driverName) {
  const collection = rows(messages);
  if (!collection) return null;
  return collection.map((message) => {
    const senderId = text(message.senderId);
    const isDriver = !!senderId && !!driverId && senderId === driverId;
    const isCompany = !!senderId && !!driverId && senderId !== driverId;
    return {
      id: text(message.id),
      author: isDriver ? text(driverName) ?? 'Driver' : isCompany ? 'You' : '—',
      role: isDriver ? 'Driver' : isCompany ? 'Company' : '—',
      time: timestampLabel(message.createdAt), body: text(message.content) ?? '—',
    };
  });
}

export function tripCollectionView(data) {
  const collection = rows(data?.trips);
  if (!collection || collection.some((trip) => !text(trip.id))) return null;
  return collection.map((trip) => tripView(trip));
}

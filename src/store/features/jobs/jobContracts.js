export const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
export const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : null;
export const rows = (value) => Array.isArray(value) && value.every(object) ? value : null;
export const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
export const number = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const decimal = (value) => number(value) ?? (typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value)) ? Number(value) : null);
const bool = (value) => typeof value === 'boolean' ? value : null;
const types = { PORT_TO_DESTINATION: 'Port-to-Destination', PORT_TO_PORT: 'Port-to-Port', BULK_BREAK: 'Break-bulk', EXPORT: 'Export' };
const statuses = { DOCUMENTS_VALIDATED: 'Pending', COMPLETED: 'Completed', CANCELLED: 'Cancelled', DISPUTED: 'Disputed', DRIVER_ASSIGNED: 'In Progress', DRIVER_EN_ROUTE: 'In Progress', DRIVER_ARRIVED: 'In Progress', PICKUP_COMPLETED: 'In Progress', IN_TRANSIT: 'In Progress', CARGO_ARRIVED: 'In Progress', DEMURRAGE_IN_PROGRESS: 'In Progress', OFFLOADING: 'In Progress', OFFLOAD_COMPLETED: 'In Progress', CONTAINER_RETURNED: 'In Progress' };
const label = (value, labels) => typeof value === 'string' && Object.hasOwn(labels, value) ? labels[value] : '—';
const instant = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) ? new Date(value) : null;
export function dateLabel(value) {
  let date = instant(value);
  if (!date && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const candidate = new Date(`${value}T00:00:00Z`);
    if (Number.isFinite(candidate.getTime()) && candidate.toISOString().slice(0, 10) === value) date = candidate;
  }
  return date ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Africa/Lagos' }).format(date) : '—';
}
const stamp = (value) => instant(value) ? `${dateLabel(value)} · ${new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(instant(value))}` : '—';
export function safeUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
const coordinates = (place) => typeof place?.latitude === 'number' && Number.isFinite(place.latitude) && Math.abs(place.latitude) <= 90 && typeof place?.longitude === 'number' && Number.isFinite(place.longitude) && Math.abs(place.longitude) <= 180 ? [place.latitude, place.longitude] : null;
export const emptyPoster = { name: '—', verified: null, rating: null, jobsPosted: null };

export function bidView(bid) {
  if (!text(bid?.id)) return null;
  return { id: bid.id, amount: decimal(bid.amount), message: text(bid.message), submittedAt: stamp(bid.createdAt), expiresAt: text(bid.expiresAt), canWithdraw: bool(bid.actions?.canWithdraw), status: text(bid.status) };
}

export function jobView(value, context = 'detail', bid = null) {
  const job = object(value);
  if (!text(job?.id)) return null;
  const forwarder = object(job.forwarder);
  const terms = object(job.terms);
  const requirements = object(terms?.requirements);
  const forwarderTerms = object(terms?.forwarder);
  const rating = number(forwarderTerms?.rating);
  const bidRange = terms && Object.hasOwn(terms, 'bidRange') ? object(terms.bidRange) : null;
  const cargoDescription = text(job.cargoDescription) ?? text(requirements?.cargoDescription);
  const instructions = text(requirements?.specialInstructions) ?? text(job.specialInstructions);
  const listedFare = decimal(job.baseDelivery) ?? (terms?.payment?.currency === 'NGN' ? decimal(terms.payment.listedFare) : null) ?? (context === 'bid' ? decimal(job.listedPrice) : null);
  const containers = rows(job.containers);
  const tonnages = containers?.map((item) => decimal(item.goodsTonnage));
  const tons = decimal(job.totalWeight) ?? decimal(job.bulkWeight) ?? (tonnages?.length && tonnages.every((v) => v !== null) ? tonnages.reduce((a, b) => a + b, 0) : null);
  const equipment = containers?.map((item) => [text(item.containerSize?.name), text(item.containerType?.name)].filter(Boolean).join(' ')).filter(Boolean);
  const ownBids = rows(job.bids);
  const pending = bid ?? ownBids?.find((item) => item.status === 'PENDING' && instant(item.expiresAt) && Date.parse(item.expiresAt) > Date.now());
  const myBid = pending ? bidView(pending) : null;
  const route = typeof job.route === 'string' ? job.route.split(' → ') : null;
  const origin = text(job.route?.origin?.address) ?? (route?.length === 2 ? text(route[0]) : null)
    ?? (context === 'bid' ? text(job.origin) : context === 'assigned' ? text(job.port) : null);
  const destination = text(job.route?.destination?.address) ?? (route?.length === 2 ? text(route[1]) : null)
    ?? (context === 'bid' ? text(job.destination) : context === 'assigned' ? text(job.deliveryAddress) : null);
  const category = label(job.cargoType ?? requirements?.cargoType, { CONTAINER: 'Container', BULK_BREAK: 'Break-bulk' });
  // General Cargo is the documented alias for non-containerised cargo. Both
  // existing tabs address BULK_BREAK without creating duplicate job records.
  const categories = category === 'Break-bulk' ? ['Break-bulk', 'General Cargo'] : category === 'Container' ? ['Container'] : null;
  const requirementItems = requirements ? [
    category === '—' ? null : category,
    text(requirements.cargoDescription), text(requirements.specialInstructions),
    count(requirements.trucksRequired) === null ? null : `${requirements.trucksRequired} truck${requirements.trucksRequired === 1 ? '' : 's'} required`,
    ...(equipment ?? []),
  ].filter(Boolean) : null;
  const docs = rows(job.documents);
  const mapped = {
    apiBacked: true, id: job.id, number: text(job.jobNumber) ?? '—', wireStatus: text(job.status),
    title: cargoDescription ?? '—', cargoDescription: cargoDescription ?? '—',
    jobType: label(job.movementType ?? (context === 'bid' ? job.jobType : null), types),
    status: job.status === 'DOCUMENTS_VALIDATED' && myBid ? 'Quoted' : label(job.status, statuses),
    origin: origin ?? '—', destination: destination ?? '—', routeCoordinates: { origin: coordinates(job.route?.origin), destination: coordinates(job.route?.destination) },
    category, categories, cargoType: cargoDescription ?? category, equipment: equipment?.length ? equipment.join(', ') : '—',
    quantity: containers ? containers.length : '—', weightKg: tons === null ? null : tons * 1000,
    pickupDate: dateLabel(terms?.pickupDate ?? job.tdoDate), deliveryDate: dateLabel(terms?.deliveryDate), tripType: label(terms?.tripType, types), insurance: '—', paymentTerms: text(terms?.payment?.structure) ?? '—',
    cargoValue: null, budget: listedFare,
    contractValue: decimal(job.agreedPrice) ?? myBid?.amount ?? listedFare,
    trucksRequired: count(requirements?.trucksRequired) ?? count(job.requiredTrucks), negotiable: bool(terms?.negotiable), saved: bool(job.saved),
    postedOn: stamp(job.createdAt ?? (context === 'bid' ? job.requestedAt : null)), postedAgo: null, closesInDays: null,
    distanceKm: number(job.feeBreakdown?.recommendedFare?.distanceKm),
    requirements: requirementItems?.length ? [...new Set(requirementItems)] : null, specialNotes: instructions ? [instructions] : null,
    documents: docs?.map((doc) => ({ id: text(doc.id), name: text(doc.fileName) ?? text(doc.type) ?? '—', url: safeUrl(doc.url), size: number(doc.sizeBytes) === null ? '—' : `${(doc.sizeBytes / 1024).toLocaleString('en-NG', { maximumFractionDigits: 1 })} KB` })) ?? null,
    cargoPhotoUrl: safeUrl(job.cargoPhotoUrl), photos: safeUrl(job.cargoPhotoUrl) ? 1 : null, myBid,
    bidBounds: terms && Object.hasOwn(terms, 'bidRange') ? [decimal(bidRange?.min), decimal(bidRange?.max)] : [decimal(job.bounds?.minAmount), decimal(job.bounds?.maxAmount)],
    bidSlots: { used: count(job.myBidSlots?.used), remaining: count(job.myBidSlots?.remaining), max: count(job.myBidSlots?.max) },
    contactId: text(forwarder?.id),
    poster: { ...emptyPoster, id: text(forwarder?.id), name: text(forwarder?.businessName) ?? text(forwarder?.name) ?? ([text(forwarder?.firstName), text(forwarder?.lastName)].filter(Boolean).join(' ') || '—'), verified: bool(forwarderTerms?.verified) ?? bool(forwarder?.verified), rating: rating !== null && rating <= 5 ? rating : null, ratingCount: count(forwarderTerms?.ratingCount), jobsCompleted: count(forwarderTerms?.jobsCompleted) },
    truckId: text(job.truck?.id), driverId: text(job.driver?.id), truckPlate: text(job.truck?.plateNumber) ?? '—',
  };
  mapped.dispatch = { required: 1, dispatched: job.driver === null ? 0 : object(job.driver) ? 1 : null, completed: job.status === 'COMPLETED' ? 1 : ['In Progress', 'Cancelled'].includes(mapped.status) ? 0 : null, remaining: job.status === 'DRIVER_ASSIGNED' && job.driver === null ? 1 : object(job.driver) ? 0 : null };
  mapped.canDispatch = job.status === 'DRIVER_ASSIGNED' && job.driver === null;
  mapped.canBid = job.status === 'DOCUMENTS_VALIDATED' && !myBid && mapped.bidSlots.remaining !== 0;
  return mapped;
}

export function lifetimeEarningsView(source) {
  const lifetime = object(source?.lifetime);
  return { netEarned: lifetime?.currency === 'NGN' ? number(lifetime.netEarned) : null, unpaidEarnings: lifetime?.currency === 'NGN' ? number(lifetime.unpaidEarnings) : null };
}

export function jobReviewView(source) {
  const rating = number(source?.score);
  if (!text(source?.id) || rating === null || rating < 1 || rating > 5) return null;
  return { id: source.id, rating, comment: text(source.comment), date: dateLabel(source.createdAt), poster: '—' };
}

export function earningsView(source, job) {
  const earnings = object(source?.money?.earnings);
  if (!earnings || earnings.currency !== 'NGN') return null;
  const gross = number(earnings.gross), fee = number(earnings.serviceFee), net = number(earnings.net);
  const releasedAmount = (payment) => !object(payment) || number(payment.amount) === null ? null : payment.paidAt === null ? 0 : instant(payment.paidAt) ? payment.amount : null;
  const mobilization = releasedAmount(earnings.mobilization), final = releasedAmount(earnings.final);
  const released = fee === 0 && mobilization !== null && final !== null ? mobilization + final : null;
  return { totals: { gross, fee, net }, released, rows: [{ trip: { id: job.id, number: job.number, truckPlate: job.truckPlate, deliveryDate: '—' }, gross, payout: { status: text(earnings.payoutStatus) ?? '—' } }], status: text(earnings.payoutStatus), complete: gross !== null && fee !== null && net !== null };
}

export function paperworkView(source) {
  const documents = rows(source?.extraDocuments);
  if (!documents) return null;
  return documents.map((doc) => ({
    id: text(doc.id), tripId: source.id,
    name: text(doc.name) ?? text(doc.fileName) ?? '—',
    url: safeUrl(doc.url), truckPlate: text(source.truck?.plateNumber) ?? text(source.truckPlate) ?? '—',
    uploadedOn: dateLabel(doc.uploadedAt), status: doc.status === 'UPLOADED' ? 'Uploaded' : '—',
  }));
}

export function receiptView(job, earnings, company) {
  if (!earnings?.complete) return null;
  return { kind: 'Job Earnings Statement', number: job.number, status: earnings.status ?? '—', issuedOn: dateLabel(new Date().toISOString()), company: { name: company?.companyName ?? '—' }, meta: [['Job ID', job.number], ['Job', job.title], ['Route', `${job.origin} → ${job.destination}`], ['Forwarder', job.poster.name], ['Status', earnings.status ?? '—']], lines: [{ description: job.title, detail: `${job.number} · ${job.truckPlate}`, amount: earnings.totals.gross }], totals: [{ label: 'Gross earnings', amount: earnings.totals.gross }, { label: 'Trukkas service fee', amount: -earnings.totals.fee }, { label: 'Net earnings', amount: earnings.totals.net, strong: true }] };
}

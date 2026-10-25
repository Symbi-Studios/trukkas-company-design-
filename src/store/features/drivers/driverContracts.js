import { count, dateLabel, number, object, rows, safeUrl, text, timestampLabel, tripView } from '../trips/tripContracts.js';
import { reviewView } from '../reviews/reviewContracts.js';

const availabilityLabels = { ON_TRIP: 'On Trip', AVAILABLE: 'Available', OFF_DUTY: 'Off Duty', NO_TRUCK: 'Unassigned', UNAVAILABLE: 'Unavailable' };
const percent = (value) => number(value) !== null && value <= 100 ? value : null;

export function companyDriverView(source) {
  if (!text(source?.id)) return null;
  const rating = number(source.rating?.average), license = object(source.license);
  return {
    apiBacked: true, id: source.id, name: text(source.name) ?? '—',
    email: text(source.email) ?? '—', phone: text(source.phone) ?? '—', photo: safeUrl(source.avatarUrl),
    active: source.status === 'ACTIVE' ? true : ['UNLINKED', 'INVITED', 'SUSPENDED'].includes(source.status) ? false : null,
    truckId: text(source.truck?.id), truckPlate: text(source.truck?.plateNumber), truckKnown: source.truck === null || !!text(source.truck?.id),
    kyc: ({ VERIFIED: 'Verified', PENDING: 'Pending', IN_REVIEW: 'Pending', REJECTED: 'Rejected' })[source.kycStatus] ?? '—',
    status: availabilityLabels[source.availability] ?? '—', joined: '—', address: '—',
    licenseNumber: text(license?.number) ?? '—', licenseClass: text(license?.class) ?? '—', licenseExpiry: dateLabel(license?.expiresAt),
    rating: rating !== null && rating <= 5 ? rating : null,
    reviewCount: count(source.rating?.count) ?? '—', tripsCompleted: count(source.completedTrips) ?? '—',
  };
}

export function companyDriverDetailView(source) {
  const driver = companyDriverView(source);
  if (!driver) return null;
  const recent = rows(source.recentTrips);
  const onTrip = recent?.some((trip) => tripView(trip)?.open === true);
  const licenseUrl = safeUrl(source.license?.url);
  return {
    ...driver,
    status: availabilityLabels[source.availability] ?? (onTrip ? 'On Trip' : source.truck === null ? 'Unassigned' : '—'),
    joined: dateLabel(source.joinedAt), address: text(source.address) ?? '—',
    tripsCompleted: count(source.stats?.completedTrips) ?? '—',
    onTimeRate: source.performance?.windowDays === 90 ? percent(source.performance.onTimePercent) : null,
    incidents: source.performance?.windowDays === 90 ? count(source.performance.incidentCount) : null,
    // No platform safety scoring exists; preserve the unavailable value.
    safetyScore: null,
    documents: licenseUrl ? [{ type: "Driver's License", name: "Driver's Licence", number: driver.licenseNumber, expiryDate: driver.licenseExpiry, uploadedOn: '—', status: '—', url: licenseUrl }] : [],
  };
}

export function driverSummaryView(source) {
  return { total: count(source?.total), available: count(source?.available), onTrip: count(source?.onTrip), offDuty: count(source?.offDuty) };
}

export function driverTripView(source, detail = false) {
  const trip = tripView(source, detail);
  if (!trip) return null;
  const events = rows(source.timeline);
  const activity = events?.flatMap((event) => event.done === true && timestampLabel(event.at) !== '—' ? [{
    title: text(event.label) ?? '—', description: `${trip.number} · ${trip.truckPlate}`, time: timestampLabel(event.at), at: event.at, tone: 'success',
  }] : []) ?? [];
  const earnings = object(source.money?.earnings);
  return { ...trip, job: { ...trip.job, title: text(source.cargo?.description) ?? text(source.cargo?.type) ?? '—' },
    // Trip value is not a confirmed earnings amount; use the earnings block.
    revenue: earnings?.currency === 'NGN' ? number(earnings.net) : null,
    distanceKm: number(source.distanceKm), activity,
  };
}

export function driverReviewsView(collection) {
  // GET company/reviews documents a company-wide summary. Calculate this
  // driver's summary from every page filtered by driverId instead.
  const scores = collection.map((review) => Number.isInteger(review.score) && review.score >= 1 && review.score <= 5 ? review.score : null);
  const validScores = scores.every((score) => score !== null);
  const total = collection.length;
  const average = validScores && total ? scores.reduce((sum, score) => sum + score, 0) / total : null;
  return {
    rating: average, reviewCount: total,
    reviews: collection.map((review) => {
      const view = reviewView(review);
      return { ...view, jobNumber: view.jobId, jobId: view.apiJobId };
    }),
    breakdown: [5, 4, 3, 2, 1].map((stars) => {
      const value = validScores ? scores.filter((score) => score === stars).length : null;
      return { stars, count: value ?? '—', pct: value !== null && total > 0 ? value / total * 100 : 0 };
    }),
  };
}

export { count, object, rows, text };

export function driverInvitationTime(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
}

export function driverInvitationView(source) {
  if (!text(source?.id)) return null;
  const status = ['PENDING', 'REDEEMED', 'EXPIRED', 'CANCELLED'].includes(source.status) ? source.status : null;
  return {
    id: source.id, status, statusLabel: ({ PENDING: 'Pending', REDEEMED: 'Joined', EXPIRED: 'Expired', CANCELLED: 'Cancelled' })[status] ?? '—',
    driverId: text(source.driver?.id), name: text(source.driver?.name) ?? '—', photo: safeUrl(source.driver?.avatarUrl),
    created: timestampLabel(source.createdAt), expires: timestampLabel(source.expiresAt),
    expiresAt: driverInvitationTime(source.expiresAt), redeemed: timestampLabel(source.redeemedAt),
  };
}

export function unlinkedDriverView(source) {
  if (!text(source?.id)) return null;
  const invitation = object(source.invitation);
  const expiry = driverInvitationTime(invitation?.expiresAt);
  const rating = number(source.rating?.average);
  return {
    id: source.id, name: text(source.name) ?? '—', photo: safeUrl(source.avatarUrl),
    email: text(source.maskedEmail) ?? '—', phone: text(source.maskedPhone) ?? '—',
    verified: source.verified === true && source.identityStatus === 'VERIFIED' ? true : source.verified === false ? false : null,
    licenseClass: text(source.licence?.class) ?? '—', licenseExpiry: dateLabel(source.licence?.expiresAt),
    tripsCompleted: count(source.completedTrips) ?? '—', rating: rating !== null && rating <= 5 ? rating : null,
    invitationKnown: source.invitation === null || !!text(invitation?.id) && invitation.status === 'PENDING' && expiry !== null,
    invitation: text(invitation?.id) ? { id: invitation.id, status: invitation.status === 'PENDING' ? 'PENDING' : null, expiresAt: expiry } : null,
  };
}

import { count, dateLabel, number, object, rows, safeUrl, text, timestampLabel, tripView } from '../trips/tripContracts.js';
import { reviewView } from '../reviews/reviewContracts.js';

// The list wrapper remains undocumented. Membership supplies the complete
// collection; the documented company detail DTO supplies profile fields.
export function companyDriverView(source) {
  if (!text(source?.userId) || source.user?.id !== source.userId) return null;
  return {
    apiBacked: true, id: source.userId,
    name: [text(source.user.firstName), text(source.user.lastName)].filter(Boolean).join(' ') || '—',
    email: text(source.user.email) ?? '—', phone: text(source.user.phone) ?? '—', photo: safeUrl(source.user.avatarUrl),
    active: source.status === 'ACTIVE' ? true : ['UNLINKED', 'INVITED', 'SUSPENDED'].includes(source.status) ? false : null, truckId: text(source.truck?.id), truckPlate: text(source.truck?.plateNumber),
    truckKnown: source.truck === null || !!text(source.truck?.id),
    kyc: ({ VERIFIED: 'Verified', PENDING: 'Pending', REJECTED: 'Rejected' })[source.user.kycStatus] ?? '—',
    status: '—', joined: '—', address: '—', licenseNumber: '—', licenseClass: '—', licenseExpiry: '—',
    rating: null, reviewCount: '—', tripsCompleted: '—',
  };
}

export function companyDriverDetailView(source) {
  if (!text(source?.id)) return null;
  const rating = number(source.rating?.average), license = object(source.license);
  const recent = rows(source.recentTrips);
  const onTrip = recent?.some((trip) => tripView(trip)?.open === true);
  const licenseUrl = safeUrl(license?.url);
  return {
    apiBacked: true, id: source.id, name: text(source.name) ?? '—',
    email: text(source.email) ?? '—', phone: text(source.phone) ?? '—', photo: safeUrl(source.avatarUrl),
    active: source.status === 'ACTIVE' ? true : ['UNLINKED', 'INVITED', 'SUSPENDED'].includes(source.status) ? false : null,
    truckId: text(source.truck?.id), truckPlate: text(source.truck?.plateNumber), truckKnown: source.truck === null || !!text(source.truck?.id),
    kyc: ({ VERIFIED: 'Verified', PENDING: 'Pending', REJECTED: 'Rejected' })[source.kycStatus] ?? '—',
    status: onTrip ? 'On Trip' : '—', joined: dateLabel(source.joinedAt), address: '—',
    licenseNumber: text(license?.number) ?? '—', licenseClass: text(license?.class) ?? '—', licenseExpiry: dateLabel(license?.expiresAt),
    rating: rating !== null && rating >= 1 && rating <= 5 ? rating : null,
    reviewCount: count(source.rating?.count) ?? '—', tripsCompleted: count(source.stats?.completedTrips) ?? '—',
    documents: licenseUrl ? [{ type: "Driver's License", name: "Driver's Licence", number: text(license?.number) ?? '—', expiryDate: dateLabel(license?.expiresAt), uploadedOn: '—', status: '—', url: licenseUrl }] : [],
  };
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

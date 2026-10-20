import { count, object, rows, safeUrl, text, tripView } from '../trips/tripContracts.js';
import { reviewView } from '../reviews/reviewContracts.js';

// The command-center driver endpoints do not publish response fields yet.
// Use only the documented company membership response from dashboard/drivers.
export function companyDriverView(source) {
  if (!text(source?.userId) || source.user?.id !== source.userId) return null;
  return {
    apiBacked: true, id: source.userId,
    name: [text(source.user.firstName), text(source.user.lastName)].filter(Boolean).join(' ') || '—',
    email: text(source.user.email) ?? '—', phone: text(source.user.phone) ?? '—', photo: safeUrl(source.user.avatarUrl),
    active: source.status === 'ACTIVE', truckId: text(source.truck?.id), truckPlate: text(source.truck?.plateNumber),
    truckKnown: source.truck === null || !!text(source.truck?.id),
    kyc: ({ VERIFIED: 'Verified', PENDING: 'Pending', REJECTED: 'Rejected' })[source.user.kycStatus] ?? '—',
    status: '—', joined: '—', address: '—', licenseNumber: '—', licenseClass: '—', licenseExpiry: '—',
    rating: null, reviewCount: '—', tripsCompleted: '—',
  };
}

export function driverTripView(source) {
  const trip = tripView(source);
  if (!trip) return null;
  return { ...trip, job: { ...trip.job, title: text(source.cargo?.description) ?? text(source.cargo?.type) ?? '—' } };
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

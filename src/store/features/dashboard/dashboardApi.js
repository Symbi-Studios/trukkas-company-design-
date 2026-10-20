import { baseApi, unwrapApiResponseData } from '../../api/baseApi.js';
import { reviewSummaryView } from '../reviews/reviewContracts.js';

const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const number = (value) => typeof value === 'number' && Number.isFinite(value) ? value : null;
const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
const boolean = (value) => typeof value === 'boolean' ? value : null;
const money = (value, currency) => number(value) !== null && currency === 'NGN'
  ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value) : '—';
const date = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(new Date(value)) : '—';
const fleetCategories = [
  ['active', 'Active', 'var(--tk-success)'], ['onTrip', 'On Trip', 'var(--tk-blue)'],
  ['inMaintenance', 'In Maintenance', 'var(--tk-warning)'], ['inactive', 'Inactive', 'var(--tk-danger)'],
];
const activityColors = {
  JOB_UPDATED: 'var(--tk-blue)', PAYMENT_RECEIVED: 'var(--tk-success)',
  REVIEW_RECEIVED: 'var(--tk-purple)', DOCUMENT_REVIEWED: 'var(--tk-warning)',
};
const rows = (value) => Array.isArray(value) && value.every((row) => row && typeof row === 'object' && !Array.isArray(row)) ? value : null;
const place = (value) => text(text(value)?.split(',')[0]) ?? '—';
const jobTypes = {
  PORT_TO_DESTINATION: 'Port-to-Destination', PORT_TO_PORT: 'Port-to-Port',
  BULK_BREAK: 'Break-bulk', EXPORT: 'Export',
};
const requestedDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(value)) : '—';

function overviewView(response) {
  const overview = unwrapApiResponseData(response)?.overview;
  const dashboard = overview?.dashboard;
  const totalTrucks = count(dashboard?.totalTrucks);
  const fleetStatus = fleetCategories.map(([key, label, color]) => {
    const value = count(dashboard?.fleetStatus?.[key]);
    return { label, color, value, display: value ?? '—', percent: value !== null && totalTrucks > 0 ? value / totalTrucks * 100 : null };
  });
  // The screen has four fleet categories. Do not normalize a partial fleet
  // into a full circle when pending-review trucks or missing counts remain.
  const fleetComplete = totalTrucks !== null && fleetStatus.every((item) => item.value !== null)
    && fleetStatus.reduce((sum, item) => sum + item.value, 0) === totalTrucks;
  const setup = dashboard?.setup;
  const email = boolean(setup?.emailVerified);
  const phone = boolean(setup?.phoneVerified);
  const submitted = count(setup?.requiredDocumentsSubmitted);
  const required = count(setup?.requiredDocumentsTotal);
  const documentsKnown = submitted !== null && required !== null && submitted <= required;
  const expiring = count(dashboard?.documentAlerts?.expiring);
  const expired = count(dashboard?.documentAlerts?.expired);
  const activity = rows(dashboard?.recentActivity);
  return {
    availableTrucks: count(dashboard?.availableTrucks), trucksOnTrip: count(dashboard?.trucksOnTrip), totalTrucks,
    maintenanceDue: count(dashboard?.maintenanceDue), activeDrivers: count(dashboard?.activeDrivers),
    pendingJobRequests: count(dashboard?.pendingJobRequests), activeJobs: count(dashboard?.activeJobs),
    walletBalance: money(dashboard?.walletBalance, dashboard?.currency), pendingPayout: money(dashboard?.pendingPayout, dashboard?.currency),
    fleetStatus, fleetChartData: fleetComplete ? fleetStatus : [],
    expiringDocs: expiring !== null && expired !== null ? expiring + expired : null,
    activityFeed: activity?.map((item) => ({
      id: text(item.id), text: text(item.description) ?? '—', time: date(item.createdAt),
      tone: typeof item.eventType === 'string' && Object.hasOwn(activityColors, item.eventType) ? activityColors[item.eventType] : 'var(--tk-ink-300)',
    })) ?? null,
    setup: {
      contact: email === false || phone === false ? false : email === true && phone === true ? true : null,
      documents: documentsKnown ? submitted === required : null,
      documentHint: documentsKnown ? `${submitted}/${required} required uploaded` : '—',
      truck: totalTrucks === null ? null : totalTrucks > 0,
      driver: count(overview?.drivers?.total) === null ? null : overview.drivers.total > 0,
      pin: boolean(setup?.transactionPinSet), twoFactor: boolean(setup?.twoFactorEnabled),
      twoFactorAvailable: boolean(setup?.twoFactorAvailable),
    },
  };
}

export const EMPTY_DASHBOARD = overviewView(null);
export const EMPTY_EARNINGS = { earningsThisMonth: '—', change: '—', monthlyTrend: null };

export const dashboardApi = baseApi.enhanceEndpoints({ addTagTypes: ['CompanyDashboard'] }).injectEndpoints({
  endpoints: (builder) => ({
    getCompanyDashboard: builder.query({
      query: () => '/company/overview',
      transformResponse: overviewView,
      providesTags: ['CompanyDashboard', 'AuthOnboardingDocuments', 'AuthOnboardingSecurity'],
    }),
    getDashboardPendingJobs: builder.query({
      query: () => ({ url: '/company/bids', params: { tab: 'active', page: 1, limit: 5 } }),
      transformResponse(response) {
        const data = unwrapApiResponseData(response);
        const bids = rows(data?.bids);
        return {
          total: count(data?.pagination?.total),
          jobs: bids?.map((bid) => ({
            bidId: text(bid.id), id: text(bid.job?.id), number: text(bid.job?.jobNumber) ?? '—',
            origin: place(bid.job?.origin), destination: place(bid.job?.destination),
            jobType: typeof bid.job?.jobType === 'string' && Object.hasOwn(jobTypes, bid.job.jobType) ? jobTypes[bid.job.jobType] : '—',
            requirement: text(bid.job?.requirement) ?? '—', postedOn: requestedDate(bid.job?.requestedAt),
          })) ?? null,
        };
      },
      providesTags: ['CompanyDashboard'],
    }),
    getDashboardActiveTrips: builder.query({
      query: () => ({ url: '/company/trips', params: { group: 'ACTIVE', page: 1, limit: 5 } }),
      transformResponse(response) {
        const data = unwrapApiResponseData(response);
        const trips = rows(data?.trips);
        return { total: count(data?.counts?.active), trips: trips?.map((trip) => {
          const delayed = boolean(trip.attention?.delayed);
          const status = text(trip.status);
          const label = status && /^[A-Z]+(?:_[A-Z]+)*$/.test(status)
            ? status.toLowerCase().split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ') : '—';
          return {
            id: text(trip.id), number: text(trip.tripNumber) ?? '—',
            origin: place(trip.origin), destination: place(trip.destination),
            truckPlate: text(trip.truckPlate) ?? '—',
            driverName: text(trip.driverName) ?? (trip.attention?.unassigned === true ? 'Unassigned' : '—'),
            status: delayed === true ? 'Delayed' : label,
            tone: delayed === true ? 'danger' : status === null ? 'neutral' : 'info',
          };
        }) ?? null };
      },
      providesTags: ['CompanyDashboard'],
    }),
    getDashboardEarnings: builder.query({
      query: () => ({ url: '/company/earnings', params: { period: '12m' } }),
      transformResponse(response) {
        const monthly = unwrapApiResponseData(response)?.monthly;
        const change = number(monthly?.changePercent);
        const series = rows(monthly?.series);
        const validSeries = monthly?.currency === 'NGN' && series !== null && series.every((item) =>
          typeof item.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(item.month)
          && number(item.earnings) !== null && item.earnings >= 0 && number(item.expenses) !== null && item.expenses >= 0);
        return {
          earningsThisMonth: money(monthly?.currentMonth?.earnings, monthly?.currency),
          change: change === null ? '—' : `${change < 0 ? '↓' : '↑'} ${Math.abs(change)}% vs last month`,
          monthlyTrend: validSeries ? series.map((item) => ({
            month: new Intl.DateTimeFormat('en-NG', { month: 'short', timeZone: 'Africa/Lagos' }).format(new Date(`${item.month}-15T12:00:00Z`)),
            earnings: item.earnings, expenses: item.expenses,
          })) : null,
        };
      },
      providesTags: ['CompanyDashboard'],
    }),
    getDashboardRating: builder.query({
      query: () => ({ url: '/company/reviews', params: { page: 1, limit: 1, sort: 'newest' } }),
      transformResponse(response) {
        // Keep average, count, monthly change and distribution in the same
        // company-and-linked-drivers scope as the existing reviews screen.
        return reviewSummaryView(unwrapApiResponseData(response)?.summary);
      },
      providesTags: ['CompanyDashboard'],
    }),
  }),
});

export const {
  useGetCompanyDashboardQuery, useGetDashboardPendingJobsQuery, useGetDashboardActiveTripsQuery, useGetDashboardEarningsQuery, useGetDashboardRatingQuery,
} = dashboardApi;

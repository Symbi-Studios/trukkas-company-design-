import { count, dateLabel, number, rows, text } from '../jobs/jobContracts.js';

export function reviewSummaryView(source) {
  const total = count(source?.count);
  const distribution = rows(source?.distribution);
  const validDistribution = source?.distributionType === 'COUNT' && distribution?.length === 5
    && new Set(distribution.map((item) => item.score)).size === 5
    && distribution.every((item) => Number.isInteger(item.score) && item.score >= 1 && item.score <= 5 && count(item.count) !== null)
    && total !== null && distribution.reduce((sum, item) => sum + item.count, 0) === total;
  const average = number(source?.average);
  const trend = source?.changeVsLastMonth;
  return {
    average: average !== null && average >= 1 && average <= 5 ? average : null,
    total,
    trendVsLastMonth: typeof trend === 'number' && Number.isFinite(trend) && Math.abs(trend) <= 4 ? trend : null,
    breakdown: Object.fromEntries([5, 4, 3, 2, 1].map((score) => [score,
      validDistribution && total > 0 ? Math.round(distribution.find((item) => item.score === score).count / total * 1000) / 10 : null,
    ])),
  };
}

export const EMPTY_REVIEW_SUMMARY = reviewSummaryView(null);

export function reviewView(source) {
  return {
    id: source.id,
    rating: Number.isInteger(source.score) && source.score >= 1 && source.score <= 5 ? source.score : null,
    comment: text(source.comment) ?? '—',
    poster: text(source.reviewer?.name) ?? '—',
    date: dateLabel(source.createdAt),
    jobId: text(source.job?.jobNumber) ?? '—',
    apiJobId: text(source.jobId) ?? text(source.job?.id),
    // A COMPANY review names the company, not an associated driver.
    driverName: source.reviewed?.type === 'DRIVER' ? text(source.reviewed.name) ?? '—' : '—',
  };
}

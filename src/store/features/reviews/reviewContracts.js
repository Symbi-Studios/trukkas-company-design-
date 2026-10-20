import { count, dateLabel, number, rows, safeUrl, text } from '../jobs/jobContracts.js';

const rating = (value) => number(value) !== null && value >= 1 && value <= 5 ? value : null;

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
    subscores: { punctuality: rating(source?.punctuality), communication: rating(source?.communication), professionalism: rating(source?.professionalism) },
    topTags: rows(source?.topTags)?.map((item) => ({ tag: text(item.tag), count: count(item.count) })).filter((item) => item.tag) ?? null,
  };
}

export const EMPTY_REVIEW_SUMMARY = reviewSummaryView(null);

export function reviewView(source) {
  const score = number(source.score);
  return {
    id: source.id,
    rating: score !== null && score >= 1 && score <= 5 ? score : null,
    comment: text(source.comment) ?? '—',
    poster: text(source.reviewer?.name) ?? '—',
    posterPhoto: safeUrl(source.reviewer?.avatarUrl),
    replyKnown: source.reply === null || !!text(source.reply?.text),
    reply: text(source.reply?.text) ? { text: source.reply.text.trim(), date: dateLabel(source.reply.repliedAt) } : null,
    tags: Array.isArray(source.tags) && source.tags.every((tag) => !!text(tag)) ? [...new Set(source.tags.map((tag) => tag.trim()))] : null,
    subscores: { punctuality: rating(source.punctuality), communication: rating(source.communication), professionalism: rating(source.professionalism) },
    date: dateLabel(source.createdAt),
    jobId: text(source.job?.jobNumber) ?? '—',
    apiJobId: text(source.jobId) ?? text(source.job?.id),
    // Company reviews can name the driver who handled the job separately
    // from the company being reviewed. Never use the company name as a driver.
    driverName: text(source.driver?.name) ?? (source.reviewed?.type === 'DRIVER' ? text(source.reviewed.name) : null) ?? '—',
  };
}

'use client';

import { useState } from 'react';
import { Avatar, Card, EmptyState, Icon, PageHeader, ProgressBar, SkeletonRow } from '../ds.js';
import { useGetCompanyReviewsQuery } from '../store/features/reviews/reviewsApi.js';
import { EMPTY_REVIEW_SUMMARY } from '../store/features/reviews/reviewContracts.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { useTopBarSearch } from '../pageSearch.js';

function Stars({ rating }) {
  return (
    <span style={{ display: 'flex', gap: 2 }} aria-label={rating == null ? '—' : `${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => <Icon key={n} name="star" filled size={14} color={rating != null && n <= Math.round(rating) ? 'var(--tk-warning)' : 'var(--tk-line-strong)'} />)}
    </span>
  );
}

export function RatingsReviews() {
  const { currentData: data, error, isLoading } = useGetCompanyReviewsQuery(undefined, { refetchOnMountOrArgChange: true });
  const summary = !error && data ? data.summary : EMPTY_REVIEW_SUMMARY;
  const reviews = !error ? data?.reviews ?? [] : [];
  const [query, setQuery] = useState('');
  useTopBarSearch(setQuery);
  const q = query.trim().toLowerCase();
  const visible = reviews.filter((r) => !q || [r.poster, r.jobId, r.driverName, r.comment].some((v) => String(v || '').toLowerCase().includes(q)));

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader title="Ratings & Reviews" description="See how forwarders and exporters rate your trips." />
      <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0,1fr)', gap: 'var(--tk-grid-gap)', alignItems: 'start' }}>
        <Card style={{ display: 'grid', gap: 16, textAlign: 'center' }}>
          <span style={{ font: '700 44px/1 var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{summary.average?.toFixed(1) ?? '—'}</span>
          <span style={{ justifySelf: 'center' }}><Stars rating={summary.average} /></span>
          <span className="tk-meta">Based on {summary.total ?? '—'} reviews</span>
          <span style={{ font: '600 13px/18px var(--tk-font-sans)', color: 'var(--tk-success)' }}>{summary.trendVsLastMonth == null ? '—' : `${summary.trendVsLastMonth < 0 ? '↓' : '↑'} ${Math.abs(summary.trendVsLastMonth)} from last month`}</span>
          <div style={{ display: 'grid', gap: 10, textAlign: 'left', marginTop: 8 }}>
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 34px', gap: 10, alignItems: 'center' }}>
                <span className="tk-meta" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>{stars} <Icon name="star" filled size={11} color="var(--tk-warning)" /></span>
                <ProgressBar value={summary.breakdown[stars] ?? 0} color="var(--tk-warning)" height={8} />
                <span className="tk-meta">{summary.breakdown[stars] == null ? '—' : `${summary.breakdown[stars]}%`}</span>
              </div>
            ))}
          </div>
        </Card>
        <div style={{ display: 'grid', gap: 12 }}>
          {isLoading ? <Card><SkeletonRow columns={3} /></Card> : error ? <Card><EmptyState icon="star" title={getApiErrorMessage(error)} /></Card> : visible.length === 0 && <Card><EmptyState icon="star" title="No reviews match your search" /></Card>}
          {visible.map((r) => (
            <Card key={r.id} style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Avatar name={r.poster} size={32} />
                  <span>
                    <strong style={{ display: 'block' }}>{r.poster}</strong>
                    <span className="tk-meta">{r.jobId} · Driver: {r.driverName}</span>
                  </span>
                </div>
                <span className="tk-meta">{r.date}</span>
              </div>
              <Stars rating={r.rating} />
              <p style={{ margin: 0, font: '400 13px/20px var(--tk-font-sans)', color: 'var(--tk-ink-500)' }}>{r.comment}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

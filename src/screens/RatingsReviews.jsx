'use client';

import { Avatar, Card, Icon, PageHeader, ProgressBar } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';

function Stars({ rating }) {
  return (
    <span style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => <Icon key={n} name="star" size={14} color={n <= rating ? 'var(--tk-warning)' : 'var(--tk-line-strong)'} />)}
    </span>
  );
}

export function RatingsReviews() {
  const summary = useCollection('reviewSummary')?.[0];
  const reviews = useCollection('reviews') || [];
  if (!summary) return null;

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader title="Ratings & Reviews" description="See how forwarders and exporters rate your trips." />
      <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0,1fr)', gap: 'var(--tk-grid-gap)', alignItems: 'start' }}>
        <Card style={{ display: 'grid', gap: 16, textAlign: 'center' }}>
          <span style={{ font: '700 44px/1 var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{summary.average.toFixed(1)}</span>
          <Stars rating={Math.round(summary.average)} />
          <span className="tk-meta">Based on {summary.total} reviews</span>
          {Number.isFinite(summary.trendVsLastMonth) && (
            <span style={{ font: '600 13px/18px var(--tk-font-sans)', color: 'var(--tk-success)' }}>↑ {summary.trendVsLastMonth} from last month</span>
          )}
          <div style={{ display: 'grid', gap: 10, textAlign: 'left', marginTop: 8 }}>
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 34px', gap: 10, alignItems: 'center' }}>
                <span className="tk-meta">{stars} ★</span>
                <ProgressBar value={summary.breakdown[stars]} color="var(--tk-warning)" height={8} />
                <span className="tk-meta">{summary.breakdown[stars]}%</span>
              </div>
            ))}
          </div>
        </Card>
        <div style={{ display: 'grid', gap: 12 }}>
          {reviews.map((r) => (
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

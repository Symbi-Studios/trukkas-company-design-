'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '../router.js';
import { Badge, Button, Card, EmptyState, Icon, PageHeader, SkeletonRow } from '../ds.js';
import { useGetMyFeedbackQuery } from '../store/features/feedback/feedbackApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { Toast, useToast } from '../components/Toast.jsx';
import { SendFeedbackDialog } from './SendFeedbackDialog.jsx';
import styles from './Feedback.module.css';

const STATUS_TONE = { Received: 'info', 'In progress': 'warning', Resolved: 'success', Closed: 'neutral' };
const day = (at) => (at == null ? '—' : new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }));

/** /support/feedback: what this account has told us about Trukkas, and where each item stands. */
export function Feedback() {
  const { data, error, isLoading, refetch } = useGetMyFeedbackQuery(undefined, { refetchOnMountOrArgChange: true });
  const params = useSearchParams();
  const [sending, setSending] = useState(false);
  useEffect(() => { if (params.get('send') === '1') setSending(true); }, [params]);
  const [openId, setOpenId] = useState(null);
  const [toast, showToast] = useToast();
  const items = data ?? [];

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader title="Your feedback" description="Ideas, problems and praise you’ve sent the Trukkas team."
        actions={<Button icon="message-square-plus" onClick={() => setSending(true)}>Send feedback</Button>} />
      <Card pad="none">
        {isLoading ? <SkeletonRow columns={3} /> : error ? (
          <EmptyState icon="cloud-off" title="Couldn’t load your feedback" description={getApiErrorMessage(error)} action={<Button variant="outline" onClick={refetch}>Try again</Button>} />
        ) : items.length === 0 ? (
          <EmptyState icon="message-square-heart" title="You haven’t sent any feedback yet"
            description="Tell us what’s working and what isn’t. Replies from our team show up in your notifications."
            action={<Button onClick={() => setSending(true)}>Send feedback</Button>} />
        ) : (
          <ul className={styles.list}>
            {items.map((item) => {
              const expanded = openId === item.id;
              return (
                <li key={item.id} className={styles.item}>
                  <button type="button" className={styles.itemButton} aria-expanded={expanded} onClick={() => setOpenId(expanded ? null : item.id)}>
                    <span className={styles.itemTitle}>{item.title}</span>
                    <span className={styles.itemStatus}><Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge></span>
                    <span className={styles.itemMeta}>{[item.type, item.topic, `Sent ${day(item.submittedAt)}`].filter(Boolean).join(' · ')}</span>
                  </button>
                  {expanded && <>
                    {item.body && <p className={styles.itemBody}>{item.body}</p>}
                    <p className={styles.itemNote}><Icon name="bell" size={14} aria-hidden="true" />
                      {item.statusCode === 'RESOLVED' ? `Resolved ${day(item.resolvedAt)}. Any reply from our team is in your notifications.` : 'When our team replies, you’ll get a notification.'}
                    </p>
                  </>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <p className="tk-meta" style={{ margin: 0 }}>Need help with a job, payment or your account? <Link to="/support/new">Contact support</Link>.</p>
      {sending && <SendFeedbackDialog onClose={() => setSending(false)} onSent={() => showToast('Thanks, your feedback was sent.')} />}
      <Toast message={toast} />
    </div>
  );
}

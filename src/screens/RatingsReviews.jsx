'use client';

import { useId, useRef, useState } from 'react';
import { Avatar, Button, Card, EmptyState, Icon, Modal, PageHeader, ProgressBar, SkeletonRow, Tag, Textarea } from '../ds.js';
import { useGetCompanyReviewsQuery, useSaveCompanyReviewReplyMutation, useDeleteCompanyReviewReplyMutation, useLazyExportCompanyReviewsQuery } from '../store/features/reviews/reviewsApi.js';
import { EMPTY_REVIEW_SUMMARY } from '../store/features/reviews/reviewContracts.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { useTopBarSearch } from '../pageSearch.js';
import { Toast, useToast } from '../components/Toast.jsx';
import styles from './RatingsReviews.module.css';

const scoreLabels = { punctuality: 'Punctuality', communication: 'Communication', professionalism: 'Professionalism' };
const scoreText = (value) => typeof value === 'number' ? `${value.toFixed(1)} / 5` : '—';
const feedbackTagStyle = { whiteSpace: 'normal', height: 'auto', minHeight: 'var(--tk-h-tag)', lineHeight: '16px', padding: '3px 7px' };

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
  const [dialog, setDialog] = useState(null);
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState('');
  const [exportError, setExportError] = useState('');
  const [saveReply, { isLoading: saving }] = useSaveCompanyReviewReplyMutation();
  const [deleteReply, { isLoading: deleting }] = useDeleteCompanyReviewReplyMutation();
  const [exportReviews, { isFetching: exporting }] = useLazyExportCompanyReviewsQuery();
  const [toast, showToast] = useToast();
  const acting = useRef(false);
  const downloading = useRef(false);
  const replyFormId = useId();
  const busy = saving || deleting;
  useTopBarSearch(setQuery);
  const q = query.trim().toLowerCase();
  const visible = reviews.filter((r) => !q || [r.poster, r.jobId, r.driverName, r.comment, r.reply?.text].some((v) => String(v || '').toLowerCase().includes(q)));

  function openReply(review, mode = 'reply') {
    if (acting.current || downloading.current || !review.replyKnown) return;
    setDialog({ review, mode }); setReply(review.reply?.text ?? ''); setReplyError('');
  }
  function closeDialog() {
    if (!acting.current) { setDialog(null); setReplyError(''); }
  }
  async function submitReply(event) {
    event?.preventDefault();
    if (!dialog || acting.current || downloading.current) return;
    acting.current = true; setReplyError('');
    try {
      const args = { id: dialog.review.id, expectedReply: dialog.review.reply?.text ?? null };
      if (dialog.mode === 'delete') await deleteReply(args).unwrap();
      else await saveReply({ ...args, reply }).unwrap();
      setDialog(null); showToast(dialog.mode === 'delete' ? 'Reply deleted.' : dialog.review.reply ? 'Reply updated.' : 'Reply posted.');
    } catch (err) { setReplyError(getApiErrorMessage(err)); }
    finally { acting.current = false; }
  }
  async function download() {
    if (downloading.current || acting.current || dialog) return;
    downloading.current = true; setExportError('');
    let url;
    try {
      const file = await exportReviews().unwrap();
      url = URL.createObjectURL(new Blob([file.content], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'ratings-reviews.csv'; document.body.appendChild(link); link.click(); link.remove();
    } catch (err) { setExportError(getApiErrorMessage(err)); }
    finally { downloading.current = false; if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }

  return (
    <div className={styles.page}>
      <PageHeader title="Ratings & Reviews" description="See how forwarders and exporters rate your trips."
        actions={<Button variant="outline" icon="download" disabled={exporting || busy || !!dialog || isLoading || !!error || !data} onClick={download}>{exporting ? 'Exporting…' : 'Export All Reviews'}</Button>} />
      {exportError && <p role="alert" className={styles.error}>{exportError}</p>}
      <div className={styles.layout}>
        <Card className={styles.summary}>
          <span style={{ font: '700 44px/1 var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{summary.average?.toFixed(1) ?? '—'}</span>
          <span style={{ justifySelf: 'center' }}><Stars rating={summary.average} /></span>
          <span className="tk-meta">Based on {summary.total ?? '—'} reviews</span>
          <span className="tk-meta">Company and linked drivers</span>
          <span style={{ font: '600 13px/18px var(--tk-font-sans)', color: summary.trendVsLastMonth == null ? 'var(--tk-ink-400)' : summary.trendVsLastMonth < 0 ? 'var(--tk-danger)' : 'var(--tk-success)' }}>{summary.trendVsLastMonth == null ? '—' : `${summary.trendVsLastMonth < 0 ? '↓' : '↑'} ${Math.abs(summary.trendVsLastMonth)} from last month`}</span>
          <div style={{ display: 'grid', gap: 10, textAlign: 'left', marginTop: 8 }}>
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 34px', gap: 10, alignItems: 'center' }}>
                <span className="tk-meta" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>{stars} <Icon name="star" filled size={11} color="var(--tk-warning)" /></span>
                <ProgressBar value={summary.breakdown[stars] ?? 0} color="var(--tk-warning)" height={8} />
                <span className="tk-meta">{summary.breakdown[stars] == null ? '—' : `${summary.breakdown[stars]}%`}</span>
              </div>
            ))}
          </div>
          <div className={styles.scores}>
            {Object.entries(scoreLabels).map(([key, label]) => <div className={styles.score} key={key}><span>{label}</span><strong>{scoreText(summary.subscores?.[key])}</strong></div>)}
          </div>
          <div className={styles.tags}>
            <span className={styles.tagsTitle}>Common feedback</span>
            {summary.topTags == null ? <span className="tk-meta">—</span> : summary.topTags.length === 0 ? <span className="tk-meta">No feedback tags yet.</span> : summary.topTags.map((tag, index) => <Tag key={`${tag.tag}:${index}`} tone="blue" style={feedbackTagStyle}>{tag.tag} · {tag.count ?? '—'}</Tag>)}
          </div>
        </Card>
        <div className={styles.reviews}>
          {isLoading ? <Card><SkeletonRow columns={3} /></Card> : error ? <Card><EmptyState icon="star" title={getApiErrorMessage(error)} /></Card> : visible.length === 0 && <Card><EmptyState icon="star" title="No reviews match your search" /></Card>}
          {visible.map((r) => (
            <Card key={r.id} style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                  <Avatar name={r.poster} src={r.posterPhoto || undefined} size={32} />
                  <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                    <strong style={{ display: 'block' }}>{r.poster}</strong>
                    <span className="tk-meta">{r.jobId} · Driver: {r.driverName}</span>
                  </span>
                </div>
                <span className="tk-meta">{r.date}</span>
              </div>
              <Stars rating={r.rating} />
              <p className={styles.comment}>{r.comment}</p>
              {r.tags?.length > 0 && <div className={styles.tags}>{r.tags.map((tag) => <Tag key={tag} style={feedbackTagStyle}>{tag}</Tag>)}</div>}
              {r.reply ? (
                <div className={styles.reply}>
                  <div className={styles.replyHead}><span className={styles.replyTitle}>Your company’s reply</span><span className="tk-meta">{r.reply.date}</span></div>
                  <p className={styles.comment}>{r.reply.text}</p>
                  <div className={styles.replyActions}>
                    <Button size="sm" variant="ghost" disabled={busy || exporting} onClick={() => openReply(r)}>Edit Reply</Button>
                    <Button size="sm" variant="ghost" disabled={busy || exporting} onClick={() => openReply(r, 'delete')}>Delete Reply</Button>
                  </div>
                </div>
              ) : r.replyKnown ? <div className={styles.replyActions}><Button size="sm" variant="outline" icon="message-square" disabled={busy || exporting} onClick={() => openReply(r)}>Reply to Review</Button></div>
                : <span className="tk-meta">Company reply: —</span>}
            </Card>
          ))}
        </div>
      </div>
      <Modal open={!!dialog} onClose={closeDialog} width={520}
        title={dialog?.mode === 'delete' ? 'Delete Reply' : dialog?.review.reply ? 'Edit Reply' : 'Reply to Review'}
        description={dialog?.mode === 'delete' ? 'Remove your public reply to this review.' : 'Your reply will be public.'}
        footer={<><Button variant="outline" disabled={busy} onClick={closeDialog}>Cancel</Button>{dialog?.mode === 'delete'
          ? <Button variant="danger" disabled={busy} onClick={() => submitReply()}>{deleting ? 'Deleting…' : 'Delete Reply'}</Button>
          : <Button type="submit" form={replyFormId} disabled={busy || !reply.trim() || reply.length > 1000 || reply.trim() === dialog?.review.reply?.text}>{saving ? 'Saving…' : dialog?.review.reply ? 'Save Changes' : 'Post Reply'}</Button>}</>}>
        {dialog && <>
          <div className={styles.context}><strong className={styles.replyTitle}>{dialog.review.poster}</strong><span className="tk-meta">{dialog.review.jobId}</span><Stars rating={dialog.review.rating} /><p className={styles.comment}>{dialog.review.comment}</p></div>
          {dialog.mode === 'delete' ? <div className={styles.reply}><p className={styles.comment}>{dialog.review.reply?.text ?? '—'}</p></div>
            : <form id={replyFormId} onSubmit={submitReply}><Textarea label="Public Reply" autoFocus rows={5} maxLength={1000} value={reply} disabled={busy} onChange={(event) => setReply(event.target.value)} /></form>}
          {replyError && <p role="alert" className={styles.error} style={{ marginTop: 12 }}>{replyError}</p>}
        </>}
      </Modal>
      <Toast message={toast} />
    </div>
  );
}

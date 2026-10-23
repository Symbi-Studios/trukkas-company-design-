'use client';

import { useState } from 'react';
import { Link, useNavigate, useParams } from '../router.js';
import { Button, Card, Icon, PageHeader, SkeletonRow } from '../ds.js';
import { useSearchParams } from 'next/navigation';
import { useGetSupportGuideQuery, useVoteSupportGuideMutation } from '../store/features/support/supportApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { supportGuideHref } from '../domain/supportLinks.js';
import { StillNeedHelp } from './HelpGuides.jsx';
import styles from './Guides.module.css';

export function GuideDetailFromQuery() {
  const params = useSearchParams();
  const ids = params.getAll('guideId');
  const id = ids.length === 1 ? ids[0].trim() : '';
  return <GuideDetail key={id} guideId={id} />;
}

export function GuideDetail({ guideId: explicitId }) {
  const { guideId: routeId } = useParams();
  const guideId = explicitId ?? routeId;
  const navigate = useNavigate();
  const { currentData: guide, error, isFetching } = useGetSupportGuideQuery(guideId, { refetchOnMountOrArgChange: true });
  const [vote, { isLoading: voting }] = useVoteSupportGuideMutation();
  const [submitted, setSubmitted] = useState(null);
  const [voteError, setVoteError] = useState('');
  const feedback = submitted?.id === guideId ? submitted.value : guide?.vote;
  async function sendVote(value) {
    if (voting) return;
    setVoteError('');
    try { await vote({ id: guideId, helpful: value === 'yes' }).unwrap(); setSubmitted({ id: guideId, value }); }
    catch (err) { setVoteError(getApiErrorMessage(err)); }
  }
  if (isFetching && !guide) return <SkeletonRow variant="detail" />;

  if (!guide) {
    return (
      <div className={styles.page}>
        <PageHeader title="Guide not found" description={error ? getApiErrorMessage(error) : 'This guide may have moved or been removed.'} />
        <div><Button variant="outline" onClick={() => navigate('/support/guides')}>Browse all guides</Button></div>
      </div>
    );
  }

  const topic = guide.topicInfo;
  const related = guide.related ?? [];
  const topicHref = topic.slug ? `/support/guides?topic=${topic.slug}` : '/support/guides';

  return (
    <div className={styles.page}>
      <PageHeader
        crumbs={[
          { label: 'Support', onClick: () => navigate('/support') },
          { label: 'Help Guides', onClick: () => navigate('/support/guides') },
          { label: topic.value, onClick: () => navigate(topicHref) },
          guide.title,
        ]}
        title={guide.title}
        description={guide.summary}
      />

      <div className={styles.articleLayout}>
        <Card className={styles.article}>
          <div className={styles.articleMeta}>
            <span className={styles.topicTag}><Icon name={topic.icon} size={13} />{topic.value}</span>
            <span className={styles.meta}><Icon name="clock" size={13} /> {guide.readMinutes ?? '—'} min read</span>
            <span className={styles.meta}>Updated {guide.updated}</span>
          </div>

          {guide.sections.map((s, index) => (
            <section key={`${index}:${s.heading}`} className={styles.section}>
              <h2>{s.heading}</h2>
              {s.body && <p>{s.body}</p>}
              {s.steps && <ol>{s.steps.map((step) => <li key={step}>{step}</li>)}</ol>}
              {s.tip && (
                <div className={styles.tip}>
                  <Icon name="lightbulb" size={16} color="var(--tk-blue)" />
                  <span>{s.tip}</span>
                </div>
              )}
            </section>
          ))}

          <div className={styles.feedback}>
            {voteError && <span role="alert">{voteError}</span>}
            {feedback ? (
              <span><Icon name="circle-check" size={16} color="var(--tk-success)" /> Thanks for your feedback.</span>
            ) : (
              <>
                <span>Was this guide helpful?</span>
                <Button variant="outline" size="sm" icon="thumbs-up" disabled={voting || guide.allowFeedback !== true} onClick={() => sendVote('yes')}>Yes</Button>
                <Button variant="outline" size="sm" icon="thumbs-down" disabled={voting || guide.allowFeedback !== true} onClick={() => sendVote('no')}>No</Button>
              </>
            )}
          </div>
        </Card>

        <aside className={styles.aside}>
          <Card>
            <h3 className={styles.asideTitle}>More in {topic.label}</h3>
            {related.length === 0 ? (
              <p className={styles.meta}>{guide.related === null ? '—' : 'No other guides in this topic yet.'}</p>
            ) : (
              <ul className={styles.relatedList}>
                {related.map((g) => (
                  <li key={g.id}>
                    <Link to={supportGuideHref(g.id)}>
                      <Icon name="file-text" size={16} color="var(--tk-blue)" />
                      <span>{g.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link to={topicHref} className={styles.viewAll}>
              View all {topic.value} guides <Icon name="arrow-right" size={14} />
            </Link>
          </Card>
          <StillNeedHelp topic={topic} />
        </aside>
      </div>
    </div>
  );
}

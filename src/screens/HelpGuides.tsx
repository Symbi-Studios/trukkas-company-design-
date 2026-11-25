'use client';

import { useState } from 'react';
import { Link, useNavigate } from '../router';
import { Button, Card, EmptyState, Icon, PageHeader, SearchField, SkeletonRow } from '../ds';
import { useSearchParams } from 'next/navigation';
import { useGetSupportGuidesQuery } from '../store/features/support/supportApi';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage';
import { supportGuideHref } from '../domain/supportLinks';
import { syncTopBarSearch, useTopBarSearch } from '../pageSearch';
import { SUPPORT_TOPICS, topicBySlug } from '../domain/support';
import styles from './Guides.module.css';
import type { GuideSummary, GuideTopic } from '../store/features/support/supportTypes';

export const ticketHref = (topic: GuideTopic | null | undefined) => (topic ? `/support/new?category=${encodeURIComponent(topic.value)}` : '/support/new');

/** Card linking to a guide; used on the guides index and the Support page. */
export function GuideCard({ guide, showTopic = true }: { guide: GuideSummary; showTopic?: boolean }) {
  const topic = guide.topicInfo;
  return (
    <Link to={supportGuideHref(guide.id)} className={styles.guideCard}>
      {showTopic && topic && <span className={styles.topicTag}><Icon name={topic.icon} size={13} />{topic.value}</span>}
      <strong>{guide.title}</strong>
      <p>{guide.summary}</p>
      <span className={styles.cardFoot}>
        <span className={styles.meta}><Icon name="clock" size={13} /> {guide.readMinutes ?? '—'} min read</span>
        <span className={styles.readMore}>Read more <Icon name="arrow-right" size={14} /></span>
      </span>
    </Link>
  );
}

/** "Can't find it?" prompt that opens a ticket, pre-filled with the topic when there is one. */
export function StillNeedHelp({ topic }: { topic?: GuideTopic | null }) {
  const navigate = useNavigate();
  return (
    <Card className={styles.needHelp}>
      <span className={styles.needHelpIcon}><Icon name="headset" size={24} color="var(--tk-blue)" /></span>
      <div>
        <h3>Still need help?</h3>
        <p>Our support team is available Monday – Friday, 8:00 AM – 8:00 PM (WAT).</p>
      </div>
      <Button icon="message-square-plus" onClick={() => navigate(ticketHref(topic))}>Submit a Ticket</Button>
    </Card>
  );
}

export function HelpGuides() {
  const navigate = useNavigate();
  const params = useSearchParams();
  const [query, setQuery] = useState('');
  const requested = params.get('topic');
  const topicSlug = topicBySlug(requested) ? requested : '';
  const { currentData, error, isFetching } = useGetSupportGuidesQuery({ search: query });
  const guides = currentData as GuideSummary[] | null | undefined;
  useTopBarSearch(setQuery);

  function chooseTopic(slug: string) {
    navigate(slug ? `/support/guides?topic=${slug}` : '/support/guides', { replace: true });
  }

  const topic = topicBySlug(topicSlug);
  const searched = guides ?? [];
  const visible = searched.filter((g) => !topicSlug || g.topic === topicSlug);
  const countFor = (slug: string) => guides ? guides.filter((g) => g.topic === slug).length : '—';

  return (
    <div className={styles.page}>
      <PageHeader
        crumbs={[
          { label: 'Dashboard', onClick: () => navigate('/') },
          { label: 'Support', onClick: () => navigate('/support') },
          'Help Guides',
        ]}
        title="Help Guides"
        description="Step-by-step answers for jobs, fleet, drivers, payments and your account."
        actions={<Button variant="outline" icon="message-square-plus" onClick={() => navigate(ticketHref(topic))}>Submit a Ticket</Button>}
      />

      <Card className={styles.searchCard}>
        <SearchField
          placeholder="Search guides, e.g. “withdraw”, “insurance”, “2FA”"
          value={query}
          onChange={(e) => { setQuery(e.target.value); syncTopBarSearch(e.target.value); }}
        />
        <div className={styles.chips} role="tablist" aria-label="Filter by topic">
          <button type="button" role="tab" aria-selected={!topicSlug} className={`${styles.chip} ${!topicSlug ? styles.chipActive : ''}`} onClick={() => chooseTopic('')}>
            All topics <span>{guides ? guides.length : '—'}</span>
          </button>
          {SUPPORT_TOPICS.map((t) => (
            <button key={t.slug} type="button" role="tab" aria-selected={topicSlug === t.slug}
              className={`${styles.chip} ${topicSlug === t.slug ? styles.chipActive : ''}`} onClick={() => chooseTopic(t.slug)}>
              <Icon name={t.icon} size={14} /> {t.value} <span>{countFor(t.slug)}</span>
            </button>
          ))}
        </div>
      </Card>

      {topic && (
        <div className={styles.topicBanner}>
          <span className={styles.topicBannerIcon}><Icon name={topic.icon} size={22} color="var(--tk-blue)" /></span>
          <div>
            <h2>{topic.label}</h2>
            <p>{topic.description}</p>
          </div>
        </div>
      )}

      {isFetching ? <SkeletonRow columns={3} /> : error ? <Card><EmptyState icon="life-buoy" title={getApiErrorMessage(error)} /></Card> : visible.length === 0 ? (
        <Card>
          <EmptyState icon="search" title="No guides match your search"
            description="Try different words, pick another topic, or ask our support team." />
        </Card>
      ) : (
        <div className={styles.guideGrid}>
          {visible.map((g) => <GuideCard key={g.id} guide={g} showTopic={!topicSlug} />)}
        </div>
      )}

      <StillNeedHelp topic={topic} />
    </div>
  );
}


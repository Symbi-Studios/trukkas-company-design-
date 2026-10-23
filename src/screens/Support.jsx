'use client';

import { useEffect, useState } from 'react';
import { Link, useNavigate } from '../router.js';
import { Badge, Button, Card, DataTable, EmptyState, Icon, PageHeader, SkeletonRow } from '../ds.js';
import { useGetSupportTicketsQuery, useGetSupportGuidesQuery } from '../store/features/support/supportApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { supportTicketHref } from '../domain/supportLinks.js';
import { useTopBarSearch } from '../pageSearch.js';
import { Toast, useToast } from '../components/Toast.jsx';
import { SUPPORT_TOPICS } from '../domain/support.js';
import { GuideCard } from './HelpGuides.jsx';
import guideStyles from './Guides.module.css';

const STATUS_TONE = { Open: 'info', Pending: 'warning', Resolved: 'success' };

// One-shot confirmation carried from Submit Ticket back to this list.
let pendingFlash = null;
export function flashSupport(message) { pendingFlash = message; }

export function Support() {
  const navigate = useNavigate();
  const { data, error, isLoading } = useGetSupportTicketsQuery(undefined, { refetchOnMountOrArgChange: true });
  const tickets = data ?? [];
  const [toast, showToast] = useToast(4000);
  useEffect(() => {
    if (pendingFlash) { showToast(pendingFlash); pendingFlash = null; }
  }, [showToast]);
  const [query, setQuery] = useState('');
  useTopBarSearch(setQuery);
  const { currentData: guides, error: guideError, isFetching: guidesLoading } = useGetSupportGuidesQuery({ search: query });
  const q = query.trim().toLowerCase();
  const matches = (...values) => !q || values.some((v) => String(v || '').toLowerCase().includes(q));
  const visibleTickets = tickets.filter((t) => matches(t.id, t.subject, t.category, t.status));
  const visibleGuides = (q ? (guides ?? []) : (guides ?? []).filter((g) => g.popular === true)).slice(0, 6);

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader title="Support" description={error ? getApiErrorMessage(error) : 'Get help with jobs, payments, fleet, or your account.'} actions={<Button icon="plus" onClick={() => navigate('/support/new')}>Contact Support</Button>} />
      <Card pad="none">
        <h3 className="tk-title" style={{ margin: 0, padding: '16px 16px 0' }}>Your Tickets</h3>
        {isLoading ? <SkeletonRow columns={5} /> : error ? <EmptyState icon="life-buoy" title={getApiErrorMessage(error)} /> : tickets.length === 0 ? (
          <EmptyState icon="life-buoy" title="No support tickets" description="Reach out to us any time — we usually respond within a few hours." />
        ) : visibleTickets.length === 0 ? (
          <EmptyState icon="search" title="No tickets match your search" />
        ) : (
          <DataTable
            rows={visibleTickets}
            rowKey={(t) => t.id}
            onRowClick={(t) => navigate(supportTicketHref(t.id))}
            columns={[
              { key: 'id', header: 'Ticket ID', render: (t) => <Link to={supportTicketHref(t.id)} onClick={(e) => e.stopPropagation()}>{t.id}</Link> },
              { key: 'subject', header: 'Subject', render: (t) => t.subject },
              { key: 'category', header: 'Category', render: (t) => t.category },
              { key: 'status', header: 'Status', render: (t) => <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge> },
              { key: 'updatedAt', header: 'Updated', render: (t) => t.updatedAt },
            ]}
          />
        )}
      </Card>
      <Card>
        <div className={guideStyles.helpHead}>
          <h3 className="tk-title">Help Guides</h3>
          <Link to="/support/guides" className={guideStyles.viewAll}>View all guides <Icon name="arrow-right" size={14} /></Link>
        </div>
        {!q && (
          <div className={guideStyles.topicGrid}>
            {SUPPORT_TOPICS.map((t) => (
              <Link key={t.slug} to={`/support/guides?topic=${t.slug}`} className={guideStyles.topicTile}>
                <span className={guideStyles.topicTileIcon}><Icon name={t.icon} size={17} /></span>
                <span><strong>{t.label}</strong><small>{guides ? guides.filter((g) => g.topic === t.slug).length : '—'} guides</small></span>
              </Link>
            ))}
          </div>
        )}
        <h4 className={guideStyles.subhead}>{q ? 'Matching guides' : 'Popular guides'}</h4>
        {guidesLoading ? <SkeletonRow columns={3} /> : guideError ? <span className="tk-meta">{getApiErrorMessage(guideError)}</span> : visibleGuides.length === 0 ? (
          <span className="tk-meta">No guides match your search. <Link to="/support/guides">Browse all guides</Link></span>
        ) : (
          <div className={guideStyles.guideGrid}>
            {visibleGuides.map((g) => <GuideCard key={g.id} guide={g} />)}
          </div>
        )}
      </Card>
      <Toast message={toast} />
    </div>
  );
}

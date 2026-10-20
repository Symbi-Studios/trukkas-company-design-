'use client';

import { useMemo, useState } from 'react';
import { useNavigate } from '../router.js';
import { Button, Card, EmptyState, NotificationItem, PageHeader, SkeletonRow } from '../ds.js';
import {
  useGetNotificationsQuery, useGetNotificationUnreadCountQuery,
  useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation,
} from '../store/features/notifications/notificationsApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { useTopBarSearch } from '../pageSearch.js';

export const NOTIFICATION_TONE = { document: 'red', job: 'blue', payout: 'green', maintenance: 'orange', review: 'purple', system: 'blue' };

export function NotificationCenter() {
  const navigate = useNavigate();
  const { data, error, isLoading } = useGetNotificationsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: count } = useGetNotificationUnreadCountQuery(undefined, { refetchOnMountOrArgChange: true });
  const notifications = data?.notifications;
  const [markNotificationRead, { isLoading: markingRead }] = useMarkNotificationReadMutation();
  const [markAllNotificationsRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();
  const [actionError, setActionError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  useTopBarSearch(setQuery);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (notifications || [])
      .filter((n) => filter === 'all' || (filter === 'unread' && n.read === false))
      .filter((n) => !q || [n.title, n.body].some((v) => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1));
  }, [notifications, filter, query]);
  const unreadCount = count ?? data?.unreadCount ?? null;

  async function open(notification) {
    if (markingRead || markingAll) return;
    setActionError(null);
    try {
      if (notification.read !== true) await markNotificationRead(notification.id).unwrap();
      if (notification.link) navigate(notification.link);
    } catch (requestError) { setActionError(requestError); }
  }

  async function markAll() {
    if (markingRead || markingAll) return;
    setActionError(null);
    try { await markAllNotificationsRead().unwrap(); }
    catch (requestError) { setActionError(requestError); }
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader
        title="Notifications"
        description={actionError ? getApiErrorMessage(actionError) : `${unreadCount ?? '—'} unread`}
        actions={unreadCount > 0 && <Button variant="outline" disabled={markingRead || markingAll} onClick={markAll}>Mark all as read</Button>}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        {['all', 'unread'].map((value) => (
          <button key={value} type="button" onClick={() => setFilter(value)} style={{
            height: 34, padding: '0 14px', borderRadius: 'var(--tk-r-pill)',
            border: '1px solid ' + (filter === value ? 'var(--tk-blue)' : 'var(--tk-line-strong)'),
            background: filter === value ? 'var(--tk-blue-soft)' : '#fff',
            color: filter === value ? 'var(--tk-blue)' : 'var(--tk-ink-500)',
            font: '600 13px/1 var(--tk-font-sans)', cursor: 'pointer', textTransform: 'capitalize',
          }}>{value}</button>
        ))}
      </div>
      <Card pad="none">
        {isLoading ? (
          <SkeletonRow variant="list" rows={4} style={{ padding: '0 16px' }} />
        ) : error ? (
          <EmptyState icon="bell" title={getApiErrorMessage(error)} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="bell" title={query ? 'No notifications match your search' : 'No notifications'} />
        ) : (
          <div style={{ padding: '0 16px' }}>
            {filtered.map((n, i) => (
              <NotificationItem key={n.id ?? i} icon={n.icon} tone={NOTIFICATION_TONE[n.type] || 'blue'} title={n.title} preview={n.body} meta={n.createdAt} unread={n.read === false} onClick={() => open(n)} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

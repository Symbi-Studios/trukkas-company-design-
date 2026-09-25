'use client';

import { useMemo, useState } from 'react';
import { useNavigate } from '../router.js';
import { Button, Card, EmptyState, NotificationItem, PageHeader } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { markAllNotificationsRead, markNotificationRead } from '../mock/api.js';

const TONE = { document: 'red', job: 'blue', payout: 'green', maintenance: 'orange', review: 'purple', system: 'blue' };

export function NotificationCenter() {
  const navigate = useNavigate();
  const notifications = useCollection('notifications') || [];
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => notifications
    .filter((n) => filter === 'all' || (filter === 'unread' && !n.read))
    .sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1)), [notifications, filter]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  async function open(notification) {
    if (!notification.read) await markNotificationRead(notification.id);
    if (notification.link) navigate(notification.link);
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread`}
        actions={unreadCount > 0 && <Button variant="outline" onClick={() => markAllNotificationsRead()}>Mark all as read</Button>}
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
        {filtered.length === 0 ? (
          <EmptyState icon="bell" title="No notifications" />
        ) : (
          <div style={{ padding: '0 16px' }}>
            {filtered.map((n) => (
              <NotificationItem key={n.id} icon={n.icon} tone={TONE[n.type] || 'blue'} title={n.title} preview={n.body} meta={n.createdAt} unread={!n.read} onClick={() => open(n)} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

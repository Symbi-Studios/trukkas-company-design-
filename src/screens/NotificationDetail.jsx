'use client';

import { useEffect } from 'react';
import { useNavigate, useParams } from '../router.js';
import { Button, Card, Icon, PageHeader } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { markNotificationRead } from '../mock/api.js';

export function NotificationDetail() {
  const { notificationId } = useParams();
  const navigate = useNavigate();
  const notifications = useCollection('notifications') || [];
  const notification = notifications.find((n) => n.id === notificationId);

  useEffect(() => {
    if (notification && !notification.read) markNotificationRead(notification.id);
  }, [notification]);

  if (!notification) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title="Notification not found" />
        <Button variant="outline" onClick={() => navigate('/notifications')}>Back to Notifications</Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader
        crumbs={[{ label: 'Notifications', onClick: () => navigate('/notifications') }, notification.title]}
        title={notification.title}
        description={notification.createdAt}
      />
      <Card style={{ display: 'flex', gap: 14 }}>
        <Icon name={notification.icon} size={22} color="var(--tk-blue)" />
        <p style={{ margin: 0, font: '400 14px/22px var(--tk-font-sans)', color: 'var(--tk-ink-700)' }}>{notification.body}</p>
      </Card>
      {notification.link && <Button onClick={() => navigate(notification.link)}>Open related item</Button>}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from '../router.js';
import { Button, Card, Icon, PageHeader, SkeletonRow } from '../ds.js';
import { useGetNotificationsQuery, useMarkNotificationReadMutation } from '../store/features/notifications/notificationsApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';

export function NotificationDetail() {
  const { notificationId } = useParams();
  const navigate = useNavigate();
  const { data, error, isLoading } = useGetNotificationsQuery(undefined, { refetchOnMountOrArgChange: true });
  const [markNotificationRead] = useMarkNotificationReadMutation();
  const [actionError, setActionError] = useState(null);
  const attempted = useRef(null);
  const notification = data?.notifications.find((n) => n.id === notificationId);

  useEffect(() => {
    if (!notification?.id || notification.read === true || attempted.current === notification.id) return;
    attempted.current = notification.id;
    setActionError(null);
    markNotificationRead(notification.id).unwrap().catch(setActionError);
  }, [notification?.id, notification?.read, markNotificationRead]);

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title="—" />
        <Card><SkeletonRow columns={3} /></Card>
      </div>
    );
  }

  if (!notification) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title={error ? getApiErrorMessage(error) : 'Notification not found'} />
        <Button variant="outline" onClick={() => navigate('/notifications')}>Back to Notifications</Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader
        crumbs={[{ label: 'Notifications', onClick: () => navigate('/notifications') }, notification.title]}
        title={notification.title}
        description={actionError ? getApiErrorMessage(actionError) : notification.createdAt}
      />
      <Card style={{ display: 'flex', gap: 14 }}>
        <Icon name={notification.icon} size={22} color="var(--tk-blue)" />
        <p style={{ margin: 0, font: '400 14px/22px var(--tk-font-sans)', color: 'var(--tk-ink-700)' }}>{notification.body}</p>
      </Card>
      {notification.link && <Button onClick={() => navigate(notification.link)}>Open related item</Button>}
    </div>
  );
}

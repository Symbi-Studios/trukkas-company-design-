'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import {
  Badge, Card, DataTable, DonutChart, Icon, LegendList, NotificationItem, PageHeader,
  EmptyState, ProgressBar, SectionCard, Skeleton, SkeletonRow, StatCard,
} from '../ds.js';
import {
  EMPTY_DASHBOARD, EMPTY_EARNINGS, useGetCompanyDashboardQuery, useGetDashboardPendingJobsQuery, useGetDashboardActiveTripsQuery,
  useGetDashboardEarningsQuery, useGetDashboardRatingQuery,
} from '../store/features/dashboard/dashboardApi.js';
import { useGetNotificationsQuery, useGetNotificationUnreadCountQuery, useMarkNotificationReadMutation } from '../store/features/notifications/notificationsApi.js';
import { useGetOnboardingBankQuery } from '../store/features/auth/onboardingApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { jobDetailHref } from '../domain/jobLinks.js';
import { tripDetailHref } from '../domain/tripLinks.js';
import { EarningsExpensesChart } from '../components/EarningsExpensesChart.jsx';
import { NOTIFICATION_TONE } from './NotificationCenter.jsx';
import styles from './Dashboard.module.css';

function StarRating({ rating, reviews, trend, breakdown }) {
  const rows = [5, 4, 3, 2, 1].map((stars) => ({ stars, pct: breakdown?.[stars] ?? null }));
  return (
    <div className={styles.rating}>
      <div className={styles.ratingHead}>
        <span className={styles.starTile}><Icon name="star" size={22} /></span>
        <span>
          <strong>{Number.isFinite(rating) ? rating.toFixed(1) : '—'} / 5</strong>
          <small>Based on {reviews ?? '—'} reviews</small>
          <em>{Number.isFinite(trend) ? `${trend >= 0 ? '↑' : '↓'} ${Math.abs(trend)} from last month` : '—'}</em>
        </span>
      </div>
      <div className={styles.ratingRows}>
        {rows.map((row) => (
          <div key={row.stars}>
            <span>{row.stars} <Icon name="star" filled size={11} /></span>
            <ProgressBar value={row.pct ?? 0} color={row.stars === 5 ? 'var(--tk-success)' : row.stars === 4 ? 'var(--tk-teal)' : 'var(--tk-warning)'} height={16} />
            <small>{row.pct === null ? '—' : `${row.pct}%`}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Finish setting up" card: stays until every onboarding item is done (or dismissed for the session). */
function SetupChecklist({ items, onGo }) {
  const [hidden, setHidden] = useState(false);
  const done = items.filter((i) => i.done).length;
  const known = items.every((item) => typeof item.done === 'boolean');
  if (hidden || done === items.length) return null;
  return (
    <SectionCard
      title="Finish setting up your account"
      description={`${known ? done : '—'} of ${items.length} complete. Finish these to start bidding on jobs and receiving payouts.`}
      action={<button className={styles.linkButton} onClick={() => setHidden(true)}>Hide for now</button>}
    >
      <ProgressBar value={known ? done : 0} max={items.length} height={8} color="var(--tk-success)" />
      <div className={styles.setupGrid}>
        {items.map((item) => (
          <button key={item.label} type="button" className={`${styles.setupItem} ${item.done ? styles.setupDone : ''}`} onClick={() => !item.done && onGo(item.to)} disabled={item.done || item.available === false}>
            <Icon name={item.done ? 'circle-check' : item.icon} size={18} />
            <span><strong>{item.label}</strong><small>{item.done ? 'Done' : item.done === null || item.available === false ? '—' : item.hint}</small></span>
            {!item.done && <Icon name="chevron-right" size={16} />}
          </button>
        ))}
      </div>
    </SectionCard>
  );
}

export function Dashboard() {
  const router = useRouter();
  const companyName = useSelector((state) => state.auth.account?.companyName);
  const { data: overview = EMPTY_DASHBOARD, error: overviewError, isLoading: overviewLoading } = useGetCompanyDashboardQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: pendingJobData, error: pendingJobsError, isLoading: pendingJobsLoading } = useGetDashboardPendingJobsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: tripData, error: tripsError, isLoading: tripsLoading } = useGetDashboardActiveTripsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: earnings = EMPTY_EARNINGS, error: earningsError, isLoading: earningsLoading } = useGetDashboardEarningsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: reviewSummary, error: ratingError, isLoading: ratingLoading } = useGetDashboardRatingQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: notificationData, error: notificationsError, isLoading: notificationsLoading } = useGetNotificationsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: unreadCount } = useGetNotificationUnreadCountQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: bank } = useGetOnboardingBankQuery(undefined, { refetchOnMountOrArgChange: true });
  const [markNotificationRead, { isLoading: markingRead }] = useMarkNotificationReadMutation();
  const [actionError, setActionError] = useState(null);
  const bankConfigured = bank === null ? false : bank && [bank.bankName, bank.last4, bank.accountName].every((value) => value && value !== '—') ? true : null;
  const setupItems = [
    { label: 'Verify email & phone', hint: 'Confirm your contact details', icon: 'badge-check', done: overview.setup.contact, to: '/profile?verify=email' },
    { label: 'Company documents', hint: overview.setup.documentHint, icon: 'file-check', done: overview.setup.documents, to: '/documents' },
    { label: 'Add your first truck', hint: 'Papers, photos and specs', icon: 'truck', done: overview.setup.truck, to: '/fleet/new' },
    { label: 'Onboard a driver', hint: 'Licence and ID', icon: 'user-round', done: overview.setup.driver, to: '/drivers' },
    { label: 'Payout bank account', hint: 'Where we send your money', icon: 'landmark', done: bankConfigured, to: '/company-settings?tab=payout' },
    { label: 'Transaction PIN', hint: 'Approves payouts & withdrawals', icon: 'lock-keyhole', done: overview.setup.pin, to: '/company-settings?tab=pin' },
    { label: 'Two-factor authentication', hint: 'Protect your sign-in', icon: 'shield-check', done: overview.setup.twoFactor, available: overview.setup.twoFactorAvailable, to: '/company-settings?tab=security' },
  ];
  const data = { ...overview, pendingJobs: pendingJobData?.jobs ?? null, activeTrips: tripData?.trips ?? null };
  const expiringDocs = overview.expiringDocs;
  // Unread first, then in the order the feed delivers them.
  const latestNotifications = useMemo(() => notificationData?.notifications
    ? [...notificationData.notifications].sort((a, b) => Number(a.read) - Number(b.read)).slice(0, 4) : null, [notificationData]);
  const metric = (value) => overviewLoading ? <Skeleton width={65} height={28} /> : value ?? '—';

  async function openNotification(notification) {
    if (markingRead) return;
    setActionError(null);
    try {
      if (notification.read !== true) await markNotificationRead(notification.id).unwrap();
      if (notification.link) router.push(notification.link);
    } catch (error) { setActionError(error); }
  }

  return (
    <div className={styles.dashboard}>
      <PageHeader
        title={<>Good morning, {companyName ?? '—'} <span aria-hidden="true">👋</span></>}
        description={actionError || overviewError ? getApiErrorMessage(actionError || overviewError) : "Here's what's happening with your operations today."}
      />

      <SetupChecklist items={setupItems} onGo={(to) => router.push(to)} />

      <section className={styles.stats} aria-label="Operations summary">
        <StatCard icon="truck" label="Available Trucks" value={metric(overview.availableTrucks)} caption={`of ${overview.totalTrucks ?? '—'} total`} />
        <StatCard icon="route" tint="green" label="Trucks on Trip" value={metric(overview.trucksOnTrip)} caption="On the road" />
        <StatCard icon="wrench" tint="amber" label="Maintenance Due" value={metric(overview.maintenanceDue)} caption="Due soon or overdue" />
        <StatCard icon="user-round" tint="purple" label="Active Drivers" value={metric(overview.activeDrivers)} caption="On duty" />
        <StatCard icon="briefcase" tint="red" label="Pending Job Requests" value={metric(overview.pendingJobRequests)} caption="Require your action" />
        <StatCard icon="circle-check" label="Active Jobs" value={metric(overview.activeJobs)} caption="In progress" />
        <StatCard icon="wallet" tint="teal" label="Wallet Balance" value={metric(overview.walletBalance)} caption="Available balance" />
        <StatCard icon="hourglass" tint="amber" label="Pending Payout" value={metric(overview.pendingPayout)} caption="In review" />
      </section>

      <section className={styles.financeGrid}>
        <SectionCard
          title="Jobs Requiring Your Action"
          count={overview.pendingJobRequests ?? '—'}
          action={<button className={styles.linkButton} onClick={() => router.push('/jobs')}>View all</button>}
          pad="none"
        >
          <div className={styles.compactTable}>
            <DataTable
              rows={data.pendingJobs ?? []}
              rowKey={(job, index) => job.bidId ?? index}
              onRowClick={(job) => job.id && router.push(jobDetailHref(job.id))}
              tableLayout="fixed"
              columns={[
                { key: 'id', header: 'Job ID', width: 146, render: (job) => job.number },
                { key: 'route', header: 'Route & Type', render: (job) => <span>{job.origin} → {job.destination}<br /><span className="tk-meta">{job.jobType}</span></span> },
                { key: 'requirement', header: 'Requirement', width: 140, render: (job) => <Badge tone="warning">{job.requirement}</Badge> },
                { key: 'postedOn', header: 'Requested', width: 116, render: (job) => job.postedOn?.split(' · ')[0] },
              ]}
            />
            {pendingJobsLoading ? <SkeletonRow columns={4} /> : pendingJobsError ? <EmptyState icon="briefcase" title={getApiErrorMessage(pendingJobsError)} /> : data.pendingJobs === null && <span className="tk-meta">—</span>}
          </div>
        </SectionCard>
        <SectionCard
          title="Active Trips"
          count={tripData?.total ?? '—'}
          action={<button className={styles.linkButton} onClick={() => router.push('/trips')}>View all active trips</button>}
          pad="none"
        >
          <div className={styles.compactTable}>
            <DataTable
              rows={data.activeTrips ?? []}
              rowKey={(trip, index) => trip.id ?? index}
              onRowClick={(trip) => trip.id && router.push(tripDetailHref(trip.id))}
              tableLayout="fixed"
              columns={[
                { key: 'trip', header: 'Trip & Route', render: (trip) => <span>{trip.number}<br /><span className="tk-meta">{trip.origin} → {trip.destination}</span></span> },
                { key: 'truck', header: 'Truck / Driver', width: 150, render: (trip) => <span>{trip.truckPlate}<br /><span className="tk-meta">{trip.driverName}</span></span> },
                { key: 'status', header: 'Status', width: 142, render: (trip) => <Badge tone={trip.tone}>{trip.status}</Badge> },
              ]}
            />
            {tripsLoading ? <SkeletonRow columns={3} /> : tripsError ? <EmptyState icon="route" title={getApiErrorMessage(tripsError)} /> : data.activeTrips === null && <span className="tk-meta">—</span>}
          </div>
        </SectionCard>
      </section>

      <section className={styles.financeGrid}>
        <SectionCard title="Fleet Status" action={<button className={styles.linkButton} onClick={() => router.push('/fleet')}>View full fleet</button>}>
          <div className={styles.activity}>
            <DonutChart size={150} thickness={20} data={data.fleetChartData} centerValue={overview.totalTrucks ?? '—'} centerLabel="Total Trucks" />
            <LegendList style={{ width: '100%' }} items={data.fleetStatus} />
          </div>
        </SectionCard>
        <SectionCard title="Earnings Overview" action={<button className={styles.linkButton} onClick={() => router.push('/earnings-wallet')}>View earnings & wallet</button>}>
          <div className={styles.trendValue}>
            <strong>{earningsLoading ? <Skeleton width={120} height={28} /> : earnings.earningsThisMonth}</strong>
            <span>{earnings.change}</span>
          </div>
          {earningsLoading ? <SkeletonRow columns={3} /> : earningsError ? <EmptyState icon="wallet" title={getApiErrorMessage(earningsError)} /> : earnings.monthlyTrend === null ? <span className="tk-meta">—</span> : <EarningsExpensesChart trend={earnings.monthlyTrend} height={170} />}
        </SectionCard>
      </section>

      <section className={styles.insightsGrid}>
        <SectionCard title="Recent Activity" action={<button className={styles.linkButton} onClick={() => router.push('/notifications')}>View all</button>} pad="none">
          <div style={{ padding: '4px var(--tk-card-pad) var(--tk-card-pad)' }}>
            {overviewLoading ? <SkeletonRow columns={2} /> : data.activityFeed === null ? <span className="tk-meta">—</span> : data.activityFeed.length === 0 && <span className="tk-meta">No activity yet.</span>}
            {data.activityFeed?.map((item, i) => (
              <div key={item.id || i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: i < data.activityFeed.length - 1 ? '1px solid var(--tk-line)' : 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, marginTop: 6, flex: '0 0 auto', background: item.tone }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: '400 13px/18px var(--tk-font-sans)', color: 'var(--tk-ink-700)' }}>{item.text}</div>
                  <div className="tk-meta">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Notifications" count={unreadCount ?? '—'} action={<button className={styles.linkButton} onClick={() => router.push('/notifications')}>View all</button>} pad="none">
          <div style={{ padding: '0 var(--tk-card-pad) 6px' }}>
            {expiringDocs > 0 && (
              <Card tone="sunk" style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '4px 0 0', cursor: 'pointer' }} onClick={() => router.push('/documents')}>
                <Icon name="triangle-alert" size={16} color="var(--tk-warning)" />
                <span className="tk-meta">{expiringDocs} document{expiringDocs === 1 ? '' : 's'} expiring or expired across your fleet.</span>
              </Card>
            )}
            {notificationsLoading ? <SkeletonRow columns={2} /> : notificationsError ? <EmptyState icon="bell" title={getApiErrorMessage(notificationsError)} /> : latestNotifications === null || expiringDocs === null ? <span className="tk-meta">—</span> : latestNotifications.length === 0 && expiringDocs === 0 && <p className="tk-meta" style={{ margin: '8px 0 12px' }}>You're all caught up.</p>}
            {latestNotifications?.map((n, i) => (
              <NotificationItem
                key={n.id ?? i} icon={n.icon} tone={NOTIFICATION_TONE[n.type] || 'blue'} title={n.title} preview={n.body} meta={n.createdAt}
                unread={n.read === false} onClick={() => openNotification(n)}
                style={i === latestNotifications.length - 1 ? { borderBottom: 0 } : undefined}
              />
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Average Rating" action={<button className={styles.linkButton} onClick={() => router.push('/ratings-reviews')}>View reviews</button>}>
          {ratingLoading ? <SkeletonRow columns={2} /> : ratingError ? <EmptyState icon="star" title={getApiErrorMessage(ratingError)} />
            : <StarRating rating={reviewSummary?.average} reviews={reviewSummary?.total} trend={reviewSummary?.trendVsLastMonth} breakdown={reviewSummary?.breakdown} />}
        </SectionCard>
      </section>
    </div>
  );
}

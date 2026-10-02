'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge, Card, DataTable, DonutChart, Icon, LegendList, NotificationItem, PageHeader,
  ProgressBar, SectionCard, StatCard,
} from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { markNotificationRead } from '../mock/api.js';
import { recentActivity } from '../domain/activity.js';
import { shortPlace, tripHealth, tripHealthTone, tripPhase, withJobs } from '../domain/trips.js';
import { formatNaira } from '../mock/format.js';
import { COMPANY_REQUIREMENTS, complianceFor, documentsFor } from '../domain/documents.js';
import { EarningsExpensesChart } from '../components/EarningsExpensesChart.jsx';
import { NOTIFICATION_TONE } from './NotificationCenter.jsx';
import styles from './Dashboard.module.css';

function StarRating({ rating, reviews, trend, breakdown }) {
  const rows = [5, 4, 3, 2, 1].map((stars) => ({ stars, pct: breakdown?.[stars] ?? 0 }));
  return (
    <div className={styles.rating}>
      <div className={styles.ratingHead}>
        <span className={styles.starTile}><Icon name="star" size={22} /></span>
        <span>
          <strong>{rating.toFixed(1)} / 5</strong>
          <small>Based on {reviews} reviews</small>
          {Number.isFinite(trend) && <em>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)} from last month</em>}
        </span>
      </div>
      <div className={styles.ratingRows}>
        {rows.map((row) => (
          <div key={row.stars}>
            <span>{row.stars} <Icon name="star" filled size={11} /></span>
            <ProgressBar value={row.pct} color={row.stars === 5 ? 'var(--tk-success)' : row.stars === 4 ? 'var(--tk-teal)' : 'var(--tk-warning)'} height={16} />
            <small>{row.pct}%</small>
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
  if (hidden || done === items.length) return null;
  return (
    <SectionCard
      title="Finish setting up your account"
      description={`${done} of ${items.length} complete. Finish these to start bidding on jobs and receiving payouts.`}
      action={<button className={styles.linkButton} onClick={() => setHidden(true)}>Hide for now</button>}
    >
      <ProgressBar value={done} max={items.length} height={8} color="var(--tk-success)" />
      <div className={styles.setupGrid}>
        {items.map((item) => (
          <button key={item.label} type="button" className={`${styles.setupItem} ${item.done ? styles.setupDone : ''}`} onClick={() => !item.done && onGo(item.to)} disabled={item.done}>
            <Icon name={item.done ? 'circle-check' : item.icon} size={18} />
            <span><strong>{item.label}</strong><small>{item.done ? 'Done' : item.hint}</small></span>
            {!item.done && <Icon name="chevron-right" size={16} />}
          </button>
        ))}
      </div>
    </SectionCard>
  );
}

export function Dashboard() {
  const router = useRouter();
  const trucks = useCollection('trucks') || [];
  const drivers = useCollection('drivers') || [];
  const jobs = useCollection('jobs') || [];
  const trips = useCollection('trips') || [];
  const documents = useCollection('documents') || [];
  const maintenance = useCollection('maintenance') || [];
  const notifications = useCollection('notifications') || [];
  const transactions = useCollection('walletTransactions') || [];
  const wallet = useCollection('walletSummary')?.[0];
  const reviewSummary = useCollection('reviewSummary')?.[0];
  const company = useCollection('companyProfile')?.[0];
  const security = (useCollection('security') || [])[0];
  const profile = (useCollection('adminProfile') || [])[0];
  const companyCompliance = complianceFor(COMPANY_REQUIREMENTS, documentsFor(documents, 'company')).summary;
  const setupItems = [
    { label: 'Verify email & phone', hint: 'Confirm your contact details', icon: 'badge-check', done: !!(profile?.emailVerified && profile?.phoneVerified), to: '/profile' },
    { label: 'Company documents', hint: `${companyCompliance.requiredMet}/${companyCompliance.requiredTotal} required uploaded`, icon: 'file-check', done: companyCompliance.complete, to: '/documents' },
    { label: 'Add your first truck', hint: 'Papers, photos and specs', icon: 'truck', done: trucks.length > 0, to: '/fleet/new' },
    { label: 'Onboard a driver', hint: 'Licence and ID', icon: 'user-round', done: drivers.length > 0, to: '/drivers' },
    { label: 'Payout bank account', hint: 'Where we send your money', icon: 'landmark', done: !!wallet?.bankAccount, to: '/company-settings?tab=payout' },
    { label: 'Transaction PIN', hint: 'Approves payouts & withdrawals', icon: 'lock-keyhole', done: !!security?.pin?.set, to: '/company-settings?tab=pin' },
    { label: 'Two-factor authentication', hint: 'Protect your sign-in', icon: 'shield-check', done: !!security?.twoFactor?.enabled, to: '/company-settings?tab=security' },
  ];

  const data = useMemo(() => {
    const pendingJobs = jobs.filter((job) => job.status === 'Pending');
    const activeJobs = jobs.filter((job) => job.status === 'In Progress');
    const activeTrips = withJobs(trips, jobs).filter((trip) => tripPhase(trip) === 'Active');
    const maintenanceDue = maintenance.filter((record) => ['Upcoming', 'Overdue', 'In Progress'].includes(record.status));
    const activityFeed = trips.length === 0 ? [
      { text: 'Company workspace created', time: 'Just now', tone: 'var(--tk-success)' },
      ...trucks.slice(0, 3).map((t) => ({ text: `${t.plate} added to your fleet`, time: 'Just now', tone: 'var(--tk-blue)' })),
    ] : recentActivity({ trips, transactions });
    const fleetStatus = [
      { label: 'Active', value: trucks.filter((t) => t.status === 'Active').length, color: 'var(--tk-success)' },
      { label: 'On Trip', value: trucks.filter((t) => t.status === 'On Trip').length, color: 'var(--tk-blue)' },
      { label: 'In Maintenance', value: trucks.filter((t) => t.status === 'In Maintenance').length, color: 'var(--tk-warning)' },
      { label: 'Inactive', value: trucks.filter((t) => t.status === 'Inactive').length, color: 'var(--tk-danger)' },
    ];
    return { pendingJobs, activeJobs, activeTrips, maintenanceDue, activityFeed, fleetStatus };
  }, [trucks, maintenance, jobs, trips, transactions]);

  const expiringDocs = documents.filter((d) => d.status === 'Expiring Soon' || d.status === 'Expired').length;
  const unreadCount = notifications.filter((n) => !n.read).length;
  // Unread first, then in the order the feed delivers them.
  const latestNotifications = [...notifications].sort((a, b) => Number(a.read) - Number(b.read)).slice(0, 4);

  async function openNotification(notification) {
    if (!notification.read) await markNotificationRead(notification.id);
    if (notification.link) router.push(notification.link);
  }

  return (
    <div className={styles.dashboard}>
      <PageHeader
        title={<>Good morning, {company?.shortName || 'there'} <span aria-hidden="true">👋</span></>}
        description="Here's what's happening with your operations today."
      />

      <SetupChecklist items={setupItems} onGo={(to) => router.push(to)} />

      <section className={styles.stats} aria-label="Operations summary">
        <StatCard icon="truck" label="Available Trucks" value={trucks.filter((t) => t.status === 'Active').length} caption={`of ${trucks.length} total`} />
        <StatCard icon="route" tint="green" label="Trucks on Trip" value={trucks.filter((t) => t.status === 'On Trip').length} caption="On the road" />
        <StatCard icon="wrench" tint="amber" label="Maintenance Due" value={data.maintenanceDue.length} caption="Due soon or overdue" />
        <StatCard icon="user-round" tint="purple" label="Active Drivers" value={drivers.filter((d) => d.status !== 'Off Duty').length} caption="On duty" />
        <StatCard icon="briefcase" tint="red" label="Pending Job Requests" value={data.pendingJobs.length} caption="Require your action" />
        <StatCard icon="circle-check" label="Active Jobs" value={data.activeJobs.length} caption="In progress" />
        <StatCard icon="wallet" tint="teal" label="Wallet Balance" value={formatNaira(wallet?.balance ?? 0)} caption="Available balance" />
        <StatCard icon="hourglass" tint="amber" label="Pending Payout" value={formatNaira(wallet?.pendingPayout ?? 0)} caption="In review" />
      </section>

      <section className={styles.financeGrid}>
        <SectionCard
          title="Jobs Requiring Your Action"
          count={data.pendingJobs.length}
          action={<button className={styles.linkButton} onClick={() => router.push('/jobs')}>View all</button>}
          pad="none"
        >
          <div className={styles.compactTable}>
            <DataTable
              rows={data.pendingJobs.slice(0, 5)}
              rowKey={(job) => job.id}
              onRowClick={(job) => router.push(`/jobs/${job.id}`)}
              tableLayout="fixed"
              columns={[
                { key: 'id', header: 'Job ID', width: 146, render: (job) => job.id },
                { key: 'route', header: 'Route & Type', render: (job) => <span>{shortPlace(job.origin)} → {shortPlace(job.destination)}<br /><span className="tk-meta">{job.jobType}</span></span> },
                { key: 'requirement', header: 'Requirement', width: 140, render: (job) => <Badge tone="warning">{job.requirement}</Badge> },
                { key: 'postedOn', header: 'Requested', width: 116, render: (job) => job.postedOn?.split(' · ')[0] },
              ]}
            />
          </div>
        </SectionCard>
        <SectionCard
          title="Active Trips"
          count={data.activeTrips.length}
          action={<button className={styles.linkButton} onClick={() => router.push('/trips')}>View all active trips</button>}
          pad="none"
        >
          <div className={styles.compactTable}>
            <DataTable
              rows={data.activeTrips.slice(0, 5)}
              rowKey={(trip) => trip.id}
              onRowClick={(trip) => router.push(`/trips/${trip.id}`)}
              tableLayout="fixed"
              columns={[
                { key: 'trip', header: 'Trip & Route', render: (trip) => <span>{trip.id}<br /><span className="tk-meta">{shortPlace(trip.job?.origin)} → {shortPlace(trip.job?.destination)}</span></span> },
                { key: 'truck', header: 'Truck / Driver', width: 150, render: (trip) => <span>{trip.truckPlate || '—'}<br /><span className="tk-meta">{trip.driverName || 'Unassigned'}</span></span> },
                { key: 'status', header: 'Status', width: 142, render: (trip) => <Badge tone={tripHealthTone(tripHealth(trip))}>{tripHealth(trip)}</Badge> },
              ]}
            />
          </div>
        </SectionCard>
      </section>

      <section className={styles.financeGrid}>
        <SectionCard title="Fleet Status" action={<button className={styles.linkButton} onClick={() => router.push('/fleet')}>View full fleet</button>}>
          <div className={styles.activity}>
            <DonutChart size={150} thickness={20} data={data.fleetStatus} centerValue={trucks.length} centerLabel="Total Trucks" />
            <LegendList style={{ width: '100%' }} items={data.fleetStatus} />
          </div>
        </SectionCard>
        <SectionCard title="Earnings Overview" action={<button className={styles.linkButton} onClick={() => router.push('/earnings-wallet')}>View earnings & wallet</button>}>
          <div className={styles.trendValue}>
            <strong>{formatNaira(wallet?.earningsThisMonth ?? 0)}</strong>
            <span>↑ 18.6% vs last month</span>
          </div>
          <EarningsExpensesChart trend={wallet?.monthlyTrend} height={170} />
        </SectionCard>
      </section>

      <section className={styles.insightsGrid}>
        <SectionCard title="Recent Activity" action={<button className={styles.linkButton} onClick={() => router.push('/notifications')}>View all</button>} pad="none">
          <div style={{ padding: '4px var(--tk-card-pad) var(--tk-card-pad)' }}>
            {data.activityFeed.length === 0 && <span className="tk-meta">No activity yet.</span>}
            {data.activityFeed.map((item, i) => (
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
        <SectionCard title="Notifications" count={unreadCount || undefined} action={<button className={styles.linkButton} onClick={() => router.push('/notifications')}>View all</button>} pad="none">
          <div style={{ padding: '0 var(--tk-card-pad) 6px' }}>
            {expiringDocs > 0 && (
              <Card tone="sunk" style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '4px 0 0', cursor: 'pointer' }} onClick={() => router.push('/documents')}>
                <Icon name="triangle-alert" size={16} color="var(--tk-warning)" />
                <span className="tk-meta">{expiringDocs} document{expiringDocs === 1 ? '' : 's'} expiring or expired across your fleet.</span>
              </Card>
            )}
            {latestNotifications.length === 0 && expiringDocs === 0 && <p className="tk-meta" style={{ margin: '8px 0 12px' }}>You're all caught up.</p>}
            {latestNotifications.map((n, i) => (
              <NotificationItem
                key={n.id} icon={n.icon} tone={NOTIFICATION_TONE[n.type] || 'blue'} title={n.title} preview={n.body} meta={n.createdAt}
                unread={!n.read} onClick={() => openNotification(n)}
                style={i === latestNotifications.length - 1 ? { borderBottom: 0 } : undefined}
              />
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Average Rating" action={<button className={styles.linkButton} onClick={() => router.push('/ratings-reviews')}>View reviews</button>}>
          {reviewSummary
            ? <StarRating rating={reviewSummary.average} reviews={reviewSummary.total} trend={reviewSummary.trendVsLastMonth} breakdown={reviewSummary.breakdown} />
            : <span className="tk-meta">No reviews yet.</span>}
        </SectionCard>
      </section>
    </div>
  );
}

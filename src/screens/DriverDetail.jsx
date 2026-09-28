'use client';

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '../router.js';
import {
  Avatar, Badge, Button, Card, DataTable, EmptyState, EntityHeaderCard, Icon, LabelValue, PageHeader, ProgressBar,
  SectionCard, StatCard, Tabs, Timeline,
} from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { setDriverStatus } from '../mock/api.js';
import { formatNaira } from '../mock/format.js';
import { jobRate, jobTitle } from '../domain/jobs.js';
import { tripHealth, tripHealthTone, withJobs } from '../domain/trips.js';
import { DRIVER_REQUIREMENTS, documentsFor } from '../domain/documents.js';
import { DRIVER_STATUS_TONE, driverActivity, driverPerformance, ratingBreakdown } from '../domain/drivers.js';
import { plateSlug, vehicleStatusTone } from '../domain/vehicles.js';
import { AssignTruckModal, RemoveDriverModal } from '../components/AssignModals.jsx';
import { ComplianceChecklist, UploadDocumentModal } from '../components/DocumentCompliance.jsx';
import { Toast, useToast } from '../components/Toast.jsx';
import styles from './DriverDetail.module.css';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'trips', label: 'Trips' },
  { value: 'activity', label: 'Activity' },
  { value: 'ratings', label: 'Ratings & Feedback' },
  { value: 'documents', label: 'Documents' },
];

function Stars({ rating, size = 13 }) {
  return (
    <span className={styles.stars} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => <Icon key={n} name="star" size={size} color={n <= Math.round(rating) ? 'var(--tk-warning)' : 'var(--tk-line-strong)'} />)}
    </span>
  );
}

export function DriverDetail() {
  const { driverId } = useParams();
  const navigate = useNavigate();
  const drivers = useCollection('drivers') || [];
  const trucks = useCollection('trucks') || [];
  const jobs = useCollection('jobs') || [];
  const allTrips = useCollection('trips') || [];
  const allReviews = useCollection('reviews') || [];
  const documents = useCollection('documents') || [];
  const driver = drivers.find((d) => d.id === driverId);
  const truck = trucks.find((t) => t.plate === driver?.truckPlate);
  const [tab, setTab] = useState('overview');
  const [assignOpen, setAssignOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [uploadType, setUploadType] = useState(null);
  const [toast, showToast] = useToast();

  const trips = useMemo(() => withJobs(allTrips, jobs)
    .filter((trip) => trip.driverId === driverId)
    .sort((a, b) => b.id.localeCompare(a.id)), [allTrips, jobs, driverId]);
  const reviews = useMemo(() => allReviews.filter((r) => r.driverName === driver?.name), [allReviews, driver?.name]);
  const docs = useMemo(() => documentsFor(documents, 'driver', driverId), [documents, driverId]);

  if (!driver) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title="Driver not found" />
        <Button variant="outline" onClick={() => navigate('/drivers')}>Back to Drivers</Button>
      </div>
    );
  }

  const perf = driverPerformance(driver, trips);
  const activity = driverActivity(driver, trips);
  const breakdown = ratingBreakdown(reviews);
  const locked = !!perf.activeTrip;

  const truckActions = (
    <>
      <Button variant="secondary" icon={driver.truckPlate ? 'repeat' : 'truck'} disabled={locked} onClick={() => setAssignOpen(true)}>
        {driver.truckPlate ? 'Reassign Truck' : 'Assign to Truck'}
      </Button>
      {driver.truckPlate && <Button variant="danger" icon="user-minus" disabled={locked} onClick={() => setRemoveOpen(true)}>Remove from Truck</Button>}
    </>
  );

  return (
    <div className={styles.page}>
      <PageHeader
        crumbs={[{ label: 'Drivers', onClick: () => navigate('/drivers') }, driver.name]}
        title={driver.name}
        description={`${driver.id} · Joined ${driver.joined}`}
        actions={<Button variant="outline" icon="arrow-left" onClick={() => navigate('/drivers')}>Back to Drivers</Button>}
      />
      <EntityHeaderCard
        name={driver.name}
        avatar={<Avatar name={driver.name} src={driver.photo || undefined} size={64} />}
        subtitle={`${driver.address} · ${driver.email}`}
        badges={<><Badge tone={DRIVER_STATUS_TONE[driver.status]} dot>{driver.status}</Badge><Badge tone={driver.kyc === 'Verified' ? 'success' : 'warning'}>KYC {driver.kyc}</Badge></>}
        facts={[
          { label: 'Phone', value: driver.phone },
          { label: 'Licence No.', value: driver.licenseNumber },
          { label: 'Licence Class', value: driver.licenseClass },
          { label: 'Licence Expiry', value: driver.licenseExpiry },
          { label: 'Assigned Truck', value: driver.truckPlate || 'Unassigned' },
          { label: 'Rating', value: `★ ${driver.rating?.toFixed(1) ?? '—'} (${driver.reviewCount})` },
        ]}
        actions={
          <>
            {truckActions}
            {driver.status === 'Off Duty'
              ? <Button variant="outline" onClick={() => setDriverStatus(driver.id, 'Available')}>Mark Available</Button>
              : driver.status === 'Available' && <Button variant="outline" onClick={() => setDriverStatus(driver.id, 'Off Duty')}>Mark Off Duty</Button>}
          </>
        }
      />
      {locked && (
        <Card tone="cool" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="lock" size={16} color="var(--tk-blue)" />
          <span className="tk-meta">Truck assignment is locked while {driver.name.split(' ')[0]} is on <button type="button" className={styles.link} onClick={() => navigate(`/trips/${perf.activeTrip.id}`)}>{perf.activeTrip.id}</button>.</span>
        </Card>
      )}

      <Card pad="none">
        <div style={{ padding: '0 var(--tk-card-pad)' }}>
          <Tabs value={tab} onChange={setTab} items={TABS.map((t) => ({ ...t, count: t.value === 'trips' ? trips.length : t.value === 'ratings' ? reviews.length : undefined }))} />
        </div>
        <div className={styles.body}>
          {tab === 'overview' && (
            <div className={styles.overview}>
              <section className={styles.kpis}>
                <StatCard icon="star" tint="amber" label="Average Rating" value={perf.rating?.toFixed(1) ?? '—'} caption={`${perf.reviewCount} reviews`} />
                <StatCard icon="clock-3" tint="green" label="On-time Delivery" value={perf.onTimeRate != null ? `${perf.onTimeRate}%` : '—'} caption="Last 90 days" />
                <StatCard icon="shield-check" tint="blue" label="Safety Score" value={perf.safetyScore != null ? `${perf.safetyScore}/100` : '—'} caption={`${perf.incidents} incident(s) reported`} />
                <StatCard icon="route" tint="purple" label="Trips Completed" value={perf.tripsCompleted} caption={perf.completionRate != null ? `${perf.completionRate}% completion rate` : 'All time'} />
                <StatCard icon="map" tint="teal" label="Distance Driven" value={`${perf.distanceKm.toLocaleString()} km`} caption="Trips on Trukkas" />
                <StatCard icon="banknote" tint="green" label="Earnings Generated" value={formatNaira(perf.earnings)} caption="Delivered trips" />
              </section>
              <div className={styles.twoUp}>
                <SectionCard title="Assigned Truck">
                  {truck ? (
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div className={styles.truckRow}>
                        {truck.photos?.[0]?.url
                          ? <img src={truck.photos[0].url} alt="" className={styles.truckImg} />
                          : <span className={styles.truckTile}><Icon name="truck" size={26} /></span>}
                        <span><strong>{truck.plate}</strong><small>{truck.makeModel}</small><small>{truck.location}</small></span>
                        <Badge tone={vehicleStatusTone(truck.status)} dot>{truck.status}</Badge>
                      </div>
                      <div className={styles.actionRow}>
                        <Button variant="secondary" size="sm" icon="eye" onClick={() => navigate(`/fleet/${plateSlug(truck.plate)}`)}>View Truck</Button>
                        {truckActions}
                      </div>
                    </div>
                  ) : (
                    <EmptyState icon="truck" title="No truck assigned" description="Assign this driver to a truck so they can be dispatched on trips." action={<Button icon="truck" onClick={() => setAssignOpen(true)}>Assign to Truck</Button>} style={{ padding: 16 }} />
                  )}
                </SectionCard>
                <SectionCard title="Recent Activity" action={<button type="button" className={styles.link} onClick={() => setTab('activity')}>View all</button>}>
                  {activity.length === 0 ? <span className="tk-meta">No activity yet.</span> : (
                    <Timeline items={activity.slice(0, 4).map((a) => ({ title: a.title, time: a.time, description: a.description, state: a.tone === 'danger' ? 'danger' : a.tone === 'warning' ? 'warning' : 'done', icon: 'check' }))} />
                  )}
                </SectionCard>
              </div>
              {reviews[0] && (
                <SectionCard title="Latest Feedback" action={<button type="button" className={styles.link} onClick={() => setTab('ratings')}>All feedback</button>}>
                  <ReviewRow review={reviews[0]} onJob={(id) => navigate(`/jobs/${id}`)} />
                </SectionCard>
              )}
            </div>
          )}

          {tab === 'trips' && (trips.length ? (
            <DataTable rows={trips} rowKey={(t) => t.id} onRowClick={(t) => navigate(`/trips/${t.id}`)} columns={[
              { key: 'id', header: 'Trip', render: (t) => <span className={styles.twoLine}><strong>{t.id}</strong><small>{t.jobId}</small></span> },
              { key: 'cargo', header: 'Cargo', render: (t) => jobTitle(t.job) },
              { key: 'route', header: 'Route', render: (t) => `${t.job?.origin.split(',')[0]} → ${t.job?.destination.split(',')[0]}` },
              { key: 'truck', header: 'Truck', render: (t) => t.truckPlate },
              { key: 'dates', header: 'Dates', render: (t) => `${t.pickupDate} → ${t.deliveryDate}` },
              { key: 'earnings', header: 'Earnings', align: 'right', render: (t) => formatNaira(jobRate(t.job)) },
              { key: 'status', header: 'Status', render: (t) => <Badge tone={tripHealthTone(tripHealth(t))} dot>{tripHealth(t)}</Badge> },
            ]} />
          ) : <EmptyState icon="route" title="No trips yet" description="Trips appear once this driver is dispatched on a job." />)}

          {tab === 'activity' && (activity.length
            ? <Timeline items={activity.map((a) => ({ title: a.title, time: a.time, description: a.description, state: a.tone === 'danger' ? 'danger' : a.tone === 'warning' ? 'warning' : 'done', icon: 'check' }))} />
            : <EmptyState icon="activity" title="No activity yet" />)}

          {tab === 'ratings' && (
            <div className={styles.ratings}>
              <Card tone="sunk" className={styles.ratingSummary}>
                <span className={styles.bigRating}>{driver.rating?.toFixed(1) ?? '—'}</span>
                <Stars rating={driver.rating || 0} size={16} />
                <span className="tk-meta">{driver.reviewCount} ratings from forwarders</span>
                <div className={styles.breakdown}>
                  {breakdown.map((row) => (
                    <div key={row.stars}>
                      <span>{row.stars} ★</span>
                      <ProgressBar value={row.pct} height={8} color={row.stars >= 4 ? 'var(--tk-success)' : row.stars === 3 ? 'var(--tk-warning)' : 'var(--tk-danger)'} />
                      <small>{row.count}</small>
                    </div>
                  ))}
                </div>
                <span className="tk-meta">Breakdown of the {reviews.length} written review(s) below.</span>
              </Card>
              <div className={styles.reviewList}>
                {reviews.length === 0
                  ? <EmptyState icon="message-square" title="No written feedback yet" description="Forwarders can rate a driver after each delivery." />
                  : reviews.map((r) => <ReviewRow key={r.id} review={r} onJob={(id) => navigate(`/jobs/${id}`)} />)}
              </div>
            </div>
          )}

          {tab === 'documents' && (
            <ComplianceChecklist
              title="Driver Documents" description="Required to dispatch this driver on trips. Trip paperwork lives on each trip."
              requirements={DRIVER_REQUIREMENTS} docs={docs}
              onUpload={(req) => setUploadType(req.type)} onOpen={(doc) => navigate(`/documents/${doc.id}`)}
              style={{ boxShadow: 'none', border: 0 }}
            />
          )}
        </div>
      </Card>

      <AssignTruckModal driver={driver} open={assignOpen} onClose={() => setAssignOpen(false)} onDone={(plate) => { setAssignOpen(false); showToast(`${driver.name} assigned to ${plate}.`); }} />
      <RemoveDriverModal truck={truck} open={removeOpen} onClose={() => setRemoveOpen(false)} onDone={() => { setRemoveOpen(false); showToast(`${driver.name} removed from ${truck?.plate}.`); }} />
      <UploadDocumentModal
        open={!!uploadType} onClose={() => setUploadType(null)} ownerType="driver" ownerId={driver.id} ownerLabel={driver.name}
        requirements={DRIVER_REQUIREMENTS} initialType={uploadType}
        onDone={(doc) => { setUploadType(null); showToast(`${doc.name} submitted for review.`); }}
      />
      <Toast message={toast} />
    </div>
  );
}

function ReviewRow({ review, onJob }) {
  return (
    <div className={styles.review}>
      <div className={styles.reviewHead}>
        <Stars rating={review.rating} />
        <strong>{review.poster}</strong>
        <span className="tk-meta">{review.date}</span>
      </div>
      <p>“{review.comment}”</p>
      {review.jobId?.startsWith('TK-') && <button type="button" className={styles.link} onClick={() => onJob(review.jobId)}>{review.jobId}</button>}
    </div>
  );
}

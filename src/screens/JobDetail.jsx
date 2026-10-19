'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useNavigate, useParams } from '../router.js';
import {
  Avatar, Badge, Button, Card, DataTable, DropdownMenu, EmptyState, Icon, IconButton, LabelValue, Modal,
  PageHeader, ProgressBar, SectionCard, Select, SkeletonRow, Tabs, Textarea, TextField,
} from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { assignTruckToJob, placeBid, toggleSaveJob, withdrawBid } from '../mock/api.js';
import { useGetJobDetailQuery, useSendJobMessageMutation } from '../store/features/jobs/jobsApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import {
  MIN_BID_AMOUNT, closesInTone, getBidValidationError, hasCargoPhotos, isMarketplaceJob, jobRate, jobStatusTone, jobTitle, suggestedBidRange,
} from '../domain/jobs.js';
import {
  dispatchSummary, estimateDuration, isDriverFree, isTruckFree, tripHealth, tripHealthTone, tripsForJob, shortPlace,
} from '../domain/trips.js';
import { jobEarnings, jobReceipt, payoutStatusTone } from '../domain/payouts.js';
import { formatNaira } from '../mock/format.js';
import { ReceiptModal } from '../components/Receipt.jsx';
import { CargoThumb } from '../components/CargoThumb.jsx';
import { MessageModal } from '../components/MessageModal.jsx';
import { RouteMap } from '../components/RouteMap.jsx';
import { Toast, copyLink, useToast } from '../components/Toast.jsx';
import { JobFlag, RequirementList, Stars, posterFor } from './Jobs.jsx';
import styles from './JobDetail.module.css';

const amountLabel = (value) => typeof value === 'number' && Number.isFinite(value) ? formatNaira(value) : '—';
const distanceLabel = (value) => typeof value === 'number' && Number.isFinite(value) ? `~ ${value.toLocaleString()} km` : '—';
const weightLabel = (value) => typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString()} kg` : '—';

function KeyFact({ icon, tone = 'blue', label, value, sub, link, onLink }) {
  return (
    <div className={styles.keyFact}>
      <span className={styles.keyIcon} data-tone={tone}><Icon name={icon} size={20} /></span>
      <span className={styles.keyCopy}>
        <small>{label}</small>
        <strong>{value}</strong>
        {sub && <small>{sub}</small>}
        {link && <button type="button" onClick={onLink}>{link}</button>}
      </span>
    </div>
  );
}

function BidCard({ job, onToast }) {
  const [amount, setAmount] = useState(job.budget == null ? '' : String(job.budget));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [low, high] = job.apiBacked ? [null, null] : suggestedBidRange(job);
  const submitting = useRef(false);

  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    const validationError = getBidValidationError(amount, message);
    if (validationError) { setError(validationError); return; }
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      if (job.apiBacked) throw new Error('Company bidding is currently unavailable.');
      await placeBid(job.id, Number(amount), message);
      onToast(`Bid submitted for ${job.id}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className={styles.bidForm}>
        <div className={styles.bidRow}>
          <TextField
            label={job.trucksRequired > 1 ? 'Bid Amount per Truck (₦)' : 'Bid Amount (₦)'} type="number" min={MIN_BID_AMOUNT} required disabled={busy}
            value={amount} onChange={(e) => setAmount(e.target.value)} error={error || undefined}
          />
          <span className={styles.range}>
            <small>Suggested range</small>
            <strong>{amountLabel(low)} – {amountLabel(high)}</strong>
          </span>
        </div>
        {job.trucksRequired > 1 && (
          <span className="tk-meta">{job.trucksRequired} trucks required · Total {formatNaira(Number(amount || 0) * job.trucksRequired)}</span>
        )}
        <Textarea
          label="Add a message (optional)" rows={3} maxLength={500} value={message} disabled={busy}
          onChange={(e) => setMessage(e.target.value)} placeholder="Introduce your company and why you're the best fit for this job..."
        />
        <Button type="submit" size="lg" icon="send" fullWidth disabled={busy || !!getBidValidationError(amount, message)}>{busy ? 'Submitting…' : 'Place Bid'}</Button>
        {job.closesInDays != null && (
          <span className={styles.closesLine}>
            Bidding closes in <Icon name="clock-3" size={15} color="var(--tk-ink-700)" />
            <strong>{job.closesInDays} day{job.closesInDays === 1 ? '' : 's'}</strong>
          </span>
        )}
      </form>
    </Card>
  );
}

function MyBidCard({ job, onToast }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  async function withdraw() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await withdrawBid(job.id);
      onToast('Bid withdrawn.');
    } catch (err) {
      setError(err instanceof Error ? err.message : getApiErrorMessage(err));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <SectionCard title="Your Bid" action={<Badge tone="purple">Awaiting response</Badge>}>
      <div style={{ display: 'grid', gap: 10 }}>
        <span style={{ font: '700 26px/1 var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{formatNaira(job.myBid.amount)}</span>
        <span className="tk-meta">
          {job.trucksRequired > 1 ? `Per truck · ${job.trucksRequired} trucks · Total ${formatNaira(job.myBid.amount * job.trucksRequired)} · ` : ''}
          Submitted {job.myBid.submittedAt}
        </span>
        {job.myBid.message && <p className={styles.quote}>“{job.myBid.message}”</p>}
        <Button
          variant="danger" disabled={busy}
          onClick={withdraw}
        >
          {busy ? 'Withdrawing…' : 'Withdraw Bid'}
        </Button>
        {error && <span role="alert" style={{ color: 'var(--tk-danger)', font: '500 13px/18px var(--tk-font-sans)' }}>{error}</span>}
      </div>
    </SectionCard>
  );
}

function DispatchCard({ job, summary, onDispatch }) {
  const done = summary.remaining === 0;
  return (
    <SectionCard title="Truck Dispatch" action={<Badge tone={jobStatusTone(job.status)} dot>{job.status}</Badge>}>
      <div style={{ display: 'grid', gap: 14 }}>
        <ProgressBar
          value={summary.dispatched ?? 0} max={summary.required ?? 100} height={8}
          label="Trucks dispatched" caption={`${summary.dispatched ?? '—'} of ${summary.required ?? '—'}`}
          color={done ? 'var(--tk-success)' : 'var(--tk-blue)'}
        />
        <div className={styles.miniGrid}>
          <LabelValue layout="stack" label="Rate per truck" value={job.apiBacked ? '—' : formatNaira(jobRate(job))} />
          <LabelValue layout="stack" label="Contract value" value={job.apiBacked ? '—' : formatNaira(jobRate(job) * summary.required)} />
          <LabelValue layout="stack" label="Delivered" value={`${summary.completed ?? '—'} of ${summary.required ?? '—'}`} />
          <LabelValue layout="stack" label="Still to dispatch" value={summary.remaining ?? '—'} valueTone={summary.remaining == null ? undefined : summary.remaining ? 'var(--tk-warning)' : 'var(--tk-success)'} />
        </div>
        {job.status === 'In Progress' && (
          <Button size="lg" icon="truck" fullWidth disabled={done || job.apiBacked} onClick={onDispatch}>
            {done ? 'All trucks dispatched' : `Dispatch Truck (${summary.remaining ?? '—'} left)`}
          </Button>
        )}
      </div>
    </SectionCard>
  );
}

function DispatchModal({ job, open, onClose, onDone }) {
  const trucks = useCollection('trucks') || [];
  const drivers = useCollection('drivers') || [];
  const trips = useCollection('trips') || [];
  const freeTrucks = trucks.filter((t) => isTruckFree(t, trips));
  const freeDrivers = drivers.filter((d) => isDriverFree(d, trips));
  const [plate, setPlate] = useState('');
  const [driverId, setDriverId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  useEffect(() => { if (open) { setPlate(''); setDriverId(''); setError(''); } }, [open]);

  function pickTruck(value) {
    setPlate(value);
    const truck = trucks.find((t) => t.plate === value);
    if (truck?.driverId && freeDrivers.some((d) => d.id === truck.driverId)) setDriverId(truck.driverId);
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    if (!plate || !driverId) { setError('Select a truck and a driver.'); return; }
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const trip = await assignTruckToJob(job.id, plate, driverId);
      onDone(trip);
    } catch (err) {
      setError(err.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open} onClose={() => { if (!submitting.current) onClose(); }} title="Dispatch Truck" width={500}
      description={`${jobTitle(job)} · ${job.origin} → ${job.destination}`}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button form="dispatch-form" type="submit" icon="truck" disabled={busy || !plate || !driverId}>{busy ? 'Dispatching…' : 'Create Trip'}</Button></>}
    >
      <form id="dispatch-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <span className="tk-meta">Each truck you dispatch becomes its own trip with a separate timeline, documents and costs.</span>
        <Select
          label="Truck" value={plate} placeholder={freeTrucks.length ? 'Select an available truck' : 'No trucks available'} disabled={busy}
          options={freeTrucks.map((t) => ({ value: t.plate, label: `${t.plate} · ${t.makeModel} · ${t.location}` }))}
          onChange={(e) => pickTruck(e.target.value)}
        />
        <Select
          label="Driver" value={driverId} placeholder={freeDrivers.length ? 'Select an available driver' : 'No drivers available'} disabled={busy}
          options={freeDrivers.map((d) => ({ value: d.id, label: `${d.name} · ${d.licenseClass}` }))}
          onChange={(e) => setDriverId(e.target.value)}
        />
        {error && <span style={{ color: 'var(--tk-danger)', font: '500 13px/18px var(--tk-font-sans)' }}>{error}</span>}
      </form>
    </Modal>
  );
}

function EarningsCard({ earnings, onReceipt }) {
  return (
    <SectionCard
      title="Earnings" description="Per delivered trip, at the agreed rate per truck."
      action={earnings?.rows.length > 0 && <Button size="sm" variant="secondary" icon="receipt" onClick={onReceipt}>View Receipt</Button>}
    >
      {earnings === null ? <span className="tk-meta">—</span> : earnings.rows.length === 0 ? <span className="tk-meta">Earnings appear once a trip on this job is delivered.</span> : (
        <div style={{ display: 'grid' }}>
          {earnings.rows.map((row) => (
            <div key={row.trip.id} className={styles.earnRow}>
              <span><strong>{row.trip.id}</strong><small>{row.trip.truckPlate} · Delivered {row.trip.deliveryDate}</small></span>
              <Badge tone={row.payout ? payoutStatusTone(row.payout.status) : 'warning'}>{row.payout ? row.payout.status : 'Not paid out'}</Badge>
              <strong>{formatNaira(row.gross)}</strong>
            </div>
          ))}
          <LabelValue label="Gross earnings" value={formatNaira(earnings.totals.gross)} />
          <LabelValue label="Trukkas service fee" value={`-${formatNaira(earnings.totals.fee)}`} />
          <LabelValue label="Net earnings" value={formatNaira(earnings.totals.net)} valueTone="var(--tk-blue)" style={{ borderTop: '1px solid var(--tk-line)' }} />
        </div>
      )}
    </SectionCard>
  );
}

function JobRatingCard({ review, unavailable = false }) {
  return (
    <SectionCard title="Forwarder Rating" description="How the forwarder rated this job once it was completed.">
      {review ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong style={{ font: '700 22px/28px var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{review.rating.toFixed(1)}</strong>
            <Stars rating={review.rating} />
          </span>
          {review.comment && <p className={styles.body} style={{ margin: 0 }}>“{review.comment}”</p>}
          <span className="tk-meta">{review.poster} · {review.date}</span>
        </div>
      ) : <span className="tk-meta">{unavailable ? '—' : 'The forwarder hasn’t rated this job yet.'}</span>}
    </SectionCard>
  );
}

function CompanyModal({ poster, open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={poster.name} width={440} footer={<Button onClick={onClose}>Close</Button>}>
      <div style={{ display: 'grid' }}>
        <LabelValue label="Verification" value={poster.verified == null ? '—' : poster.verified ? 'Verified' : 'Unverified'} valueTone={poster.verified == null ? undefined : poster.verified ? 'var(--tk-success)' : 'var(--tk-warning)'} />
        <LabelValue label="Rating" value={poster.rating ? `${poster.rating} / 5` : '—'} />
        <LabelValue label="Jobs posted on Trukkas" value={poster.jobsPosted ?? '—'} />
      </div>
    </Modal>
  );
}

export function JobDetailFromQuery() {
  const params = useSearchParams();
  const ids = params.getAll('jobId');
  const jobId = ids.length === 1 ? ids[0].trim() : '';
  return <JobDetail key={jobId} apiJobId={jobId} />;
}

export function JobDetail({ apiJobId } = {}) {
  const params = useParams();
  const jobId = apiJobId ?? params.jobId;
  const navigate = useNavigate();
  const jobs = useCollection('jobs') || [];
  const allTrips = useCollection('trips') || [];
  const payouts = useCollection('payoutRequests') || [];
  const company = useCollection('companyProfile')?.[0];
  const reviews = useCollection('reviews') || [];
  const fixtureJob = apiJobId === undefined ? jobs.find((j) => j.id === jobId) : null;
  const live = !fixtureJob;
  const { currentData: apiJob, error, isFetching } = useGetJobDetailQuery(jobId, { skip: !live || !jobId, refetchOnMountOrArgChange: true });
  const [sendMessage] = useSendJobMessageMutation();
  const job = live ? apiJob : fixtureJob;
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [infoTab, setInfoTab] = useState('requirements');
  const [moreOpen, setMoreOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [toast, showToast] = useToast();
  const [saving, setSaving] = useState(false);
  const savingJob = useRef(false);

  const jobTrips = useMemo(() => live ? null : tripsForJob(allTrips, jobId).sort((a, b) => a.id.localeCompare(b.id)), [allTrips, jobId, live]);
  const similar = useMemo(() => {
    if (!job || live) return [];
    return jobs.filter((j) => j.id !== job.id && isMarketplaceJob(j))
      .sort((a, b) => Number(b.category === job.category) - Number(a.category === job.category))
      .slice(0, 3);
  }, [jobs, job, live]);

  if (live && isFetching && !job) return <SkeletonRow columns={3} />;

  if (!job) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title="Job not found" crumbs={[{ label: 'Jobs', onClick: () => navigate('/jobs') }, 'Job Details']} />
        <EmptyState icon="briefcase" title={error ? getApiErrorMessage(error) : 'This job could not be found'} description={error ? undefined : 'It may have been withdrawn by the forwarder.'} action={<Button variant="outline" onClick={() => navigate('/jobs')}>Back to Find Jobs</Button>} />
      </div>
    );
  }

  const poster = live ? job.poster : posterFor(job.postedBy);
  const marketplace = isMarketplaceJob(job);
  const summary = live ? { required: null, dispatched: null, completed: null, remaining: null } : dispatchSummary(job, jobTrips);
  const earnings = live ? null : jobEarnings(job, jobTrips, payouts);
  const tripDocs = jobTrips?.flatMap((t) => t.documents.map((d) => ({ ...d, tripId: t.id, truckPlate: t.truckPlate }))) ?? null;
  async function saveJob() {
    if (savingJob.current) return;
    if (live) { showToast('Saving jobs is currently unavailable.'); return; }
    savingJob.current = true;
    setSaving(true);
    try {
      const updated = await toggleSaveJob(job.id);
      showToast(updated.saved ? 'Job saved.' : 'Removed from saved jobs.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : getApiErrorMessage(err));
    } finally {
      savingJob.current = false;
      setSaving(false);
    }
  }
  async function copyJobId() {
    setMoreOpen(false);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable.');
      await navigator.clipboard.writeText(job.id);
      showToast('Job ID copied.');
    } catch {
      showToast('Could not copy the job ID. Please copy it manually.');
    }
  }
  function downloadDocument(doc) {
    const url = typeof doc.url === 'string' && /^https?:\/\//i.test(doc.url) ? doc.url : null;
    if (!url) { showToast('This document is currently unavailable for download.'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  const openMap = () => document.getElementById('job-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <div className={styles.page}>
      <PageHeader
        crumbs={marketplace
          ? [{ label: 'Jobs', onClick: () => navigate('/jobs') }, { label: 'Find Jobs', onClick: () => navigate('/jobs') }, 'Job Details']
          : [{ label: 'My Jobs', onClick: () => navigate('/my-jobs') }, 'Job Details']}
        title={jobTitle(job)}
        meta={<>{marketplace ? <JobFlag job={job} /> : <Badge tone={jobStatusTone(job.status)} dot>{job.status}</Badge>}</>}
        actions={
          <>
            {marketplace && (
              <Button variant="outline" icon={job.saved ? 'bookmark-check' : 'bookmark'} disabled={saving} onClick={saveJob}>
                {job.saved ? 'Saved' : 'Save'}
              </Button>
            )}
            <Button variant="outline" icon="share-2" onClick={() => copyLink(showToast)}>Share</Button>
            <div style={{ position: 'relative' }}>
              <IconButton icon="ellipsis" tone="outline" size={38} label="More actions" onClick={() => setMoreOpen((v) => !v)} />
              {moreOpen && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 30 }}>
                  <DropdownMenu width={210} items={[
                    { label: 'Copy Job ID', icon: 'copy', onClick: copyJobId },
                    { label: 'Contact Forwarder', icon: 'message-square', onClick: () => { setMoreOpen(false); setContactOpen(true); } },
                    { divider: true },
                    { label: 'Report this Job', icon: 'flag', tone: 'danger', onClick: () => { setMoreOpen(false); navigate('/support'); } },
                  ]} />
                </div>
              )}
            </div>
          </>
        }
      />

      <div className={styles.metaLine}>
        <span>{live ? job.number : job.id}</span>
        <span>Posted {job.postedAgo || job.postedOn}</span>
        {marketplace && job.closesInDays != null && (
          <span style={{ color: closesInTone(job.closesInDays) }}><Icon name="clock-3" size={14} /> Closes in {job.closesInDays} day{job.closesInDays === 1 ? '' : 's'}</span>
        )}
        {job.trucksRequired > 1 && <span className={styles.trucksMeta}><Icon name="truck" size={14} /> {job.trucksRequired} trucks required</span>}
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.intro}>
            <span>{job.jobType} · {job.cargoType}</span>
            <p>{job.description || job.cargoDescription}</p>
          </div>

          {hasCargoPhotos(job) && (
            <div className={styles.gallery} aria-label="Cargo photos from the forwarder">
              <CargoThumb category={job.category} width="100%" height="100%" iconSize={56} />
              {[0, 1, 2].map((i) => <CargoThumb key={i} category={job.category} width="100%" height="100%" iconSize={30} />)}
              <CargoThumb category={job.category} width="100%" height="100%" iconSize={30}>
                {job.photos > 4 && <span className={styles.morePhotos}><strong>+{job.photos - 4}</strong>more photos</span>}
              </CargoThumb>
            </div>
          )}

          <SectionCard title="Key Information">
            <div className={styles.keyGrid}>
              <KeyFact icon="map-pin" tone="green" label="Pickup Location" value={job.origin} link="View on Map" onLink={openMap} />
              <KeyFact icon="map-pin" tone="red" label="Delivery Location" value={job.destination} link="View on Map" onLink={openMap} />
              <KeyFact icon="calendar" label="Pickup Date" value={job.pickupDate} />
              <KeyFact icon="calendar" label="Delivery Date" value={job.deliveryDate} />
              <KeyFact icon="container" tone="purple" label="Cargo Type" value={job.category} sub={job.cargoType} />
              <KeyFact icon="weight" tone="green" label="Weight" value={weightLabel(job.weightKg)} />
              <KeyFact icon="layers" label="Quantity" value={job.quantity} />
              {job.trucksRequired > 1
                ? <KeyFact icon="truck" label="Trucks Required" value={job.trucksRequired} />
                : <KeyFact icon="truck" label="Trip Type" value={job.tripType} />}
              <KeyFact icon="box" tone="neutral" label="Cargo Value" value={amountLabel(job.cargoValue)} />
              <KeyFact icon="shield-check" label="Insurance" value={job.insurance} />
            </div>
          </SectionCard>

          <div className={styles.twoUp}>
            <SectionCard title="Route">
              <div className={styles.routeLine}>
                <span className={styles.routeStart} />
                <span className={styles.routeDash} />
                <span className={styles.routeEnd} />
              </div>
              <div className={styles.routeLabels}>
                <span><strong>{job.origin.split(',')[0]}</strong><small>{job.origin.split(',').slice(1).join(',').trim() || '—'}</small></span>
                <span style={{ textAlign: 'center' }}><strong style={{ fontWeight: 500 }}>{distanceLabel(job.distanceKm)}</strong><small>Estimated {live ? '—' : estimateDuration(job.distanceKm)}</small></span>
                <span style={{ textAlign: 'right' }}><strong>{shortPlace(job.destination)}</strong><small>{job.destination.split(',').slice(1).join(',').trim() || '—'}</small></span>
              </div>
            </SectionCard>
            <SectionCard title="Cargo Description">
              <p className={styles.body}>{job.cargoDescription}</p>
              {job.specialInstructions && <p className={styles.body} style={{ marginTop: 8 }}>{job.specialInstructions}</p>}
            </SectionCard>
          </div>

          {!marketplace && (
            <SectionCard
              title={`Trips for this Job (${jobTrips?.length ?? '—'})`}
              description={`${summary.dispatched ?? '—'} of ${summary.required ?? '—'} trucks dispatched · ${summary.completed ?? '—'} delivered`}
              action={job.status === 'In Progress' && summary.remaining > 0 && <Button size="sm" icon="plus" onClick={() => setDispatchOpen(true)}>Dispatch Truck</Button>}
              pad="none"
            >
              {jobTrips === null ? <span className="tk-meta">—</span> : jobTrips.length === 0 ? (
                <div style={{ padding: 24 }}><EmptyState icon="truck" title="No trucks dispatched yet" description="Dispatch a truck to create the first trip for this job." /></div>
              ) : (
                <DataTable
                  rows={jobTrips} rowKey={(t) => t.id} onRowClick={(t) => navigate(`/trips/${t.id}`)}
                  columns={[
                    { key: 'id', header: 'Trip ID', render: (t) => <strong style={{ color: 'var(--tk-blue)' }}>{t.id}</strong> },
                    { key: 'truck', header: 'Truck / Driver', render: (t) => <span style={{ display: 'grid' }}><span>{t.truckPlate}</span><span className="tk-meta">{t.driverName || '—'}</span></span> },
                    { key: 'dates', header: 'Dates', render: (t) => <span style={{ display: 'grid' }}><span>{t.pickupDate}</span><span className="tk-meta">→ {t.deliveryDate}</span></span> },
                    { key: 'progress', header: 'Progress', render: (t) => <ProgressBar value={t.progress} caption={`${t.progress}%`} style={{ minWidth: 110 }} /> },
                    { key: 'status', header: 'Status', render: (t) => <Badge tone={tripHealthTone(tripHealth(t))} dot>{tripHealth(t)}</Badge> },
                  ]}
                />
              )}
            </SectionCard>
          )}

          <Card pad="none">
            <div style={{ padding: '0 var(--tk-card-pad)' }}>
              <Tabs value={infoTab} onChange={setInfoTab} items={[
                { value: 'requirements', label: 'Requirements' },
                { value: 'documents', label: 'Documents' },
                { value: 'additional', label: 'Additional Information' },
              ]} />
            </div>
            <div className={styles.infoBody}>
              {infoTab === 'requirements' && (
                <>
                  <RequirementList items={job.requirements} />
                  {job.specialNotes?.length > 0 && (
                    <div className={styles.specialNotes}>
                      <strong><Icon name="info" size={16} color="var(--tk-blue)" /> Special Notes</strong>
                      <ul>{job.specialNotes.map((note) => <li key={note}>{note}</li>)}</ul>
                    </div>
                  )}
                </>
              )}
              {infoTab === 'documents' && (
                <div className={styles.docList}>
                  <h4 className={styles.docGroup}>Shared by the forwarder</h4>
                  {job.documents === null ? <span className="tk-meta">—</span> : job.documents.length === 0 && <span className="tk-meta">The forwarder will share shipping documents once the job is awarded.</span>}
                  {job.documents?.map((doc) => (
                    <div key={doc.name}>
                      <Icon name="file-text" size={18} color="var(--tk-blue)" />
                      <span><strong>{doc.name}</strong><small>{doc.size}</small></span>
                      <IconButton icon="download" tone="outline" size={30} label={`Download ${doc.name}`} onClick={() => downloadDocument(doc)} />
                    </div>
                  ))}
                  {!marketplace && (
                    <>
                      <h4 className={styles.docGroup}>Trip paperwork ({tripDocs?.length ?? '—'})</h4>
                      {tripDocs === null ? <span className="tk-meta">—</span> : tripDocs.length === 0 && <span className="tk-meta">Waybills, pickup and delivery notes uploaded on this job’s trips appear here.</span>}
                      {tripDocs?.map((doc) => (
                        <div key={doc.tripId + doc.name}>
                          <Icon name="file-text" size={18} color={doc.status === 'Uploaded' ? 'var(--tk-success)' : 'var(--tk-ink-300)'} />
                          <span><strong>{doc.name}</strong><small>{doc.tripId} · {doc.truckPlate} · {doc.uploadedOn ? `Uploaded ${doc.uploadedOn}` : 'Pending'}</small></span>
                          {doc.status === 'Uploaded'
                            ? <IconButton icon="download" tone="outline" size={30} label={`Download ${doc.name}`} onClick={() => downloadDocument(doc)} />
                            : <Button size="sm" variant="outline" onClick={() => navigate(`/trips/${doc.tripId}/documents`)}>Open Trip</Button>}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
              {infoTab === 'additional' && (
                <div className={styles.additional}>
                  <LabelValue label="Job Type" value={job.jobType} />
                  <LabelValue label="Equipment" value={job.equipment} />
                  <LabelValue label="Payment Terms" value={job.paymentTerms} />
                  <LabelValue label="Negotiable" value={job.negotiable == null ? '—' : job.negotiable ? 'Yes' : 'No'} />
                  <LabelValue label="Posted On" value={job.postedOn} />
                  <LabelValue label="Distance" value={distanceLabel(job.distanceKm)} />
                </div>
              )}
            </div>
          </Card>
        </div>

        <aside className={styles.rail}>
          {job.status === 'Pending' && <BidCard key={job.id} job={job} onToast={showToast} />}
          {job.status === 'Quoted' && <MyBidCard key={job.id} job={job} onToast={showToast} />}
          {!marketplace && <DispatchCard job={job} summary={summary} onDispatch={() => setDispatchOpen(true)} />}
          {!marketplace && job.status !== 'Cancelled' && <EarningsCard earnings={earnings} onReceipt={() => setReceiptOpen(true)} />}
          {job.status === 'Completed' && <JobRatingCard unavailable={live} review={live ? null : reviews.find((r) => r.jobId === job.id)} />}

          <SectionCard title="Posted by">
            <div className={styles.poster}>
              <Avatar name={poster.name} size={48} tone="var(--tk-blue-soft)" style={{ color: 'var(--tk-blue)' }} />
              <span style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong>{poster.name}</strong>
                  {poster.verified && <Badge tone="success" dot>Verified</Badge>}
                </span>
                <span className="tk-meta" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Stars rating={poster.rating} /> {poster.rating ?? '—'} ({poster.jobsPosted ?? '—'} jobs)
                </span>
              </span>
            </div>
            <div className={styles.posterActions}>
              <Button variant="secondary" onClick={() => setCompanyOpen(true)}>View Company</Button>
              <Button variant="secondary" icon="message-square" onClick={() => setContactOpen(true)}>Contact Forwarder</Button>
            </div>
          </SectionCard>

          <div id="job-map">
            <RouteMap title="Pickup & Delivery Map" origin={job.origin} destination={job.destination} distanceKm={job.distanceKm} routeCoordinates={live ? job.routeCoordinates : undefined} duration={live ? null : undefined} height={200} />
          </div>

          {marketplace && similar.length > 0 && (
            <SectionCard title="Similar Jobs" action={<button type="button" className={styles.link} onClick={() => navigate('/jobs')}>View All</button>}>
              <div className={styles.similar}>
                {similar.map((j) => (
                  <button key={j.id} type="button" onClick={() => navigate(`/jobs/${j.id}`)}>
                    <CargoThumb category={j.category} width={60} height={48} />
                    <span className={styles.similarMain}>
                      <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><strong>{jobTitle(j)}</strong>{j.urgent && <Badge tone="danger" dot>Urgent</Badge>}</span>
                      <small>{shortPlace(j.origin)} → {shortPlace(j.destination)} · {j.weightKg.toLocaleString()} kg</small>
                    </span>
                    <strong className={styles.similarPrice}>{formatNaira(j.budget)}</strong>
                  </button>
                ))}
              </div>
            </SectionCard>
          )}
        </aside>
      </div>

      <DispatchModal
        job={job} open={dispatchOpen} onClose={() => setDispatchOpen(false)}
        onDone={(trip) => { setDispatchOpen(false); showToast(`${trip.id} created for ${trip.truckPlate}.`); }}
      />
      <MessageModal
        open={contactOpen} onClose={() => setContactOpen(false)} title="Contact Forwarder" recipient={poster.name}
        placeholder="Ask about pickup windows, cargo handling or documents..."
        onSend={async (content) => {
          await sendMessage({ jobId: job.id, receiverId: job.contactId, apiBacked: job.apiBacked, content }).unwrap();
          setContactOpen(false); showToast(`Message sent to ${poster.name}.`);
        }}
      />
      <CompanyModal poster={poster} open={companyOpen} onClose={() => setCompanyOpen(false)} />
      <ReceiptModal receipt={receiptOpen ? jobReceipt(job, earnings, { company, poster }) : null} open={receiptOpen} onClose={() => setReceiptOpen(false)} />
      <Toast message={toast} />
    </div>
  );
}

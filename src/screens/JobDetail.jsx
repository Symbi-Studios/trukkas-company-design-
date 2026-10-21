'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from '../router.js';
import {
  Avatar, Badge, Button, Card, DataTable, DropdownMenu, EmptyState, Icon, IconButton, LabelValue, Modal,
  PageHeader, ProgressBar, SectionCard, Select, SkeletonRow, Tabs, Textarea, TextField,
} from '../ds.js';
import { useDispatchJobDriverMutation, useGetAvailableJobsQuery, useGetJobDetailQuery, useGetJobDispatchOptionsQuery, useGetJobEarningsQuery, useGetJobPaperworkQuery, useGetJobReviewQuery, useSendJobMessageMutation, useSetSavedJobMutation, useSubmitJobBidMutation, useWithdrawJobBidMutation } from '../store/features/jobs/jobsApi.js';
import { receiptView } from '../store/features/jobs/jobContracts.js';
import { jobDetailHref } from '../domain/jobLinks.js';
import { tripDetailHref } from '../domain/tripLinks.js';
import { useGetCompanyTripsQuery } from '../store/features/trips/tripsApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import {
  MIN_BID_AMOUNT, closesInTone, getBidValidationError, hasCargoPhotos, isMarketplaceJob, jobStatusTone, jobTitle,
} from '../domain/jobs.js';
import {
  tripHealth, tripHealthTone, shortPlace,
} from '../domain/trips.js';
import { payoutStatusTone } from '../domain/payouts.js';
import { formatNaira } from '../mock/format.js';
import { ReceiptModal } from '../components/Receipt.jsx';
import { CargoThumb } from '../components/CargoThumb.jsx';
import { MessageModal } from '../components/MessageModal.jsx';
import { RouteMap } from '../components/RouteMap.jsx';
import { Toast, copyLink, useToast } from '../components/Toast.jsx';
import { JobFlag, RequirementList, Stars } from './Jobs.jsx';
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
  const [submitBid] = useSubmitJobBidMutation();
  const [amount, setAmount] = useState(job.budget == null ? '' : String(job.budget));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [low, high] = job.bidBounds;
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
      await submitBid({ jobId: job.id, amount: Number(amount), message }).unwrap();
      onToast(`Bid submitted for ${job.id}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : getApiErrorMessage(err));
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
            label="Bid Amount for the Job (₦)" type="number" min={MIN_BID_AMOUNT} required disabled={busy}
            value={amount} onChange={(e) => setAmount(e.target.value)} error={error || undefined}
          />
          <span className={styles.range}>
            <small>Suggested range</small>
            <strong>{amountLabel(low)} – {amountLabel(high)}</strong>
          </span>
        </div>
        {job.trucksRequired > 1 && (
          <span className="tk-meta">{job.trucksRequired} trucks requested · Whole-job bid {formatNaira(Number(amount || 0))}</span>
        )}
        <Textarea
          label="Add a message (optional)" rows={3} maxLength={500} value={message} disabled={busy}
          onChange={(e) => setMessage(e.target.value)} placeholder="Introduce your company and why you're the best fit for this job..."
        />
        <Button type="submit" size="lg" icon="send" fullWidth disabled={busy || !job.canBid || !!getBidValidationError(amount, message)}>{busy ? 'Submitting…' : 'Place Bid'}</Button>
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
  const [withdrawBid] = useWithdrawJobBidMutation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  async function withdraw() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await withdrawBid({ jobId: job.id, bidId: job.myBid.id }).unwrap();
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
        <span style={{ font: '700 26px/1 var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{amountLabel(job.myBid.amount)}</span>
        <span className="tk-meta">
          {job.trucksRequired > 1 ? `Whole job · ${job.trucksRequired} trucks requested · Total ${amountLabel(job.myBid.amount)} · ` : ''}
          Submitted {job.myBid.submittedAt}
        </span>
        {job.myBid.message && <p className={styles.quote}>“{job.myBid.message}”</p>}
        <Button
          variant="danger" disabled={busy || job.myBid.canWithdraw === false}
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
          <LabelValue layout="stack" label="Agreed job rate" value={amountLabel(job.contractValue)} />
          <LabelValue layout="stack" label="Contract value" value={amountLabel(job.contractValue)} />
          <LabelValue layout="stack" label="Delivered" value={`${summary.completed ?? '—'} of ${summary.required ?? '—'}`} />
          <LabelValue layout="stack" label="Still to dispatch" value={summary.remaining ?? '—'} valueTone={summary.remaining == null ? undefined : summary.remaining ? 'var(--tk-warning)' : 'var(--tk-success)'} />
        </div>
        {job.status === 'In Progress' && (
          <Button size="lg" icon="truck" fullWidth disabled={done || !job.canDispatch} onClick={onDispatch}>
            {done ? 'All trucks dispatched' : `Dispatch Truck (${summary.remaining ?? '—'} left)`}
          </Button>
        )}
      </div>
    </SectionCard>
  );
}

function DispatchModal({ job, open, onClose, onDone }) {
  const { data: drivers = [], error: optionsError, isLoading: optionsLoading } = useGetJobDispatchOptionsQuery(undefined, { skip: !open, refetchOnMountOrArgChange: true });
  const [dispatchDriver] = useDispatchJobDriverMutation();
  const [plate, setPlate] = useState('');
  const [driverId, setDriverId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const freeDrivers = drivers.filter((driver) => !plate || driver.truckId === plate);
  const freeTrucks = [...new Map(drivers.map((driver) => [driver.truckId, { ...driver, plate: driver.truckId, label: driver.plate }])).values()];

  useEffect(() => { if (open) { setPlate(''); setDriverId(''); setError(''); } }, [open]);

  function pickTruck(value) {
    setPlate(value);
    setDriverId(drivers.find((driver) => driver.truckId === value)?.id ?? '');
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    if (!plate || !driverId) { setError('Select a truck and a driver.'); return; }
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const trip = await dispatchDriver({ jobId: job.id, truckId: plate, driverId }).unwrap();
      onDone(trip);
    } catch (err) {
      setError(err instanceof Error ? err.message : getApiErrorMessage(err));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open} onClose={() => { if (!submitting.current) onClose(); }} title="Dispatch Truck" width={500}
      description={`${jobTitle(job)} · ${job.origin} → ${job.destination}`}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button form="dispatch-form" type="submit" icon="truck" disabled={busy || optionsLoading || !!optionsError || !plate || !driverId}>{busy ? 'Dispatching…' : 'Create Trip'}</Button></>}
    >
      <form id="dispatch-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <span className="tk-meta">This job runs as one trip on the selected driver’s assigned truck, with its own timeline, documents and costs.</span>
        <Select
          label="Truck" value={plate} placeholder={freeTrucks.length ? 'Select an available truck' : 'No trucks available'} disabled={busy}
          options={freeTrucks.map((t) => ({ value: t.plate, label: `${t.label} · ${t.makeModel} · ${t.location}` }))}
          onChange={(e) => pickTruck(e.target.value)}
        />
        <Select
          label="Driver" value={driverId} placeholder={freeDrivers.length ? 'Select an available driver' : 'No drivers available'} disabled={busy}
          options={freeDrivers.map((d) => ({ value: d.id, label: `${d.name} · ${d.licenseClass}` }))}
          onChange={(e) => setDriverId(e.target.value)}
        />
        {(error || optionsError) && <span style={{ color: 'var(--tk-danger)', font: '500 13px/18px var(--tk-font-sans)' }}>{error || getApiErrorMessage(optionsError)}</span>}
      </form>
    </Modal>
  );
}

function EarningsCard({ earnings, error, loading, onReceipt }) {
  return (
    <SectionCard
      title="Earnings" description="Amounts confirmed for this job and its trip."
      action={earnings?.complete && <Button size="sm" variant="secondary" icon="receipt" onClick={onReceipt}>View Receipt</Button>}
    >
      {loading ? <SkeletonRow columns={3} /> : error ? <EmptyState icon="wallet" title={getApiErrorMessage(error)} /> : !earnings ? <span className="tk-meta">—</span> : earnings.rows.length === 0 ? <span className="tk-meta">Earnings appear once a trip on this job is delivered.</span> : (
        <div style={{ display: 'grid' }}>
          {earnings.rows.map((row) => (
            <div key={row.trip.id} className={styles.earnRow}>
              <span><strong>{row.trip.number}</strong><small>{row.trip.truckPlate}</small></span>
              <Badge tone={row.payout ? payoutStatusTone(row.payout.status) : 'warning'}>{row.payout ? row.payout.status : 'Not paid out'}</Badge>
              <strong>{amountLabel(row.gross)}</strong>
            </div>
          ))}
          <LabelValue label="Gross earnings" value={amountLabel(earnings.totals.gross)} />
          <LabelValue label="Trukkas service fee" value={earnings.totals.fee === null ? '—' : `${earnings.totals.fee > 0 ? '-' : ''}${amountLabel(earnings.totals.fee)}`} />
          <LabelValue label="Net earnings" value={amountLabel(earnings.totals.net)} valueTone="var(--tk-blue)" style={{ borderTop: '1px solid var(--tk-line)' }} />
        </div>
      )}
    </SectionCard>
  );
}

function JobRatingCard({ jobId }) {
  const { currentData: data, error, isLoading } = useGetJobReviewQuery(jobId, { refetchOnMountOrArgChange: true });
  const review = data?.review;
  return (
    <SectionCard title="Forwarder Rating" description="How the forwarder rated this job once it was completed.">
      {isLoading ? <SkeletonRow variant="review" rows={1} /> : error ? <EmptyState icon="star" title={getApiErrorMessage(error)} /> : review ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong style={{ font: '700 22px/28px var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{review.rating.toFixed(1)}</strong>
            <Stars rating={review.rating} />
          </span>
          {review.comment && <p className={styles.body} style={{ margin: 0 }}>“{review.comment}”</p>}
          <span className="tk-meta">{review.poster} · {review.date}</span>
        </div>
      ) : <span className="tk-meta">{data ? 'The forwarder hasn’t rated this job yet.' : '—'}</span>}
    </SectionCard>
  );
}

function CompanyModal({ poster, open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={poster.name} width={440} footer={<Button onClick={onClose}>Close</Button>}>
      <div style={{ display: 'grid' }}>
        <LabelValue label="Verification" value={poster.verified == null ? '—' : poster.verified ? 'Verified' : 'Unverified'} valueTone={poster.verified == null ? undefined : poster.verified ? 'var(--tk-success)' : 'var(--tk-warning)'} />
        <LabelValue label="Rating" value={poster.rating != null ? `${poster.rating} / 5` : '—'} />
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
  const company = useSelector((state) => state.auth.account);
  const { currentData: job, error, isFetching } = useGetJobDetailQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const marketplaceJob = job && isMarketplaceJob(job);
  const { data: availableJobs } = useGetAvailableJobsQuery(undefined, { skip: !marketplaceJob });
  const { currentData: earnings = null, error: earningsError, isLoading: earningsLoading, isFetching: earningsFetching, refetch: refetchEarnings } = useGetJobEarningsQuery(job, { skip: !job || !!marketplaceJob });
  const { data: allTrips, error: tripsError, isLoading: tripsLoading } = useGetCompanyTripsQuery(undefined, { skip: !job || !!marketplaceJob });
  const [sendMessage] = useSendJobMessageMutation();
  const [setSavedJob] = useSetSavedJobMutation();
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [infoTab, setInfoTab] = useState('requirements');
  const { currentData: tripDocs = null, error: paperworkError, isFetching: paperworkLoading } = useGetJobPaperworkQuery(jobId, { skip: !job || !!marketplaceJob || infoTab !== 'documents', refetchOnMountOrArgChange: true });
  const [moreOpen, setMoreOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [toast, showToast] = useToast();
  const [saving, setSaving] = useState(false);
  const savingJob = useRef(false);

  const jobTrips = useMemo(() => allTrips ? allTrips.filter((trip) => trip.jobId === jobId) : null, [allTrips, jobId]);
  const similar = useMemo(() => {
    if (!job) return [];
    return (availableJobs ?? []).filter((j) => j.id !== job.id && isMarketplaceJob(j))
      .sort((a, b) => Number(b.category === job.category) - Number(a.category === job.category))
      .slice(0, 3);
  }, [availableJobs, job]);

  if (isFetching && !job) return <SkeletonRow variant="detail" />;

  if (!job) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title="Job not found" crumbs={[{ label: 'Jobs', onClick: () => navigate('/jobs') }, 'Job Details']} />
        <EmptyState icon="briefcase" title={error ? getApiErrorMessage(error) : 'This job could not be found'} description={error ? undefined : 'It may have been withdrawn by the forwarder.'} action={<Button variant="outline" onClick={() => navigate('/jobs')}>Back to Find Jobs</Button>} />
      </div>
    );
  }

  const poster = job.poster;
  const marketplace = isMarketplaceJob(job);
  const summary = job.dispatch;
  async function saveJob() {
    if (savingJob.current) return;
    savingJob.current = true;
    setSaving(true);
    try {
      if (job.saved === null) throw new Error('The API has not returned this job’s saved state.');
      const updated = await setSavedJob({ jobId: job.id, saved: !job.saved }).unwrap();
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
        <span>{job.number}</span>
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
              <CargoThumb category={job.category} width="100%" height="100%" iconSize={56}>{job.cargoPhotoUrl && <img src={job.cargoPhotoUrl} alt="Cargo shared by the forwarder" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}</CargoThumb>
              {[0, 1, 2].map((i) => <CargoThumb key={i} category={job.category} width="100%" height="100%" iconSize={30}><span>—</span></CargoThumb>)}
              <CargoThumb category={job.category} width="100%" height="100%" iconSize={30}><span>—</span>
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
                <span style={{ textAlign: 'center' }}><strong style={{ fontWeight: 500 }}>{distanceLabel(job.distanceKm)}</strong><small>Estimated —</small></span>
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
              {tripsLoading ? <SkeletonRow columns={4} /> : tripsError ? <EmptyState icon="route" title={getApiErrorMessage(tripsError)} /> : jobTrips === null ? <span className="tk-meta">—</span> : jobTrips.length === 0 ? (
                <div style={{ padding: 24 }}><EmptyState icon="truck" title="No trucks dispatched yet" description="Dispatch a truck to create the first trip for this job." /></div>
              ) : (
                <DataTable
                  rows={jobTrips} rowKey={(t) => t.id} onRowClick={(t) => navigate(tripDetailHref(t.id))}
                  columns={[
                    { key: 'id', header: 'Trip ID', render: (t) => <strong style={{ color: 'var(--tk-blue)' }}>{t.number}</strong> },
                    { key: 'truck', header: 'Truck / Driver', render: (t) => <span style={{ display: 'grid' }}><span>{t.truckPlate}</span><span className="tk-meta">{t.driverName || '—'}</span></span> },
                    { key: 'dates', header: 'Dates', render: (t) => <span style={{ display: 'grid' }}><span>{t.pickupDate}</span><span className="tk-meta">→ {t.deliveryDate}</span></span> },
                    { key: 'progress', header: 'Progress', render: (t) => <ProgressBar value={t.progress ?? 0} caption={t.progress === null ? '—' : `${t.progress}%`} style={{ minWidth: 110 }} /> },
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
                      {paperworkLoading ? <SkeletonRow variant="list" rows={3} /> : paperworkError ? <EmptyState icon="file-text" title={getApiErrorMessage(paperworkError)} /> : tripDocs === null ? <span className="tk-meta">—</span> : tripDocs.length === 0 && <span className="tk-meta">Waybills, pickup and delivery notes uploaded on this job’s trips appear here.</span>}
                      {!paperworkLoading && !paperworkError && tripDocs?.map((doc, index) => (
                        <div key={doc.id ?? index}>
                          <Icon name="file-text" size={18} color={doc.status === 'Uploaded' ? 'var(--tk-success)' : 'var(--tk-ink-300)'} />
                          <span><strong>{doc.name}</strong><small>{doc.tripId} · {doc.truckPlate} · {doc.uploadedOn ? `Uploaded ${doc.uploadedOn}` : 'Pending'}</small></span>
                          {doc.status === 'Uploaded'
                            ? <IconButton icon="download" tone="outline" size={30} label={`Download ${doc.name}`} onClick={() => downloadDocument(doc)} />
                            : <Button size="sm" variant="outline" onClick={() => navigate(tripDetailHref(doc.tripId, 'documents'))}>Open Trip</Button>}
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
          {!marketplace && job.status !== 'Cancelled' && <EarningsCard earnings={earnings} error={earningsError} loading={earningsLoading} onReceipt={() => setReceiptOpen(true)} />}
          {job.status === 'Completed' && <JobRatingCard jobId={job.id} />}

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
            <RouteMap title="Pickup & Delivery Map" origin={job.origin} destination={job.destination} distanceKm={job.distanceKm} routeCoordinates={job.routeCoordinates} duration={null} height={200} />
          </div>

          {marketplace && similar.length > 0 && (
            <SectionCard title="Similar Jobs" action={<button type="button" className={styles.link} onClick={() => navigate('/jobs')}>View All</button>}>
              <div className={styles.similar}>
                {similar.map((j) => (
                  <button key={j.id} type="button" onClick={() => navigate(jobDetailHref(j.id))}>
                    <CargoThumb category={j.category} width={60} height={48} />
                    <span className={styles.similarMain}>
                      <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><strong>{jobTitle(j)}</strong>{j.urgent && <Badge tone="danger" dot>Urgent</Badge>}</span>
                      <small>{shortPlace(j.origin)} → {shortPlace(j.destination)} · {weightLabel(j.weightKg)}</small>
                    </span>
                    <strong className={styles.similarPrice}>{amountLabel(j.budget)}</strong>
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
          await sendMessage({ jobId: job.id, receiverId: job.contactId, content }).unwrap();
          setContactOpen(false); showToast(`Message sent to ${poster.name}.`);
        }}
      />
      <CompanyModal poster={poster} open={companyOpen} onClose={() => setCompanyOpen(false)} />
      <ReceiptModal receipt={receiptOpen ? receiptView(job, earnings, company) : null} open={receiptOpen} onClose={() => setReceiptOpen(false)}
        title="Job Earnings Statement" description={job.number} loading={earningsFetching}
        error={earningsError ? getApiErrorMessage(earningsError) : undefined} onRetry={refetchEarnings} />
      <Toast message={toast} />
    </div>
  );
}

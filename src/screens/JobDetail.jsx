'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from '../router.js';
import {
  Avatar, Badge, Button, Card, DataTable, DropdownMenu, EmptyState, Icon, IconButton, LabelValue, Modal,
  PageHeader, ProgressBar, SectionCard, Select, SkeletonRow, Tabs, Textarea, TextField,
} from '../ds.js';
import { useSetJobDeclinedMutation, useDispatchJobDriverMutation, useGetAvailableJobsQuery, useGetJobDetailQuery, useGetJobDispatchOptionsQuery, useGetJobEarningsQuery, useGetJobPaperworkQuery, useGetJobReviewQuery, useSetSavedJobMutation, useWithdrawJobBidMutation } from '../store/features/jobs/jobsApi.js';
import { receiptView } from '../store/features/jobs/jobContracts.js';
import { jobDetailHref } from '../domain/jobLinks.js';
import { tripDetailHref } from '../domain/tripLinks.js';
import { useGetCompanyTripsQuery } from '../store/features/trips/tripsApi.js';
import { useGetFleetEligibilityQuery } from '../store/features/fleet/fleetApi.js';
import { TruckRestrictionBanner, blockedMessage } from '../components/MaintenanceCompliance.jsx';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { hasCargoPhotos, isMarketplaceJob, jobStatusTone, jobTitle } from '../domain/jobs.js';
import {
  tripHealth, tripHealthTone, shortPlace,
} from '../domain/trips.js';
import { payoutStatusTone } from '../domain/payouts.js';
import { formatNaira } from '../mock/format.js';
import { ReceiptModal } from '../components/Receipt.jsx';
import { CargoThumb } from '../components/CargoThumb.jsx';
import { BidForm } from '../components/BidForm.jsx';
import { JobLoadAssignments } from '../components/JobLoadAssignments.jsx';
import { RouteMap } from '../components/RouteMap.jsx';
import { Toast, copyLink, useToast } from '../components/Toast.jsx';
import { ReassignDriverModal } from '../components/TripStageCard.jsx';
import { LoadList, Stars, tonnesLabel } from './Jobs.jsx';
import styles from './JobDetail.module.css';

const amountLabel = (value) => typeof value === 'number' && Number.isFinite(value) ? formatNaira(value) : '—';
const distanceLabel = (value) => typeof value === 'number' && Number.isFinite(value) ? `~ ${value.toLocaleString()} km` : '—';

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

function BidCard({ job, matched, onToast }) {
  return <Card><BidForm job={job} matched={matched} onDone={onToast} /></Card>;
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
      setError(getApiErrorMessage(err));
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
          Whole job{job.trucksRequired > 1 ? ` · all ${job.trucksRequired} trucks` : ''} · Submitted {job.myBid.submittedAt}
          {job.myBid.expiresLabel ? ` · Expires ${job.myBid.expiresLabel} if not accepted` : ''}
        </span>
        {job.bidSlots?.remaining != null && <span className="tk-meta">{job.bidSlots.remaining} of {job.bidSlots.max ?? 3} bids left on this job. Withdrawing uses this bid up.</span>}
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

function DispatchCard({ job, summary, onDispatch, onReassign }) {
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
          <LabelValue layout="stack" label="Agreed price (whole job)" value={amountLabel(job.contractValue)} />
          <LabelValue layout="stack" label="Loads assigned" value={job.load ? `${job.loadAssigned ?? job.load.filter((i) => i.assignment).length} of ${job.loadTotal ?? job.load.length}` : '—'} />
          <LabelValue layout="stack" label="Delivered" value={`${summary.completed ?? '—'} of ${summary.required ?? '—'}`} />
          <LabelValue layout="stack" label="Still to dispatch" value={summary.remaining ?? '—'} valueTone={summary.remaining == null ? undefined : summary.remaining ? 'var(--tk-warning)' : 'var(--tk-success)'} />
        </div>
        {job.awaitingDriver && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Badge tone="purple">Waiting for {job.driverName ?? 'the driver'} to accept</Badge>
            <Button size="sm" variant="outline" icon="repeat" onClick={onReassign}>Change Driver</Button>
          </div>
        )}
        {job.status === 'In Progress' && !job.awaitingDriver && (
          <Button size="lg" icon="truck" fullWidth disabled={done || !job.canDispatch} onClick={onDispatch}>
            {done ? 'All trucks dispatched' : `Dispatch Truck (${summary.remaining ?? '—'} left)`}
          </Button>
        )}
      </div>
    </SectionCard>
  );
}

function DispatchModal({ job, open, onClose, onDone }) {
  const { currentData: loadedDrivers, error: optionsError, isFetching: optionsLoading } = useGetJobDispatchOptionsQuery(undefined, { skip: !open, refetchOnMountOrArgChange: true });
  const [dispatchDriver] = useDispatchJobDriverMutation();
  // Trucks with an active maintenance restriction cannot be dispatched. The
  // backend enforces this too; the picker only explains it up front.
  const { currentData: eligibility } = useGetFleetEligibilityQuery(undefined, { skip: !open, refetchOnMountOrArgChange: true });
  const [plate, setPlate] = useState('');
  const [driverId, setDriverId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const drivers = optionsError ? [] : loadedDrivers ?? [];
  const freeDrivers = drivers.filter((driver) => !plate || driver.truckId === plate);
  const freeTrucks = [...new Map(drivers.map((driver) => [driver.truckId, { ...driver, plate: driver.truckId, label: driver.plate }])).values()];
  const blockedView = (truckId) => eligibility?.[truckId]?.eligible === false ? eligibility[truckId] : null;
  const selectedBlock = plate ? blockedView(plate) : null;

  useEffect(() => { if (open) { setPlate(''); setDriverId(''); setError(''); } }, [open]);

  function pickTruck(value) {
    setPlate(value);
    setDriverId(drivers.find((driver) => driver.truckId === value)?.id ?? '');
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    if (optionsLoading || optionsError || !drivers.some((driver) => driver.id === driverId && driver.truckId === plate)) { setError('Select a truck and a driver.'); return; }
    if (selectedBlock) { setError(blockedMessage(selectedBlock)); return; }
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const trip = await dispatchDriver({ jobId: job.id, truckId: plate, driverId }).unwrap();
      onDone(trip);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open} onClose={() => { if (!submitting.current) onClose(); }} title="Dispatch Truck" width={500}
      description={`${jobTitle(job)} · ${job.origin} → ${job.destination}`}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button form="dispatch-form" type="submit" icon="truck" disabled={busy || optionsLoading || !!optionsError || !plate || !driverId || !!selectedBlock}>{busy ? 'Dispatching…' : 'Create Trip'}</Button></>}
    >
      <form id="dispatch-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <span className="tk-meta">The lead driver runs the trip steps (pickup, transit, delivery) on their own truck. {job.trucksRequired > 1 ? 'Then give each container or rack to a driver under Containers & Drivers.' : ''}</span>
        <Select
          label="Truck" value={plate} placeholder={freeTrucks.length ? 'Select an available truck' : 'No trucks available'} disabled={busy}
          options={freeTrucks.map((t) => ({ value: t.plate, label: blockedView(t.plate) ? `${t.label} · Unavailable: maintenance required` : `${t.label} · ${t.makeModel} · ${t.location}`, disabled: !!blockedView(t.plate) }))}
          onChange={(e) => pickTruck(e.target.value)}
        />
        <Select
          label="Driver" value={driverId} placeholder={freeDrivers.length ? 'Select an available driver' : 'No drivers available'} disabled={busy}
          options={freeDrivers.map((d) => ({ value: d.id, label: `${d.name} · ${d.licenseClass}` }))}
          onChange={(e) => setDriverId(e.target.value)}
        />
        <TruckRestrictionBanner view={selectedBlock} />
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
          {[['30% at pickup', earnings.split?.mobilization], ['70% after proof of delivery', earnings.split?.final]].map(([label, part]) => (
            <LabelValue key={label} label={label} value={!part ? '—' : `${amountLabel(part.amount)} · ${part.paid === true ? `released ${part.paidOn}` : part.paid === false ? 'held in escrow' : '—'}`} />
          ))}
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
        <LabelValue label="Jobs completed" value={poster.jobsCompleted ?? '—'} />
        <LabelValue label="Trust score" value={poster.trustScore != null ? `${poster.trustScore} / 100` : '—'} />
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
  const { currentData: loadedJob, error, isFetching } = useGetJobDetailQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const job = error ? undefined : loadedJob;
  const marketplaceJob = job && isMarketplaceJob(job);
  const { currentData: loadedAvailableJobs, error: availableError } = useGetAvailableJobsQuery(undefined, { skip: !marketplaceJob });
  const { currentData: loadedEarnings, error: earningsError, isLoading: earningsLoading, isFetching: earningsFetching, refetch: refetchEarnings } = useGetJobEarningsQuery(job, { skip: !job || !!marketplaceJob });
  const { currentData: loadedTrips, error: tripsError, isLoading: tripsLoading } = useGetCompanyTripsQuery(undefined, { skip: !job || !!marketplaceJob });
  const [setSavedJob] = useSetSavedJobMutation();
  const [setDeclined, { isLoading: declining }] = useSetJobDeclinedMutation();
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [infoTab, setInfoTab] = useState('requirements');
  const { currentData: loadedPaperwork, error: paperworkError, isFetching: paperworkLoading } = useGetJobPaperworkQuery(jobId, { skip: !job || !!marketplaceJob || infoTab !== 'documents', refetchOnMountOrArgChange: true });
  const [moreOpen, setMoreOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [toast, showToast] = useToast();
  const [saving, setSaving] = useState(false);
  const savingJob = useRef(false);

  const availableJobs = availableError ? undefined : loadedAvailableJobs;
  const allTrips = tripsError ? undefined : loadedTrips;
  const earnings = earningsError ? null : loadedEarnings ?? null;
  const tripDocs = paperworkError ? null : loadedPaperwork ?? null;
  const jobTrips = useMemo(() => allTrips ? allTrips.filter((trip) => trip.jobId === jobId) : null, [allTrips, jobId]);
  const similar = useMemo(() => {
    if (!job) return [];
    return (availableJobs ?? []).filter((j) => j.id !== job.id && isMarketplaceJob(j))
      .sort((a, b) => Number(b.category === job.category) - Number(a.category === job.category))
      .slice(0, 3);
  }, [availableJobs, job]);

  if (isFetching && !loadedJob) return <SkeletonRow variant="detail" />;

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
      if (job.saved === null) throw new Error('We couldn’t tell whether this job is saved. Please refresh and try again.');
      const updated = await setSavedJob({ jobId: job.id, saved: !job.saved }).unwrap();
      showToast(updated.saved ? 'Job saved.' : 'Removed from saved jobs.');
    } catch (err) {
      showToast(getApiErrorMessage(err));
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
        meta={<>{marketplace ? null : <Badge tone={jobStatusTone(job.status)} dot>{job.status}</Badge>}</>}
        actions={
          <>
            {marketplace && (
              <Button variant="outline" icon={job.saved ? 'bookmark-check' : 'bookmark'} disabled={saving} onClick={saveJob}>
                {job.saved ? 'Saved' : 'Save'}
              </Button>
            )}
            {marketplace && !job.myBid && (
              <Button variant="outline" icon="eye-off" disabled={declining} onClick={async () => {
                try { await setDeclined({ jobId: job.id, declined: true }).unwrap(); navigate('/jobs'); }
                catch (err) { showToast(err instanceof Error ? err.message : getApiErrorMessage(err)); }
              }}>Not Interested</Button>
            )}
            <Button variant="outline" icon="link" onClick={() => copyLink(showToast)}>Copy Link</Button>
            <div style={{ position: 'relative' }}>
              <IconButton icon="ellipsis" tone="outline" size={38} label="More actions" onClick={() => setMoreOpen((v) => !v)} />
              {moreOpen && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 30 }}>
                  <DropdownMenu width={210} items={[
                    { label: 'Copy Job ID', icon: 'copy', onClick: copyJobId },
                    { divider: true },
                    { label: 'Report this Job', icon: 'flag', tone: 'danger', onClick: () => { setMoreOpen(false); navigate(`/support/new?jobId=${encodeURIComponent(job.id)}`); } },
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
        {marketplace && job.offerCount != null && <span>{job.offerCount} offer{job.offerCount === 1 ? '' : 's'} so far</span>}
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
              {job.cargoPhotos.slice(0, 4).map((url, index) => (
                <CargoThumb key={url} category={job.category} width="100%" height="100%" iconSize={index ? 30 : 56}>
                  <img src={url} alt={`Cargo photo ${index + 1}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  {index === 3 && job.cargoPhotos.length > 4 && <span className={styles.morePhotos}><strong>+{job.cargoPhotos.length - 4}</strong>more photos</span>}
                </CargoThumb>
              ))}
            </div>
          )}

          <SectionCard title="Key Information">
            <div className={styles.keyGrid}>
              <KeyFact icon="anchor" tone="green" label="Pickup (port · terminal)" value={job.pickupPlace ?? job.origin} link="View on Map" onLink={openMap} />
              {job.jobType === 'Port-to-Port'
                ? <KeyFact icon="anchor" tone="red" label="Drop-off (port · terminal)" value={job.dropoffPlace ?? job.destination} link="View on Map" onLink={openMap} />
                : <KeyFact icon="map-pin" tone="red" label="Delivery Address" value={job.deliveryAddress ?? job.destination} link="View on Map" onLink={openMap} />}
              {job.jobType !== 'Port-to-Port' && job.category === 'Container' && <KeyFact icon="undo-2" label="Container Return" value={job.returnAddress ?? '—'} sub="The empty container goes back here" />}
              <KeyFact icon="calendar" label="TDO Date" value={job.tdoDate ?? job.pickupDate} />
              {!marketplace && <KeyFact icon="calendar-check" label="Estimated Delivery" value={job.deliveryDate} />}
              <KeyFact icon="container" tone="purple" label="Cargo" value={job.category} sub={job.cargoDescription} />
              <KeyFact icon="weight" tone="green" label="Total Weight" value={tonnesLabel(job.weightTonnes)} />
              <KeyFact icon="layers" label={job.category === 'Break-bulk' ? 'Racks' : 'Containers'} value={job.quantity} sub={job.equipment !== '—' ? job.equipment : undefined} />
              <KeyFact icon="truck" label="Trucks Required" value={job.trucksRequired ?? '—'} />
              <KeyFact icon="box" tone="neutral" label="Cargo Value" value={job.cargoValue != null ? amountLabel(job.cargoValue) : 'Not declared'} />
              <KeyFact icon="shield-check" label="Insurance" value={job.insurance && job.insurance !== '—' ? job.insurance : 'Not declared'} />
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
                <span style={{ textAlign: 'center' }}><strong style={{ fontWeight: 500 }}>{distanceLabel(job.distanceKm)}</strong><small>{job.estimatedDuration ? `About ${job.estimatedDuration}` : 'Duration —'}</small></span>
                <span style={{ textAlign: 'right' }}><strong>{shortPlace(job.destination)}</strong><small>{job.destination.split(',').slice(1).join(',').trim() || '—'}</small></span>
              </div>
            </SectionCard>
            <SectionCard title="Cargo Description">
              <p className={styles.body}>{job.cargoDescription}</p>
              {job.specialInstructions && <p className={styles.body} style={{ marginTop: 8 }}>{job.specialInstructions}</p>}
            </SectionCard>
          </div>

          {!marketplace && (
            <JobLoadAssignments job={job} canAssign={['In Progress'].includes(job.status)} onToast={showToast} />
          )}

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
                { value: 'requirements', label: job.category === 'Break-bulk' ? 'Racks' : 'Containers' },
                { value: 'documents', label: 'Documents' },
                { value: 'additional', label: 'Additional Information' },
              ]} />
            </div>
            <div className={styles.infoBody}>
              {infoTab === 'requirements' && (
                <>
                  <LoadList job={job} />
                  {job.specialNotes?.length > 0 && (
                    <div className={styles.specialNotes}>
                      <strong><Icon name="info" size={16} color="var(--tk-blue)" /> Forwarder’s Instructions</strong>
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
                  <LabelValue label="Estimated Duration" value={job.estimatedDuration ?? '—'} />
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
          {job.status === 'Pending' && <BidCard key={job.id} job={job} matched={availableJobs ? availableJobs.some((j) => j.id === job.id) : null} onToast={showToast} />}
          {job.status === 'Quoted' && <MyBidCard key={job.id} job={job} onToast={showToast} />}
          {!marketplace && <DispatchCard job={job} summary={summary} onDispatch={() => setDispatchOpen(true)} onReassign={() => setReassignOpen(true)} />}
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
            </div>
          </SectionCard>

          <div id="job-map">
            <RouteMap title="Pickup & Delivery Map" origin={job.origin} destination={job.destination} distanceKm={job.distanceKm} routeCoordinates={job.routeCoordinates} duration={job.estimatedDuration} height={200} />
          </div>

          {marketplace && similar.length > 0 && (
            <SectionCard title="Similar Jobs" action={<button type="button" className={styles.link} onClick={() => navigate('/jobs')}>View All</button>}>
              <div className={styles.similar}>
                {similar.map((j) => (
                  <button key={j.id} type="button" onClick={() => navigate(jobDetailHref(j.id))}>
                    <CargoThumb category={j.category} width={60} height={48} />
                    <span className={styles.similarMain}>
                      <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><strong>{jobTitle(j)}</strong></span>
                      <small>{shortPlace(j.origin)} → {shortPlace(j.destination)} · {tonnesLabel(j.weightTonnes)}</small>
                    </span>
                    <strong className={styles.similarPrice}>{amountLabel(j.budget)}</strong>
                  </button>
                ))}
              </div>
            </SectionCard>
          )}
        </aside>
      </div>

      <ReassignDriverModal trip={{ jobId: job.id, driverId: job.driverId, driverAssigned: true }} open={reassignOpen} onClose={() => setReassignOpen(false)}
        onDone={(name) => { setReassignOpen(false); showToast(`${name} assigned. Waiting for them to accept.`); }} />
      <DispatchModal
        job={job} open={dispatchOpen} onClose={() => setDispatchOpen(false)}
        onDone={(trip) => { setDispatchOpen(false); showToast(`${trip.id} created for ${trip.truckPlate}.`); }}
      />
      <CompanyModal poster={poster} open={companyOpen} onClose={() => setCompanyOpen(false)} />
      <ReceiptModal receipt={receiptOpen ? receiptView(job, earnings, company) : null} open={receiptOpen} onClose={() => setReceiptOpen(false)}
        title="Job Earnings Statement" description={job.number} loading={earningsFetching}
        error={earningsError ? getApiErrorMessage(earningsError) : undefined} onRetry={refetchEarnings} />
      <Toast message={toast} />
    </div>
  );
}

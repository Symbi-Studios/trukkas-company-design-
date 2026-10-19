'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '../router.js';
import {
  Avatar, Badge, Button, Card, Checkbox, EmptyState, Icon, IconButton, LabelValue, Modal, PageHeader,
  Pagination, Select, SkeletonRow, Tabs, Textarea, TextField,
} from '../ds.js';
import { syncTopBarSearch } from '../pageSearch.js';
import { useGetAvailableJobsQuery, useGetJobDetailQuery, useSendJobMessageMutation, useSetSavedJobMutation, useSubmitJobBidMutation } from '../store/features/jobs/jobsApi.js';
import { emptyPoster } from '../store/features/jobs/jobContracts.js';
import { jobDetailHref } from '../domain/jobLinks.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import {
  JOB_CATEGORIES, JOB_SORTS, JOB_TYPES, MIN_BID_AMOUNT, closesInLabel, closesInTone, getBidValidationError, jobTitle,
} from '../domain/jobs.js';
import { posters } from '../mock/fixtures/companies.js';
import { formatNaira } from '../mock/format.js';
import { CargoThumb } from '../components/CargoThumb.jsx';
import { MessageModal } from '../components/MessageModal.jsx';
import { RouteMap } from '../components/RouteMap.jsx';
import { Toast, copyLink, useToast } from '../components/Toast.jsx';
import styles from './Jobs.module.css';

const EMPTY_FILTERS = { from: '', to: '', cargo: '', jobType: '', month: '', weight: '', savedOnly: false, multiTruck: false };
const WEIGHTS = [
  { value: 'light', label: 'Under 20,000 kg', test: (kg) => kg < 20000 },
  { value: 'medium', label: '20,000 – 30,000 kg', test: (kg) => kg >= 20000 && kg <= 30000 },
  { value: 'heavy', label: 'Over 30,000 kg', test: (kg) => kg > 30000 },
];

export function posterFor(id) {
  if (id && typeof id === 'object') return id.poster ?? emptyPoster;
  return posters.find((p) => p.id === id) || { name: '—', rating: null, jobsPosted: 0, verified: false };
}

const monthOf = (date) => date?.replace(/ \d+,/, '');
const time = (date) => new Date(date).getTime() || 0;
const matchesCategory = (job, category) => job.categories ? job.categories.includes(category) : job.category === category;

function FilterField({ label, icon, value, onChange, options, placeholder }) {
  return (
    <label className={styles.filterField}>
      {icon && <Icon name={icon} size={17} color="var(--tk-ink-400)" />}
      <span className={styles.filterCopy}>
        <span>{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{placeholder}</option>
          {options.map((o) => {
            const v = typeof o === 'string' ? o : o.value;
            return <option key={v} value={v}>{typeof o === 'string' ? o : o.label}</option>;
          })}
        </select>
      </span>
      <Icon name="chevron-down" size={16} color="var(--tk-ink-400)" />
    </label>
  );
}

export function Stars({ rating }) {
  if (rating == null) return null;
  return (
    <span className={styles.stars} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => <Icon key={n} name="star" filled size={12} color={n <= Math.round(rating) ? 'var(--tk-warning)' : 'var(--tk-line-strong)'} />)}
    </span>
  );
}

export function JobFlag({ job }) {
  if (job.featured) return <Badge tone="purple"><Icon name="star" size={12} />Featured</Badge>;
  if (job.urgent) return <Badge tone="danger" dot>Urgent</Badge>;
  return null;
}

function JobRow({ job, selected, saving, onSelect, onOpen, onSave }) {
  const closes = closesInLabel(job.closesInDays);
  return (
    <div
      role="button" tabIndex={0}
      className={`${styles.jobRow} ${selected ? styles.jobRowActive : ''}`}
      onClick={() => onSelect(job)}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(job); } }}
    >
      <CargoThumb category={job.category} width={88} height={70} />
      <div className={styles.jobMain}>
        <div className={styles.jobTitleRow}>
          <strong>{jobTitle(job)}</strong>
          <JobFlag job={job} />
          {job.status === 'Quoted' && <Badge tone="info">Bid placed</Badge>}
        </div>
        <div className={styles.route}>
          <Icon name="map-pin" size={15} color="var(--tk-blue)" /> {job.origin}
          <Icon name="arrow-right" size={14} color="var(--tk-ink-400)" />
          <Icon name="map-pin" size={15} color="var(--tk-blue)" /> {job.destination}
        </div>
        <div className={styles.jobMeta}>
          <span>{job.weightKg === null ? '—' : job.weightKg.toLocaleString() + ' kg'}</span>
          <span>{job.jobType}</span>
          <span>{job.equipment}</span>
          <span className={styles.underline}>{job.cargoType}</span>
          {job.trucksRequired > 1 && <span className={styles.trucks}><Icon name="truck" size={13} /> {job.trucksRequired} trucks</span>}
        </div>
      </div>
      <div className={`${styles.jobFact} ${styles.pickupFact}`}><span>Pickup</span><strong>{job.pickupDate}</strong></div>
      <div className={styles.jobFact}><span>Budget</span><strong>{(job.budget === null ? '—' : formatNaira(job.budget))}</strong></div>
      <div className={styles.jobActions}>
        {closes && (
          <span className={styles.closes} style={{ color: closesInTone(job.closesInDays) }}>
            <Icon name="hourglass" size={12} /> {closes}
          </span>
        )}
        <span className={styles.jobButtons}>
          <Button size="sm" variant={selected ? 'primary' : 'secondary'} onClick={(e) => { e.stopPropagation(); onOpen(job); }}>View Details</Button>
          <IconButton
            icon={job.saved ? 'bookmark-check' : 'bookmark'} tone="outline" size={32} label={job.saved ? 'Unsave job' : 'Save job'} disabled={saving}
            style={{ color: job.saved ? 'var(--tk-blue)' : undefined }}
            onClick={(e) => { e.stopPropagation(); onSave(job); }}
          />
        </span>
      </div>
    </div>
  );
}

function JobInspector({ job, onClose, onBid, onContact, onOpen, onShare }) {
  const [tab, setTab] = useState('details');
  const poster = posterFor(job);
  useEffect(() => setTab('details'), [job.id]);

  return (
    <Card pad="none" className={styles.inspector}>
      <div className={styles.inspectorHead}>
        <CargoThumb category={job.category} width={150} height={96} />
        <div className={styles.inspectorTools}>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <JobFlag job={job} />
            <Button size="sm" variant="outline" icon="share-2" onClick={onShare}>Share</Button>
            <IconButton icon="x" tone="outline" size={30} label="Close" onClick={onClose} />
          </span>
          <span className={styles.inspectorAmount}>
            <strong>{(job.myBid?.amount == null && job.budget === null ? '—' : formatNaira(job.myBid?.amount ?? job.budget))}</strong>
            <small>{job.myBid ? 'Your bid' : 'Budget'}</small>
          </span>
        </div>
      </div>
      <div className={styles.inspectorTitle}>
        <h2>{jobTitle(job)}</h2>
        <span>{job.cargoType}</span>
        <div className={styles.route} style={{ marginTop: 10, fontSize: 14 }}>
          <Icon name="map-pin" size={16} color="var(--tk-blue)" /> {job.origin}
          <Icon name="arrow-right" size={14} color="var(--tk-ink-400)" />
          <Icon name="map-pin" size={16} color="var(--tk-blue)" /> {job.destination}
        </div>
      </div>
      <Tabs
        style={{ padding: '0 16px', gap: 0, justifyContent: 'space-between' }}
        value={tab} onChange={setTab}
        items={[{ value: 'details', label: 'Details' }, { value: 'requirements', label: 'Requirements' }, { value: 'company', label: 'Company' }, { value: 'map', label: 'Map' }]}
      />
      <div className={styles.inspectorBody}>
        {tab === 'details' && (
          <>
            <div className={styles.factGrid}>
              <LabelValue layout="stack" label="Job Type" value={job.jobType} />
              <LabelValue layout="stack" label="Cargo Type" value={job.category} />
              <LabelValue layout="stack" label="Quantity" value={job.quantity} />
              <LabelValue layout="stack" label="Weight" value={`${job.weightKg === null ? '—' : job.weightKg.toLocaleString() + ' kg'}`} />
              <LabelValue layout="stack" label="Pickup Date" value={job.pickupDate} />
              <LabelValue layout="stack" label="Delivery Date" value={job.deliveryDate} />
              <LabelValue layout="stack" label="Trucks Required" value={job.trucksRequired ?? '—'} />
              <LabelValue layout="stack" label="Cargo Value" value={job.cargoValue !== null ? formatNaira(job.cargoValue) : '—'} />
              <LabelValue layout="stack" label="Payment Terms" value={job.paymentTerms} />
              <LabelValue layout="stack" label="Posted" value={job.postedOn.split(' · ')[0]} />
            </div>
            <div className={styles.inspectorSection}>
              <h3>Cargo Description</h3>
              <p>{job.cargoDescription}</p>
            </div>
            <div className={styles.inspectorSection}>
              <h3>Requirements</h3>
              <RequirementList items={job.requirements?.slice(0, 4)} />
            </div>
          </>
        )}
        {tab === 'requirements' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <RequirementList items={job.requirements} />
            {job.specialNotes?.length > 0 && (
              <div className={styles.inspectorSection}>
                <h3>Special Notes</h3>
                <ul className={styles.notes}>{job.specialNotes.map((note) => <li key={note}>{note}</li>)}</ul>
              </div>
            )}
          </div>
        )}
        {tab === 'company' && (
          <div style={{ display: 'grid', gap: 4 }}>
            <LabelValue label="Company" value={poster.name} />
            <LabelValue label="Verification" value={poster.verified == null ? '—' : poster.verified ? 'Verified' : 'Unverified'} valueTone={poster.verified == null ? undefined : poster.verified ? 'var(--tk-success)' : 'var(--tk-warning)'} />
            <LabelValue label="Rating" value={poster.rating != null ? `${poster.rating} / 5` : '—'} />
            <LabelValue label="Jobs Posted" value={poster.jobsPosted ?? '—'} />
          </div>
        )}
        {tab === 'map' && (
          <RouteMap title="Pickup & Delivery" origin={job.origin} destination={job.destination} distanceKm={job.distanceKm} routeCoordinates={job.routeCoordinates} duration={null} height={220} style={{ boxShadow: 'none', border: 0 }} />
        )}
      </div>
      <div className={styles.companyRow}>
        <Avatar name={poster.name} size={40} tone="var(--tk-blue-soft)" style={{ color: 'var(--tk-blue)' }} />
        <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong>{poster.name}</strong>
            {poster.verified && <Badge tone="success" dot>Verified</Badge>}
          </span>
          <span className="tk-meta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Stars rating={poster.rating} /> {poster.rating ?? '—'} ({poster.jobsPosted ?? '—'} jobs)
          </span>
        </span>
        <Button size="sm" variant="secondary" onClick={() => setTab('company')}>View Company</Button>
      </div>
      <div className={styles.inspectorActions}>
        {job.myBid
          ? <Button size="lg" onClick={() => onOpen(job)}>View My Bid</Button>
          : <Button size="lg" disabled={!job.canBid} onClick={() => onBid(job)}>Place a Bid</Button>}
        <Button size="lg" variant="secondary" icon="message-square" onClick={() => onContact(job)}>Contact Forwarder</Button>
      </div>
    </Card>
  );
}

export function RequirementList({ items }) {
  if (!Array.isArray(items)) return <span className="tk-meta">—</span>;
  return (
    <ul className={styles.requirements}>
      {items.map((req) => (
        <li key={req}><Icon name="circle-check" size={16} color="var(--tk-success)" /> {req}</li>
      ))}
    </ul>
  );
}

function BidModal({ job, open, onClose, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  useEffect(() => {
    if (open && job) { setAmount(job.budget === null ? '' : String(job.budget)); setMessage(''); setError(''); }
  }, [open, job]);

  if (!job) return null;
  const [low, high] = job.bidBounds;
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    const validationError = getBidValidationError(amount, message);
    if (validationError) { setError(validationError); return; }
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await onSubmit(job.id, Number(amount), message);
    } catch (err) {
      setError(err instanceof Error ? err.message : getApiErrorMessage(err));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open} onClose={() => { if (!submitting.current) onClose(); }} title="Place a Bid" description={`${jobTitle(job)} · ${job.origin} → ${job.destination}`} width={500}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button form="bid-form" type="submit" icon="send" disabled={busy || !!getBidValidationError(amount, message)}>{busy ? 'Submitting…' : 'Place Bid'}</Button></>}
    >
      <form id="bid-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <TextField
          label="Bid Amount for the Job (₦)" type="number" min={MIN_BID_AMOUNT} required disabled={busy}
          value={amount} onChange={(e) => setAmount(e.target.value)} error={error || undefined}
          hint={`Suggested range: ${low === null ? '—' : formatNaira(low)} – ${high === null ? '—' : formatNaira(high)}`}
        />
        {job.trucksRequired > 1 && (
          <span className="tk-meta">
            {job.trucksRequired} trucks requested · Whole-job bid {formatNaira(Number(amount || 0))}. This job runs as one trip on one truck.
          </span>
        )}
        <Textarea label="Add a message (optional)" rows={4} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} disabled={busy} placeholder="Introduce your company and why you're the best fit for this job..." />
      </form>
    </Modal>
  );
}

export function HowItWorksModal({ open, onClose }) {
  const steps = [
    ['search', 'Find a job', 'Browse verified haulage requests from forwarders and exporters, filter by route, cargo and weight.'],
    ['send', 'Place a bid', 'Quote a rate for the whole job. The forwarder reviews bids and awards the job.'],
    ['truck', 'Dispatch a truck', 'Choose one truck and driver for each awarded job. Each job runs as one trip under My Trips.'],
    ['wallet', 'Deliver and get paid', 'Track every trip to delivery. Earnings land in your wallet per the payment terms.'],
  ];
  return (
    <Modal open={open} onClose={onClose} title="How it works" width={520} footer={<Button onClick={onClose}>Got it</Button>}>
      <ol className={styles.howSteps}>
        {steps.map(([icon, title, body]) => (
          <li key={title}>
            <span><Icon name={icon} size={18} /></span>
            <div><strong>{title}</strong><p>{body}</p></div>
          </li>
        ))}
      </ol>
    </Modal>
  );
}

export function Jobs() {
  const navigate = useNavigate();
  const [sendMessage] = useSendJobMessageMutation();
  const { data: jobs, error: jobsError, isLoading: jobsLoading } = useGetAvailableJobsQuery(undefined, { refetchOnMountOrArgChange: true });
  const [submitBid] = useSubmitJobBidMutation();
  const [saveJob] = useSetSavedJobMutation();
  const [category, setCategory] = useState('all');
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [query, setQuery] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [bidsOnly, setBidsOnly] = useState(false);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState(null);
  const [bidJob, setBidJob] = useState(null);
  const [contactJob, setContactJob] = useState(null);
  const [howOpen, setHowOpen] = useState(false);
  const [toast, showToast] = useToast();
  const saving = useRef(new Set());
  const [savingJobs, setSavingJobs] = useState(new Set());

  useEffect(() => {
    const onSearch = (event) => { setQuery(event.detail || ''); setPage(1); };
    window.addEventListener('trukkas:global-search', onSearch);
    return () => window.removeEventListener('trukkas:global-search', onSearch);
  }, []);

  const market = useMemo(() => jobs ?? [], [jobs]);
  const myBids = market.filter((job) => job.myBid);
  const options = useMemo(() => ({
    from: [...new Set(market.map((j) => j.origin).filter((value) => value !== '—'))].sort(),
    to: [...new Set(market.map((j) => j.destination).filter((value) => value !== '—'))].sort(),
    cargo: [...new Set(market.map((j) => j.cargoType).filter((value) => value !== '—'))].sort(),
    month: [...new Set(market.map((j) => monthOf(j.pickupDate)).filter((value) => value !== '—'))],
  }), [market]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const weight = WEIGHTS.find((w) => w.value === filters.weight);
    const rows = market
      .filter((job) => !bidsOnly || job.myBid)
      .filter((job) => (!filters.from || job.origin === filters.from) && (!filters.to || job.destination === filters.to))
      .filter((job) => (!filters.cargo || job.cargoType === filters.cargo) && (!filters.jobType || job.jobType === filters.jobType) && (!filters.month || monthOf(job.pickupDate) === filters.month))
      .filter((job) => (!weight || job.weightKg !== null && weight.test(job.weightKg)) && (!filters.savedOnly || job.saved === true) && (!filters.multiTruck || job.trucksRequired > 1))
      .filter((job) => !q || [job.id, job.number, jobTitle(job), job.origin, job.destination, job.cargoType, posterFor(job).name]
        .some((v) => String(v).toLowerCase().includes(q)));
    const sorters = {
      newest: (a, b) => time(b.postedOn.split(' · ')[0]) - time(a.postedOn.split(' · ')[0]),
      closing: (a, b) => (a.closesInDays ?? 99) - (b.closesInDays ?? 99),
      budget: (a, b) => b.budget - a.budget,
      pickup: (a, b) => time(a.pickupDate) - time(b.pickupDate),
    };
    return rows.sort(sorters[sort]);
  }, [market, bidsOnly, filters, query, sort]);

  const counts = useMemo(() => Object.fromEntries([
    ['all', filtered.length],
    ...JOB_CATEGORIES.map((c) => [c, filtered.some((job) => job.category === '—') ? '—' : filtered.filter((j) => matchesCategory(j, c)).length]),
  ]), [filtered]);
  const visible = category === 'all' ? filtered : filtered.filter((j) => matchesCategory(j, category));
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedRow = pageRows.find((j) => j.id === selectedId) || null;
  const { currentData: selectedDetail } = useGetJobDetailQuery(selectedId, { skip: !selectedRow });
  const selected = selectedRow ? selectedDetail ?? selectedRow : null;

  useEffect(() => {
    if (selectedId !== '' && !selected && pageRows[0] && window.matchMedia('(min-width: 1200px)').matches) setSelectedId(pageRows[0].id);
  }, [pageRows, selectedId, selected]);

  const setField = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
  const apply = () => { setFilters(draft); setPage(1); };
  const reset = () => { setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); setQuery(''); syncTopBarSearch(''); setBidsOnly(false); setPage(1); };

  async function handleBid(jobId, amount, message) {
    await submitBid({ jobId, amount, message }).unwrap();
    setBidJob(null);
    showToast(`Bid submitted for ${jobId}.`);
  }

  async function handleSave(job) {
    if (saving.current.has(job.id)) return;
    saving.current.add(job.id);
    setSavingJobs(new Set(saving.current));
    try {
      if (job.saved === null) throw new Error('The API has not returned this job’s saved state.');
      const updated = await saveJob({ jobId: job.id, saved: !job.saved }).unwrap();
      showToast(updated.saved ? 'Job saved.' : 'Removed from saved jobs.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : getApiErrorMessage(err));
    } finally {
      saving.current.delete(job.id);
      setSavingJobs(new Set(saving.current));
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Find Jobs"
        description="Browse and bid on verified haulage jobs from trusted forwarders and exporters."
        actions={
          <>
            <Button variant="ghost" icon="circle-help" onClick={() => setHowOpen(true)} style={{ color: 'var(--tk-blue)', textDecoration: 'underline' }}>How it works?</Button>
            <Button variant={bidsOnly ? 'primary' : 'secondary'} icon="calendar-check" onClick={() => { setBidsOnly((v) => !v); setPage(1); }}>
              My Bids ({jobs ? myBids.length : '—'})
            </Button>
          </>
        }
      />

      <Tabs
        value={category}
        onChange={(value) => { setCategory(value); setPage(1); }}
        items={[{ value: 'all', label: bidsOnly ? 'My Bids' : 'All Jobs', count: jobs ? counts.all : '—' }, ...JOB_CATEGORIES.map((c) => ({ value: c, label: c, count: jobs ? counts[c] : '—' }))]}
      />

      <Card pad="tight" className={styles.filterCard}>
        <div className={styles.filterBar}>
          <FilterField label="From" value={draft.from} onChange={setField('from')} options={options.from} placeholder="All Locations" />
          <IconButton icon="arrow-right-left" tone="outline" size={40} label="Swap From and To" onClick={() => setDraft((d) => ({ ...d, from: d.to, to: d.from }))} />
          <FilterField label="To" value={draft.to} onChange={setField('to')} options={options.to} placeholder="All Locations" />
          <FilterField label="Cargo Type" value={draft.cargo} onChange={setField('cargo')} options={options.cargo} placeholder="All Types" />
          <FilterField label="Date Range" icon="calendar" value={draft.month} onChange={setField('month')} options={options.month} placeholder="Any Date" />
          <FilterField label="Weight/Size" value={draft.weight} onChange={setField('weight')} options={WEIGHTS} placeholder="Any" />
          <Button variant="outline" icon="filter" onClick={() => setMoreOpen((v) => !v)} style={{ height: 52 }}>More Filters</Button>
          <button type="button" className={styles.resetLink} onClick={reset}>Reset</button>
          <Button onClick={apply} style={{ height: 52, minWidth: 96 }}>Search</Button>
        </div>
        {moreOpen && (
          <div className={styles.moreFilters}>
            <FilterField label="Job Type" value={draft.jobType} onChange={setField('jobType')} options={JOB_TYPES.map((t) => t.value)} placeholder="All Job Types" />
            <Checkbox label="Saved jobs only" checked={draft.savedOnly} onChange={setField('savedOnly')} />
            <Checkbox label="Multi-truck jobs only" checked={draft.multiTruck} onChange={setField('multiTruck')} />
          </div>
        )}
      </Card>

      <div className={`${styles.mainGrid} ${selected ? '' : styles.noInspector}`}>
        <Card pad="none" className={styles.listCard}>
          <div className={styles.listHead}>
            <span>{jobs ? visible.length : '—'} {visible.length === 1 ? 'job' : 'jobs'} found</span>
            <span className={styles.sort}>
              <span className="tk-meta">Sort by</span>
              <Select value={sort} options={JOB_SORTS} onChange={(e) => {
                if (e.target.value === 'closing') { showToast('Jobs have no closing deadline. They stay open until the forwarder accepts an offer or cancels.'); return; }
                setSort(e.target.value);
              }} style={{ width: 170 }} />
            </span>
          </div>
          {jobsLoading ? <SkeletonRow columns={4} /> : jobsError ? <EmptyState icon="briefcase" title={getApiErrorMessage(jobsError)} /> : pageRows.length === 0 ? (
            <div style={{ padding: 40 }}>
              <EmptyState
                icon="search-x" title={bidsOnly ? 'No open bids' : 'No jobs match your filters'}
                description={bidsOnly ? 'Bids you place on open jobs will show here.' : 'Try a different category or reset your filters.'}
                action={<Button variant="outline" onClick={reset}>Reset Filters</Button>}
              />
            </div>
          ) : (
            <div className={styles.jobList}>
              {pageRows.map((job) => (
                <JobRow
                  key={job.id} job={job} selected={job.id === selectedId} saving={savingJobs.has(job.id)}
                  onSelect={(j) => setSelectedId(j.id)}
                  onOpen={(j) => navigate(jobDetailHref(j.id))}
                  onSave={handleSave}
                />
              ))}
            </div>
          )}
          <Pagination
            page={currentPage} pageCount={pageCount} pageSize={pageSize} total={jobs ? visible.length : undefined}
            onPage={(p) => setPage(Math.max(1, Math.min(pageCount, p)))}
            onPageSize={(size) => { setPageSize(size); setPage(1); }}
          />
        </Card>

        {selected && (
          <JobInspector
            job={selected}
            onClose={() => setSelectedId('')}
            onBid={setBidJob}
            onOpen={(j) => navigate(jobDetailHref(j.id))}
            onContact={setContactJob}
            onShare={() => copyLink(showToast, jobDetailHref(selected.id))}
          />
        )}
      </div>

      <BidModal job={bidJob} open={!!bidJob} onClose={() => setBidJob(null)} onSubmit={handleBid} />
      <MessageModal
        open={!!contactJob} onClose={() => setContactJob(null)} title="Contact Forwarder"
        recipient={contactJob ? posterFor(contactJob).name : ''}
        placeholder="Ask about pickup windows, cargo handling or documents..."
        onSend={async (content) => {
          await sendMessage({ jobId: contactJob.id, receiverId: contactJob.contactId, content }).unwrap();
          setContactJob(null); showToast('Message sent to the forwarder.');
        }}
      />
      <HowItWorksModal open={howOpen} onClose={() => setHowOpen(false)} />
      <Toast message={toast} />
    </div>
  );
}

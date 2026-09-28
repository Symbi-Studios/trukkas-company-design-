'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../router.js';
import {
  Avatar, Badge, Button, Card, Checkbox, EmptyState, Icon, IconButton, LabelValue, Modal, PageHeader,
  Pagination, Select, Tabs, Textarea, TextField,
} from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { placeBid, toggleSaveJob } from '../mock/api.js';
import {
  JOB_CATEGORIES, JOB_SORTS, closesInLabel, closesInTone, isMarketplaceJob, jobTitle, suggestedBidRange,
} from '../domain/jobs.js';
import { posters } from '../mock/fixtures/companies.js';
import { formatNaira } from '../mock/format.js';
import { CargoThumb } from '../components/CargoThumb.jsx';
import { MessageModal } from '../components/MessageModal.jsx';
import { RouteMap } from '../components/RouteMap.jsx';
import { Toast, copyLink, useToast } from '../components/Toast.jsx';
import styles from './Jobs.module.css';

const EMPTY_FILTERS = { from: '', to: '', cargo: '', month: '', weight: '', savedOnly: false, multiTruck: false };
const WEIGHTS = [
  { value: 'light', label: 'Under 20,000 kg', test: (kg) => kg < 20000 },
  { value: 'medium', label: '20,000 – 30,000 kg', test: (kg) => kg >= 20000 && kg <= 30000 },
  { value: 'heavy', label: 'Over 30,000 kg', test: (kg) => kg > 30000 },
];

export function posterFor(id) {
  return posters.find((p) => p.id === id) || { name: '—', rating: null, jobsPosted: 0, verified: false };
}

const monthOf = (date) => date?.replace(/ \d+,/, '');
const time = (date) => new Date(date).getTime() || 0;

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
      {[1, 2, 3, 4, 5].map((n) => <Icon key={n} name="star" size={12} color={n <= Math.round(rating) ? 'var(--tk-warning)' : 'var(--tk-line-strong)'} />)}
    </span>
  );
}

export function JobFlag({ job }) {
  if (job.featured) return <Badge tone="purple"><Icon name="star" size={12} />Featured</Badge>;
  if (job.urgent) return <Badge tone="danger" dot>Urgent</Badge>;
  return null;
}

function JobRow({ job, selected, onSelect, onOpen, onSave }) {
  const closes = closesInLabel(job.closesInDays);
  return (
    <div
      role="button" tabIndex={0}
      className={`${styles.jobRow} ${selected ? styles.jobRowActive : ''}`}
      onClick={() => onSelect(job)}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(job); }}
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
          <span>{job.weightKg.toLocaleString()} kg</span>
          <span>{job.equipment}</span>
          <span className={styles.underline}>{job.cargoType}</span>
          {job.trucksRequired > 1 && <span className={styles.trucks}><Icon name="truck" size={13} /> {job.trucksRequired} trucks</span>}
        </div>
      </div>
      <div className={`${styles.jobFact} ${styles.pickupFact}`}><span>Pickup</span><strong>{job.pickupDate}</strong></div>
      <div className={styles.jobFact}><span>{job.trucksRequired > 1 ? 'Budget / truck' : 'Budget'}</span><strong>{formatNaira(job.budget)}</strong></div>
      <div className={styles.jobActions}>
        {closes && (
          <span className={styles.closes} style={{ color: closesInTone(job.closesInDays) }}>
            <Icon name="hourglass" size={12} /> {closes}
          </span>
        )}
        <span className={styles.jobButtons}>
          <Button size="sm" variant={selected ? 'primary' : 'secondary'} onClick={(e) => { e.stopPropagation(); onOpen(job); }}>View Details</Button>
          <IconButton
            icon={job.saved ? 'bookmark-check' : 'bookmark'} tone="outline" size={32} label={job.saved ? 'Unsave job' : 'Save job'}
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
  const poster = posterFor(job.postedBy);
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
            <strong>{formatNaira(job.myBid?.amount ?? job.budget)}</strong>
            <small>{job.myBid ? 'Your bid' : job.trucksRequired > 1 ? 'Budget per truck' : 'Budget'}</small>
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
              <LabelValue layout="stack" label="Cargo Type" value={job.category} />
              <LabelValue layout="stack" label="Quantity" value={job.quantity} />
              <LabelValue layout="stack" label="Weight" value={`${job.weightKg.toLocaleString()} kg`} />
              <LabelValue layout="stack" label="Pickup Date" value={job.pickupDate} />
              <LabelValue layout="stack" label="Delivery Date" value={job.deliveryDate} />
              <LabelValue layout="stack" label="Trucks Required" value={job.trucksRequired} />
              <LabelValue layout="stack" label="Cargo Value" value={job.cargoValue ? formatNaira(job.cargoValue) : '—'} />
              <LabelValue layout="stack" label="Payment Terms" value={job.paymentTerms} />
              <LabelValue layout="stack" label="Posted" value={job.postedOn.split(' · ')[0]} />
            </div>
            <div className={styles.inspectorSection}>
              <h3>Cargo Description</h3>
              <p>{job.cargoDescription}</p>
            </div>
            <div className={styles.inspectorSection}>
              <h3>Requirements</h3>
              <RequirementList items={job.requirements.slice(0, 4)} />
            </div>
          </>
        )}
        {tab === 'requirements' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <RequirementList items={job.requirements} />
            {job.specialNotes.length > 0 && (
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
            <LabelValue label="Verification" value={poster.verified ? 'Verified' : 'Unverified'} valueTone={poster.verified ? 'var(--tk-success)' : 'var(--tk-warning)'} />
            <LabelValue label="Rating" value={poster.rating ? `${poster.rating} / 5` : '—'} />
            <LabelValue label="Jobs Posted" value={poster.jobsPosted} />
          </div>
        )}
        {tab === 'map' && (
          <RouteMap title="Pickup & Delivery" origin={job.origin} destination={job.destination} distanceKm={job.distanceKm} height={220} style={{ boxShadow: 'none', border: 0 }} />
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
            <Stars rating={poster.rating} /> {poster.rating} ({poster.jobsPosted} jobs)
          </span>
        </span>
        <Button size="sm" variant="secondary" onClick={() => setTab('company')}>View Company</Button>
      </div>
      <div className={styles.inspectorActions}>
        {job.status === 'Pending'
          ? <Button size="lg" onClick={() => onBid(job)}>Place a Bid</Button>
          : <Button size="lg" onClick={() => onOpen(job)}>View My Bid</Button>}
        <Button size="lg" variant="secondary" icon="message-square" onClick={() => onContact(job)}>Contact Forwarder</Button>
      </div>
    </Card>
  );
}

export function RequirementList({ items }) {
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

  useEffect(() => {
    if (open && job) { setAmount(String(job.budget)); setMessage(''); setError(''); }
  }, [open, job]);

  if (!job) return null;
  const [low, high] = suggestedBidRange(job);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit(job.id, Number(amount), message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open} onClose={onClose} title="Place a Bid" description={`${jobTitle(job)} · ${job.origin} → ${job.destination}`} width={500}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="bid-form" type="submit" icon="send" disabled={busy}>{busy ? 'Submitting…' : 'Place Bid'}</Button></>}
    >
      <form id="bid-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <TextField
          label={job.trucksRequired > 1 ? 'Bid Amount per Truck (₦)' : 'Bid Amount (₦)'} type="number" min="0" required
          value={amount} onChange={(e) => setAmount(e.target.value)} error={error || undefined}
          hint={`Suggested range: ${formatNaira(low)} – ${formatNaira(high)}`}
        />
        {job.trucksRequired > 1 && (
          <span className="tk-meta">
            {job.trucksRequired} trucks required · Total {formatNaira(Number(amount || 0) * job.trucksRequired)}. Each truck you dispatch becomes its own trip.
          </span>
        )}
        <Textarea label="Add a message (optional)" rows={4} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Introduce your company and why you're the best fit for this job..." />
      </form>
    </Modal>
  );
}

export function HowItWorksModal({ open, onClose }) {
  const steps = [
    ['search', 'Find a job', 'Browse verified haulage requests from forwarders and exporters, filter by route, cargo and weight.'],
    ['send', 'Place a bid', 'Quote a rate per truck. The forwarder reviews bids and awards the job.'],
    ['truck', 'Dispatch trucks', 'A job can need several trucks. Each truck and driver you dispatch becomes its own trip under My Trips.'],
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
  const jobs = useCollection('jobs') || [];
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

  useEffect(() => {
    const onSearch = (event) => { setQuery(event.detail || ''); setPage(1); };
    window.addEventListener('trukkas:global-search', onSearch);
    return () => window.removeEventListener('trukkas:global-search', onSearch);
  }, []);

  const market = useMemo(() => jobs.filter(isMarketplaceJob), [jobs]);
  const myBids = market.filter((job) => job.status === 'Quoted');
  const options = useMemo(() => ({
    from: [...new Set(market.map((j) => j.origin))].sort(),
    to: [...new Set(market.map((j) => j.destination))].sort(),
    cargo: [...new Set(market.map((j) => j.cargoType))].sort(),
    month: [...new Set(market.map((j) => monthOf(j.pickupDate)))],
  }), [market]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const weight = WEIGHTS.find((w) => w.value === filters.weight);
    const rows = market
      .filter((job) => !bidsOnly || job.status === 'Quoted')
      .filter((job) => (!filters.from || job.origin === filters.from) && (!filters.to || job.destination === filters.to))
      .filter((job) => (!filters.cargo || job.cargoType === filters.cargo) && (!filters.month || monthOf(job.pickupDate) === filters.month))
      .filter((job) => (!weight || weight.test(job.weightKg)) && (!filters.savedOnly || job.saved) && (!filters.multiTruck || job.trucksRequired > 1))
      .filter((job) => !q || [job.id, jobTitle(job), job.origin, job.destination, job.cargoType, posterFor(job.postedBy).name]
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
    ...JOB_CATEGORIES.map((c) => [c, filtered.filter((j) => j.category === c).length]),
  ]), [filtered]);
  const visible = category === 'all' ? filtered : filtered.filter((j) => j.category === category);
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selected = market.find((j) => j.id === selectedId) || null;

  useEffect(() => {
    if (selectedId === null && pageRows[0] && window.matchMedia('(min-width: 1200px)').matches) setSelectedId(pageRows[0].id);
  }, [pageRows, selectedId]);

  const setField = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
  const apply = () => { setFilters(draft); setPage(1); };
  const reset = () => { setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); setQuery(''); setBidsOnly(false); setPage(1); };

  async function handleBid(jobId, amount, message) {
    await placeBid(jobId, amount, message);
    setBidJob(null);
    showToast(`Bid submitted for ${jobId}.`);
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
              My Bids ({myBids.length})
            </Button>
          </>
        }
      />

      <Tabs
        value={category}
        onChange={(value) => { setCategory(value); setPage(1); }}
        items={[{ value: 'all', label: bidsOnly ? 'My Bids' : 'All Jobs', count: counts.all }, ...JOB_CATEGORIES.map((c) => ({ value: c, label: c, count: counts[c] }))]}
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
            <Checkbox label="Saved jobs only" checked={draft.savedOnly} onChange={setField('savedOnly')} />
            <Checkbox label="Multi-truck jobs only" checked={draft.multiTruck} onChange={setField('multiTruck')} />
          </div>
        )}
      </Card>

      <div className={`${styles.mainGrid} ${selected ? '' : styles.noInspector}`}>
        <Card pad="none" className={styles.listCard}>
          <div className={styles.listHead}>
            <span>{visible.length} {visible.length === 1 ? 'job' : 'jobs'} found</span>
            <span className={styles.sort}>
              <span className="tk-meta">Sort by</span>
              <Select value={sort} options={JOB_SORTS} onChange={(e) => setSort(e.target.value)} style={{ width: 170 }} />
            </span>
          </div>
          {pageRows.length === 0 ? (
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
                  key={job.id} job={job} selected={job.id === selectedId}
                  onSelect={(j) => setSelectedId(j.id)}
                  onOpen={(j) => navigate(`/jobs/${j.id}`)}
                  onSave={async (j) => { await toggleSaveJob(j.id); showToast(j.saved ? 'Removed from saved jobs.' : 'Job saved.'); }}
                />
              ))}
            </div>
          )}
          <Pagination
            page={currentPage} pageCount={pageCount} pageSize={pageSize} total={visible.length}
            onPage={(p) => setPage(Math.max(1, Math.min(pageCount, p)))}
            onPageSize={(size) => { setPageSize(size); setPage(1); }}
          />
        </Card>

        {selected && (
          <JobInspector
            job={selected}
            onClose={() => setSelectedId('')}
            onBid={setBidJob}
            onOpen={(j) => navigate(`/jobs/${j.id}`)}
            onContact={setContactJob}
            onShare={() => copyLink(showToast, `/jobs/${selected.id}`)}
          />
        )}
      </div>

      <BidModal job={bidJob} open={!!bidJob} onClose={() => setBidJob(null)} onSubmit={handleBid} />
      <MessageModal
        open={!!contactJob} onClose={() => setContactJob(null)} title="Contact Forwarder"
        recipient={contactJob ? posterFor(contactJob.postedBy).name : ''}
        placeholder="Ask about pickup windows, cargo handling or documents..."
        onSend={async () => { setContactJob(null); showToast('Message sent to the forwarder.'); }}
      />
      <HowItWorksModal open={howOpen} onClose={() => setHowOpen(false)} />
      <Toast message={toast} />
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '../router.js';
import {
  Badge, Button, Card, DataTable, EmptyState, Icon, Modal, PageHeader,
  SearchField, StatCard, Textarea, TextField,
} from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { placeBid } from '../mock/api.js';
import { JOB_TABS, jobStatusTone, nextStepFor } from '../domain/jobs.js';
import { posters } from '../mock/fixtures/companies.js';
import { formatNaira } from '../mock/format.js';
import styles from './JobsTrips.module.css';

function posterName(id) {
  return posters.find((p) => p.id === id)?.name || '—';
}

function JobRequestCard({ job, onBid }) {
  return (
    <Card style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
        <div>
          <Badge tone="info">{job.jobType}</Badge>
          <h3 className="tk-title" style={{ fontSize: 16, margin: '8px 0 2px' }}>{job.cargoType}</h3>
          <span className="tk-meta">{job.equipment} · {job.weightKg.toLocaleString()} kg</span>
        </div>
        <span className="tk-meta" style={{ textAlign: 'right', color: 'var(--tk-danger)' }}>{job.closesAt}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--tk-ink-500)', font: '500 13px/18px var(--tk-font-sans)' }}>
        <Icon name="map-pin" size={14} /> {job.origin}
        <Icon name="arrow-right" size={14} />
        <Icon name="map-pin" size={14} /> {job.destination}
        <span className="tk-meta">· {job.distanceKm.toLocaleString()} km</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--tk-line)', paddingTop: 10 }}>
        <span>
          <strong style={{ display: 'block', font: '700 18px/24px var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{formatNaira(job.budget)}</strong>
          <span className="tk-meta">Posted by {posterName(job.postedBy)}</span>
        </span>
        <span style={{ display: 'flex', gap: 8 }}>
          <Link to={`/jobs-trips/${job.id}`}><Button variant="outline">View Details</Button></Link>
          <Button onClick={() => onBid(job)}>Place a Bid</Button>
        </span>
      </div>
    </Card>
  );
}

function BidModal({ job, open, onClose, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && job) { setAmount(String(job.budget)); setMessage(''); }
  }, [open, job]);

  if (!job) return null;
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    await onSubmit(job.id, Number(amount), message);
    setBusy(false);
  }
  return (
    <Modal
      open={open} onClose={onClose} title="Place a Bid" description={`${job.origin} → ${job.destination}`} width={480}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="bid-form" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit Bid'}</Button></>}
    >
      <form id="bid-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <TextField label="Bid Amount (₦)" type="number" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} hint={`Suggested range: ${formatNaira(job.budget * 0.9)} – ${formatNaira(job.budget * 1.1)}`} />
        <Textarea label="Message (optional)" rows={4} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Introduce your company and why you're the best fit for this job..." />
      </form>
    </Modal>
  );
}

export function JobsTrips() {
  const navigate = useNavigate();
  const jobs = useCollection('jobs') || [];
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [bidJob, setBidJob] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const onSearch = (event) => setQuery(event.detail || '');
    window.addEventListener('trukkas:global-search', onSearch);
    return () => window.removeEventListener('trukkas:global-search', onSearch);
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const counts = useMemo(() => Object.fromEntries(
    JOB_TABS.map((t) => [t.value, t.value === 'all' ? jobs.length : jobs.filter((j) => j.status === t.value).length]),
  ), [jobs]);

  const filtered = useMemo(() => jobs
    .filter((job) => tab === 'all' || job.status === tab)
    .filter((job) => !query || [job.id, job.origin, job.destination, job.cargoType, posterName(job.postedBy)]
      .some((v) => String(v).toLowerCase().includes(query.toLowerCase())))
    .sort((a, b) => b.id.localeCompare(a.id)), [jobs, tab, query]);

  async function handleBid(jobId, amount, message) {
    await placeBid(jobId, amount, message);
    setBidJob(null);
    setToast(`Bid submitted for ${jobId}.`);
  }

  return (
    <div className={styles.page}>
      <PageHeader title="Jobs & Trips" description="Manage all your job requests, quotes, and trips in one place." />

      <section className={styles.metrics} aria-label="Job summary">
        <StatCard icon="briefcase" label="All Jobs" value={counts.all} style={{ minHeight: 92, padding: 13 }} />
        <StatCard icon="clock-3" tint="amber" label="Pending" value={counts.Pending} caption="Awaiting your action" style={{ minHeight: 92, padding: 13 }} />
        <StatCard icon="send" tint="purple" label="Quoted" value={counts.Quoted} caption="Awaiting response" style={{ minHeight: 92, padding: 13 }} />
        <StatCard icon="route" tint="blue" label="In Progress" value={counts['In Progress']} caption="Active trips" style={{ minHeight: 92, padding: 13 }} />
        <StatCard icon="circle-check" tint="green" label="Completed" value={counts.Completed} style={{ minHeight: 92, padding: 13 }} />
      </section>

      <Card pad="none" className={styles.workspace}>
        <div className={styles.tabs}>
          {JOB_TABS.map((t) => (
            <button type="button" key={t.value} className={tab === t.value ? styles.activeTab : ''} onClick={() => setTab(t.value)}>
              {t.label} <span>({counts[t.value]})</span>
            </button>
          ))}
        </div>
        <div style={{ padding: '13px 14px', borderBottom: '1px solid var(--tk-line)' }}>
          <SearchField placeholder="Search by Job ID, route, cargo, or forwarder…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: 40 }}>
            <EmptyState icon="inbox" title="No jobs match this view" description="Try a different tab or clear your search." />
          </div>
        )}

        {tab === 'Pending' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, padding: 16 }}>
            {filtered.map((job) => <JobRequestCard key={job.id} job={job} onBid={setBidJob} />)}
          </div>
        ) : filtered.length > 0 && (
          <div className={styles.tableShell}>
            <DataTable
              rows={filtered}
              rowKey={(job) => job.id}
              onRowClick={(job) => navigate(`/jobs-trips/${job.id}`)}
              tableLayout="fixed"
              columns={[
                { key: 'id', header: 'Job ID', width: 120, render: (job) => <Link to={`/jobs-trips/${job.id}`} className={styles.jobLink} onClick={(e) => e.stopPropagation()}>{job.id}</Link> },
                { key: 'route', header: 'Route & Type', render: (job) => <span className={styles.twoLine}><strong>{job.origin} → {job.destination}</strong><small>{job.jobType}</small></span> },
                { key: 'cargo', header: 'Cargo Details', render: (job) => <span className={styles.twoLine}><strong>{job.cargoType}</strong><small>{job.equipment}</small></span> },
                { key: 'poster', header: 'Requested By', render: (job) => posterName(job.postedBy) },
                { key: 'status', header: 'Status', render: (job) => <Badge tone={jobStatusTone(job.status)}>{job.status}</Badge> },
                { key: 'requestedOn', header: 'Requested On', render: (job) => job.postedOn?.split(' · ')[0] },
                { key: 'nextStep', header: 'Next Step', render: (job) => <span className="tk-meta">{nextStepFor(job)}</span> },
              ]}
            />
          </div>
        )}
      </Card>

      {toast && (
        <div role="status" style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 200 }}>
          <Card style={{ display: 'flex', alignItems: 'center', gap: 8, boxShadow: 'var(--tk-shadow-menu)' }}>
            <Icon name="circle-check" size={16} color="var(--tk-success)" />
            {toast}
          </Card>
        </div>
      )}
      <BidModal job={bidJob} open={!!bidJob} onClose={() => setBidJob(null)} onSubmit={handleBid} />
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../router.js';
import {
  Badge, Button, Card, DataTable, EmptyState, IconButton, PageHeader, Pagination, ProgressBar, SearchField, Select, StatCard, Tabs,
} from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { jobRate, jobStatusTone, jobTitle } from '../domain/jobs.js';
import { dispatchSummary, shortPlace, tripsForJob } from '../domain/trips.js';
import { jobEarnings, jobReceipt } from '../domain/payouts.js';
import { formatNaira } from '../mock/format.js';
import { CargoThumb } from '../components/CargoThumb.jsx';
import { ReceiptModal } from '../components/Receipt.jsx';
import { posterFor } from './Jobs.jsx';
import styles from './MyJobs.module.css';

const TABS = [
  { value: 'all', label: 'All Jobs' },
  { value: 'Quoted', label: 'Open Bids' },
  { value: 'In Progress', label: 'Active' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const time = (date) => new Date(date).getTime() || 0;
const compactNaira = (n) => (n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(2)}M` : formatNaira(n));

/**
 * Every job the company has engaged with — open bids, won jobs in progress, and
 * past (completed / cancelled) jobs — with dispatch progress and earnings.
 * Open marketplace requests we haven't bid on live in Find Jobs instead.
 */
export function MyJobs() {
  const navigate = useNavigate();
  const jobs = useCollection('jobs') || [];
  const trips = useCollection('trips') || [];
  const payouts = useCollection('payoutRequests') || [];
  const company = useCollection('companyProfile')?.[0];
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [forwarder, setForwarder] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    const onSearch = (event) => { setQuery(event.detail || ''); setPage(1); };
    window.addEventListener('trukkas:global-search', onSearch);
    return () => window.removeEventListener('trukkas:global-search', onSearch);
  }, []);

  const rows = useMemo(() => jobs
    .filter((job) => job.status !== 'Pending')
    .map((job) => {
      const jobTrips = tripsForJob(trips, job.id);
      return { job, trips: jobTrips, dispatch: dispatchSummary(job, jobTrips), earnings: jobEarnings(job, jobTrips, payouts) };
    })
    .sort((a, b) => time(b.job.pickupDate) - time(a.job.pickupDate)), [jobs, trips, payouts]);

  const count = (status) => rows.filter((r) => r.job.status === status).length;
  const counts = { all: rows.length, Quoted: count('Quoted'), 'In Progress': count('In Progress'), Completed: count('Completed'), Cancelled: count('Cancelled') };
  const totalNet = rows.reduce((sum, r) => sum + r.earnings.totals.net, 0);
  const unpaid = rows.reduce((sum, r) => sum + r.earnings.unpaid, 0);
  const forwarders = [...new Set(rows.map((r) => posterFor(r.job.postedBy).name))].sort();

  const filtered = rows
    .filter((r) => tab === 'all' || r.job.status === tab)
    .filter((r) => !forwarder || posterFor(r.job.postedBy).name === forwarder)
    .filter((r) => !query || [r.job.id, jobTitle(r.job), r.job.origin, r.job.destination, r.job.cargoType, posterFor(r.job.postedBy).name, ...r.trips.map((t) => t.id)]
      .some((v) => String(v).toLowerCase().includes(query.toLowerCase())));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function openReceipt(r) {
    setReceipt(jobReceipt(r.job, r.earnings, { company, poster: posterFor(r.job.postedBy) }));
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="My Jobs"
        description="Every job you've bid on, won or completed, with its trips, dispatch progress and earnings."
        actions={<Button icon="search" onClick={() => navigate('/jobs')}>Find New Jobs</Button>}
      />

      <section className={styles.stats} aria-label="Job summary">
        <StatCard icon="briefcase" label="Total Jobs" value={counts.all} caption="Bids, active and past" />
        <StatCard icon="send" tint="purple" label="Open Bids" value={counts.Quoted} caption="Awaiting forwarder" />
        <StatCard icon="route" tint="blue" label="Active Jobs" value={counts['In Progress']} caption="Trips running" />
        <StatCard icon="circle-check" tint="green" label="Completed Jobs" value={counts.Completed} caption="All trucks delivered" />
        <StatCard icon="banknote" tint="teal" label="Net Earnings" value={compactNaira(totalNet)} caption={`${formatNaira(unpaid)} not yet paid out`} />
      </section>

      <Card pad="none" className={styles.listCard}>
        <div style={{ padding: '0 var(--tk-card-pad)' }}>
          <Tabs value={tab} onChange={(v) => { setTab(v); setPage(1); }} items={TABS.map((t) => ({ ...t, count: counts[t.value] }))} />
        </div>
        <div className={styles.toolbar}>
          <SearchField placeholder="Search by job ID, trip ID, route, cargo, forwarder..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          <Select value={forwarder} placeholder="All Forwarders" options={forwarders} onChange={(e) => { setForwarder(e.target.value); setPage(1); }} />
          {(forwarder || query) && <Button variant="ghost" onClick={() => { setForwarder(''); setQuery(''); }}>Clear</Button>}
        </div>
        {pageRows.length === 0 ? (
          <EmptyState icon="briefcase" title="No jobs in this view" description="Jobs appear here once you place a bid in Find Jobs." action={<Button variant="outline" onClick={() => navigate('/jobs')}>Find Jobs</Button>} />
        ) : (
          <div className={styles.tableShell}>
            <DataTable
              rows={pageRows}
              rowKey={(r) => r.job.id}
              onRowClick={(r) => navigate(`/jobs/${r.job.id}`)}
              tableLayout="fixed"
              columns={[
                {
                  key: 'job', header: 'Job', width: 230, render: ({ job }) => (
                    <span className={styles.jobCell}>
                      <CargoThumb category={job.category} width={40} height={40} radius="var(--tk-r-sm)" />
                      <span><strong>{jobTitle(job)}</strong><small>{job.id}</small></span>
                    </span>
                  ),
                },
                { key: 'route', header: 'Route', width: 150, render: ({ job }) => <span className={styles.twoLine}><strong>{shortPlace(job.origin)} → {shortPlace(job.destination)}</strong><small>{job.pickupDate}</small></span> },
                { key: 'forwarder', header: 'Forwarder', width: 150, render: ({ job }) => posterFor(job.postedBy).name },
                {
                  key: 'trucks', header: 'Trucks', width: 130, render: ({ job, dispatch }) => (job.status === 'Quoted' ? <span className="tk-meta">{job.trucksRequired} requested</span> : (
                    <ProgressBar value={dispatch.completed} max={dispatch.required} caption={`${dispatch.completed}/${dispatch.required} delivered`} color={dispatch.completed === dispatch.required ? 'var(--tk-success)' : 'var(--tk-blue)'} />
                  )),
                },
                {
                  key: 'value', header: 'Value', width: 130, render: ({ job, earnings }) => (
                    <span className={styles.twoLine}>
                      <strong>{formatNaira(jobRate(job) * (job.trucksRequired || 1))}</strong>
                      <small>{job.status === 'Quoted' ? 'Your bid' : `${formatNaira(earnings.totals.net)} earned`}</small>
                    </span>
                  ),
                },
                { key: 'status', header: 'Status', width: 120, render: ({ job }) => <Badge tone={jobStatusTone(job.status)} dot>{job.status === 'Quoted' ? 'Bid Placed' : job.status}</Badge> },
                {
                  key: 'actions', header: '', width: 84, align: 'right', render: (r) => (
                    <span className={styles.actions}>
                      {r.earnings.rows.length > 0 && <IconButton icon="receipt" tone="outline" size={30} label={`Earnings receipt for ${r.job.id}`} onClick={(e) => { e.stopPropagation(); openReceipt(r); }} />}
                      <IconButton icon="chevron-right" size={30} label={`Open ${r.job.id}`} onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${r.job.id}`); }} />
                    </span>
                  ),
                },
              ]}
            />
          </div>
        )}
        <Pagination
          page={currentPage} pageCount={pageCount} pageSize={pageSize} total={filtered.length}
          onPage={(p) => setPage(Math.max(1, Math.min(pageCount, p)))}
          onPageSize={(size) => { setPageSize(size); setPage(1); }}
        />
      </Card>
      <ReceiptModal receipt={receipt} open={!!receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from '../router.js';
import {
  Badge, Button, Card, DataTable, EmptyState, IconButton, PageHeader, Pagination, ProgressBar, SearchField, Select, SkeletonRow, StatCard, Tabs,
} from '../ds.js';
import { useGetMyJobsQuery, useGetJobEarningsQuery, useGetMyJobLifetimeEarningsQuery, useGetJobReviewQuery } from '../store/features/jobs/jobsApi.js';
import { receiptView } from '../store/features/jobs/jobContracts.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { jobDetailHref } from '../domain/jobLinks.js';
import { syncTopBarSearch } from '../pageSearch.js';
import { jobStatusTone, jobTitle } from '../domain/jobs.js';
import { shortPlace } from '../domain/trips.js';
import { formatNaira } from '../mock/format.js';
import { CargoThumb } from '../components/CargoThumb.jsx';
import { ReceiptModal } from '../components/Receipt.jsx';
import { Stars, posterFor } from './Jobs.jsx';
import styles from './MyJobs.module.css';

const TABS = [
  { value: 'all', label: 'All Jobs' },
  { value: 'Quoted', label: 'Open Bids' },
  { value: 'In Progress', label: 'Active' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const time = (date) => new Date(date).getTime() || 0;
const money = (n) => typeof n === 'number' && Number.isFinite(n) ? formatNaira(n) : '—';

function JobValue({ job }) {
  const { currentData, error } = useGetJobEarningsQuery(job, { skip: job.status === 'Quoted' });
  const data = error ? undefined : currentData;
  return <span className={styles.twoLine}><strong>{money(job.contractValue)}</strong><small>{job.status === 'Quoted' ? 'Your bid' : `${money(data?.released)} earned`}</small></span>;
}

function JobReviewStars({ id }) {
  const { currentData: data, error } = useGetJobReviewQuery(id);
  return !error && data?.review ? <Stars rating={data.review.rating} /> : <span className="tk-meta">—</span>;
}

function JobReceipt({ job, onClose }) {
  const company = useSelector((state) => state.auth.account);
  const { currentData: data, error, isFetching, refetch } = useGetJobEarningsQuery(job);
  const receipt = receiptView(job, data, company);
  return <ReceiptModal receipt={receipt} open onClose={onClose} title="Job Earnings Statement" description={job.number}
    loading={isFetching} error={error ? getApiErrorMessage(error) : undefined} onRetry={refetch} />;
}

/**
 * Every job the company has engaged with — open bids, won jobs in progress, and
 * past (completed / cancelled) jobs — with dispatch progress and earnings.
 * Open marketplace requests we haven't bid on live in Find Jobs instead.
 */
export function MyJobs() {
  const navigate = useNavigate();
  const { currentData: loadedJobs, error, isLoading } = useGetMyJobsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { currentData: loadedLifetime, error: lifetimeError } = useGetMyJobLifetimeEarningsQuery(undefined, { refetchOnMountOrArgChange: true });
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

  const jobs = error ? undefined : loadedJobs;
  const lifetime = lifetimeError ? undefined : loadedLifetime;
  const rows = useMemo(() => (jobs ?? [])
    .filter((job) => job.status !== 'Pending')
    .map((job) => {
      return { job, trips: [], dispatch: job.dispatch };
    })
    .sort((a, b) => time(b.job.pickupDate) - time(a.job.pickupDate)), [jobs]);

  const count = (status) => rows.some((row) => row.job.status === '—') ? '—' : rows.filter((r) => r.job.status === status).length;
  const counts = Object.fromEntries(['all', 'Quoted', 'In Progress', 'Completed', 'Cancelled'].map((status) => [status, jobs ? status === 'all' ? rows.length : count(status) : '—']));
  const forwarders = [...new Set(rows.map((r) => posterFor(r.job).name).filter((name) => name !== '—'))].sort();

  const filtered = rows
    .filter((r) => tab === 'all' || r.job.status === tab)
    .filter((r) => !forwarder || posterFor(r.job).name === forwarder)
    .filter((r) => !query || [r.job.id, r.job.number, jobTitle(r.job), r.job.origin, r.job.destination, r.job.cargoType, posterFor(r.job).name]
      .some((v) => String(v).toLowerCase().includes(query.toLowerCase())));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function openReceipt(r) {
    setReceipt(r.job);
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
        <StatCard icon="banknote" tint="teal" label="Net Earnings" value={money(lifetime?.netEarned)} caption={`${money(lifetime?.unpaidEarnings)} not yet paid out`} />
      </section>

      <Card pad="none" className={styles.listCard}>
        <div style={{ padding: '0 var(--tk-card-pad)' }}>
          <Tabs value={tab} onChange={(v) => { setTab(v); setPage(1); }} items={TABS.map((t) => ({ ...t, count: counts[t.value] }))} />
        </div>
        <div className={styles.toolbar}>
          <SearchField placeholder="Search by job ID, trip ID, route, cargo, forwarder..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); syncTopBarSearch(e.target.value); }} />
          <Select value={forwarder} placeholder="All Forwarders" options={forwarders} onChange={(e) => { setForwarder(e.target.value); setPage(1); }} />
          {(forwarder || query) && <Button variant="ghost" onClick={() => { setForwarder(''); setQuery(''); setPage(1); syncTopBarSearch(''); }}>Clear</Button>}
        </div>
        {isLoading ? <SkeletonRow columns={5} /> : error ? <EmptyState icon="briefcase" title={getApiErrorMessage(error)} /> : pageRows.length === 0 ? (
          <EmptyState icon="briefcase" title="No jobs in this view" description="Jobs appear here once you place a bid in Find Jobs." action={<Button variant="outline" onClick={() => navigate('/jobs')}>Find Jobs</Button>} />
        ) : (
          <div className={styles.tableShell}>
            <DataTable
              rows={pageRows}
              rowKey={(r) => r.job.id}
              onRowClick={(r) => navigate(jobDetailHref(r.job.id))}
              tableLayout="fixed"
              columns={[
                {
                  key: 'job', header: 'Job', width: 230, render: ({ job }) => (
                    <span className={styles.jobCell}>
                      <CargoThumb category={job.category} width={40} height={40} radius="var(--tk-r-sm)" />
                      <span><strong>{jobTitle(job)}</strong><small>{job.number}</small></span>
                    </span>
                  ),
                },
                { key: 'route', header: 'Route', width: 150, render: ({ job }) => <span className={styles.twoLine}><strong>{shortPlace(job.origin)} → {shortPlace(job.destination)}</strong><small>{job.pickupDate}</small></span> },
                { key: 'forwarder', header: 'Forwarder', width: 150, render: ({ job }) => posterFor(job).name },
                {
                  key: 'trucks', header: 'Trucks', width: 130, render: ({ job, dispatch }) => (job.status === 'Quoted' ? <span className="tk-meta">{job.trucksRequired ?? '—'} requested</span> : (
                    <ProgressBar value={dispatch.completed ?? 0} max={dispatch.required} caption={`${dispatch.completed ?? '—'}/${dispatch.required} delivered`} color={dispatch.completed === dispatch.required ? 'var(--tk-success)' : 'var(--tk-blue)'} />
                  )),
                },
                {
                  key: 'value', header: 'Value', width: 130, render: ({ job }) => <JobValue job={job} />,
                },
                {
                  key: 'status', header: 'Status', width: 120, render: ({ job }) => {
                    return (
                      <span className={styles.twoLine} style={{ justifyItems: 'start', gap: 4 }}>
                        <Badge tone={jobStatusTone(job.status)} dot>{job.status === 'Quoted' ? 'Bid Placed' : job.status}</Badge>
                        {job.status === 'Completed' && <JobReviewStars id={job.id} />}
                      </span>
                    );
                  },
                },
                {
                  key: 'actions', header: '', width: 84, align: 'right', render: (r) => (
                    <span className={styles.actions} onKeyDown={(e) => e.stopPropagation()}>
                      {r.job.status === 'Completed' && <IconButton icon="receipt" tone="outline" size={30} label={`Earnings receipt for ${r.job.id}`} onClick={(e) => { e.stopPropagation(); openReceipt(r); }} />}
                      <IconButton icon="chevron-right" size={30} label={`Open ${r.job.id}`} onClick={(e) => { e.stopPropagation(); navigate(jobDetailHref(r.job.id)); }} />
                    </span>
                  ),
                },
              ]}
            />
          </div>
        )}
        <Pagination
          page={currentPage} pageCount={pageCount} pageSize={pageSize} total={jobs ? filtered.length : undefined}
          onPage={(p) => setPage(Math.max(1, Math.min(pageCount, p)))}
          onPageSize={(size) => { setPageSize(size); setPage(1); }}
        />
      </Card>
      {receipt && <JobReceipt job={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

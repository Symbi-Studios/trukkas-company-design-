'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../router.js';
import {
  Avatar, Badge, Banner, Button, Card, DataTable, EmptyState, Icon, IconButton, LabelValue, PageHeader,
  Pagination, SearchField, Select, StatCard, Tabs, Timeline,
} from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { jobTitle } from '../domain/jobs.js';
import {
  TRIP_STAGES, TRIP_TABS, dispatchSummary, shortPlace, tripCostTotal, tripHealth, tripHealthTone, tripPhase, tripsForJob, withJobs,
} from '../domain/trips.js';
import { formatNaira } from '../mock/format.js';
import { CargoThumb } from '../components/CargoThumb.jsx';
import { RouteMap } from '../components/RouteMap.jsx';
import { ReportIssueModal } from '../components/TripModals.jsx';
import { TripStepper } from '../components/TripStepper.jsx';
import { Toast, useToast } from '../components/Toast.jsx';
import styles from './Trips.module.css';

const monthOf = (date) => date?.replace(/ \d+,/, '');

export function timelineItems(trip) {
  return trip.timeline.map((item) => ({
    title: item.title,
    time: [item.date, item.time].filter(Boolean).join(' · '),
    description: item.detail,
    state: item.state === 'active' ? 'current' : item.state === 'cancelled' ? 'danger' : item.state,
    icon: item.state === 'done' ? 'check' : undefined,
  }));
}

function TripInspector({ trip, onClose, onOpen, onReport }) {
  const [tab, setTab] = useState('overview');
  const job = trip.job;
  useEffect(() => setTab('overview'), [trip.id]);
  if (!job) return null;
  const health = tripHealth(trip);

  return (
    <Card pad="none" className={styles.inspector}>
      <div className={styles.inspectorHead}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" className={styles.tripLink} onClick={() => onOpen(trip)}>{trip.id}</button>
          <Badge tone={tripHealthTone(health)} dot>{health}</Badge>
        </span>
        <IconButton icon="x" label="Close" onClick={onClose} />
      </div>
      <Tabs
        style={{ padding: '0 16px', gap: 18 }} value={tab} onChange={setTab}
        items={[
          { value: 'overview', label: 'Overview' }, { value: 'timeline', label: 'Timeline' },
          { value: 'documents', label: 'Documents' }, { value: 'costs', label: 'Costs' }, { value: 'notes', label: 'Notes' },
        ]}
      />
      <div className={styles.inspectorBody}>
        {tab === 'overview' && (
          <>
            <div className={styles.cargoHead}>
              <CargoThumb category={job.category} width={88} height={72} />
              <span>
                <strong>{jobTitle(job)}</strong>
                <small>{job.cargoType}</small>
                <button type="button" className={styles.jobLink} onClick={() => onOpen(trip, `/jobs/${job.id}`)}>{job.id}</button>
                <span className={styles.routeMini}>
                  <Icon name="map-pin" size={13} color="var(--tk-blue)" /> {job.origin}
                  <Icon name="arrow-right" size={12} color="var(--tk-ink-400)" />
                  <Icon name="map-pin" size={13} color="var(--tk-blue)" /> {job.destination}
                </span>
              </span>
            </div>
            <div className={styles.factGrid}>
              <LabelValue layout="stack" label="Pickup Date" value={trip.pickupDate} />
              <LabelValue layout="stack" label="Delivery Date" value={trip.deliveryDate} />
              <LabelValue layout="stack" label="Distance" value={`~ ${job.distanceKm.toLocaleString()} km`} />
              <LabelValue layout="stack" label="Cargo Value" value={job.cargoValue ? formatNaira(job.cargoValue) : '—'} />
              <LabelValue layout="stack" label="Weight" value={`${job.weightKg.toLocaleString()} kg`} />
              <LabelValue layout="stack" label="Trip Type" value={job.tripType} />
              <LabelValue layout="stack" label="Truck" value={trip.truckPlate} />
              <LabelValue layout="stack" label="Driver" value={trip.driverName || '—'} />
            </div>
            <div className={styles.section}>
              <div className={styles.sectionHead}><h3>Trip Progress</h3><strong>{trip.progress}%</strong></div>
              <TripStepper trip={trip} compact />
            </div>
            <RouteMap
              title="Live Location" origin={job.origin} destination={job.destination} distanceKm={job.distanceKm}
              progress={tripPhase(trip) === 'Active' ? trip.progress : undefined} height={190}
              style={{ boxShadow: 'none', border: 0, margin: '0 -16px' }}
            />
          </>
        )}
        {tab === 'timeline' && <Timeline items={timelineItems(trip)} />}
        {tab === 'documents' && (
          trip.documents.length === 0 ? <span className="tk-meta">No documents for this trip yet.</span> : (
            <div className={styles.docList}>
              {trip.documents.map((doc) => (
                <div key={doc.name}>
                  <Icon name="file-text" size={16} color={doc.status === 'Uploaded' ? 'var(--tk-success)' : 'var(--tk-ink-300)'} />
                  <span><strong>{doc.name}</strong><small>{doc.uploadedOn ? `Uploaded · ${doc.uploadedOn}` : 'Pending'}</small></span>
                  <Badge tone={doc.status === 'Uploaded' ? 'success' : 'warning'}>{doc.status}</Badge>
                </div>
              ))}
            </div>
          )
        )}
        {tab === 'costs' && (
          <div style={{ display: 'grid' }}>
            {trip.costs.length === 0 && <span className="tk-meta">No costs logged for this trip yet.</span>}
            {trip.costs.map((cost) => <LabelValue key={cost.id} label={cost.category} value={formatNaira(cost.amount)} />)}
            <LabelValue label="Total Costs" value={formatNaira(tripCostTotal(trip))} style={{ borderTop: '1px solid var(--tk-line)', marginTop: 6 }} />
          </div>
        )}
        {tab === 'notes' && (
          trip.notes.length === 0 ? <span className="tk-meta">No notes yet.</span> : (
            <div style={{ display: 'grid', gap: 12 }}>
              {trip.notes.slice().reverse().map((note, i) => (
                <div key={i} className={styles.note}>
                  <strong>{note.author}</strong> <span className="tk-meta">· {note.time}</span>
                  <p>{note.body}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>
      <div className={styles.inspectorActions}>
        <Button variant="secondary" size="lg" icon="triangle-alert" onClick={() => onReport(trip)}>Report Issue</Button>
        <Button size="lg" icon="message-square" onClick={() => onOpen(trip, `/trips/${trip.id}/communication`)}>Contact Driver</Button>
      </div>
    </Card>
  );
}

export function Trips() {
  const navigate = useNavigate();
  const rawTrips = useCollection('trips') || [];
  const jobs = useCollection('jobs') || [];
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState('');
  const [stage, setStage] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [truck, setTruck] = useState('');
  const [driver, setDriver] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState(null);
  const [reportTrip, setReportTrip] = useState(null);
  const [toast, showToast] = useToast();

  useEffect(() => {
    const onSearch = (event) => { setQuery(event.detail || ''); setPage(1); };
    window.addEventListener('trukkas:global-search', onSearch);
    return () => window.removeEventListener('trukkas:global-search', onSearch);
  }, []);

  const trips = useMemo(() => withJobs(rawTrips, jobs).sort((a, b) => b.id.localeCompare(a.id)), [rawTrips, jobs]);
  const needsDispatch = useMemo(() => jobs
    .filter((job) => job.status === 'In Progress')
    .map((job) => ({ job, ...dispatchSummary(job, tripsForJob(rawTrips, job.id)) }))
    .filter((row) => row.remaining > 0), [jobs, rawTrips]);

  const phaseCount = (phase) => trips.filter((t) => tripPhase(t) === phase).length;
  const counts = { all: trips.length, Upcoming: phaseCount('Upcoming'), Active: phaseCount('Active'), Completed: phaseCount('Completed'), Cancelled: phaseCount('Cancelled') };
  const months = [...new Set(trips.map((t) => monthOf(t.pickupDate)))];

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return trips
      .filter((t) => tab === 'all' || tripPhase(t) === tab)
      .filter((t) => (!month || monthOf(t.pickupDate) === month) && (!stage || (stage === 'Delayed' ? t.delayed && tripPhase(t) === 'Active' : t.status === stage)))
      .filter((t) => (!truck || t.truckPlate === truck) && (!driver || t.driverName === driver))
      .filter((t) => !q || [t.id, t.jobId, t.truckPlate, t.driverName, t.job?.origin, t.job?.destination, jobTitle(t.job), t.job?.cargoType]
        .some((v) => String(v || '').toLowerCase().includes(q)));
  }, [trips, tab, month, stage, truck, driver, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selected = trips.find((t) => t.id === selectedId) || null;

  useEffect(() => {
    if (selectedId !== null || !window.matchMedia('(min-width: 1200px)').matches) return;
    const firstActive = pageRows.find((t) => tripPhase(t) === 'Active') || pageRows[0];
    if (firstActive) setSelectedId(firstActive.id);
  }, [pageRows, selectedId]);

  const openTrip = (trip, path) => navigate(path || `/trips/${trip.id}`);

  return (
    <div className={styles.page}>
      <PageHeader
        title="My Trips"
        description="Track and manage all your assigned trips in one place."
        actions={<Button icon="plus" onClick={() => navigate('/jobs')}>Find New Jobs</Button>}
      />

      <section className={styles.stats} aria-label="Trip summary">
        <StatCard icon="truck" label="Total Trips" value={counts.all} caption="All time" />
        <StatCard icon="circle-play" label="Upcoming Trips" value={counts.Upcoming} caption="Awaiting pickup" />
        <StatCard icon="navigation" tint="green" label="Active Trips" value={counts.Active} caption="On the road" />
        <StatCard icon="circle-check" tint="navy" label="Completed Trips" value={counts.Completed} caption="Delivered" />
        <StatCard icon="circle-x" tint="red" label="Cancelled Trips" value={counts.Cancelled} caption="All time" />
      </section>

      {needsDispatch.length > 0 && (
        <Banner
          tone="warning" icon="truck"
          title={`${needsDispatch.reduce((sum, row) => sum + row.remaining, 0)} truck(s) still to dispatch on won jobs`}
          action={<Button size="sm" variant="outline" onClick={() => navigate(`/jobs/${needsDispatch[0].job.id}`)}>Dispatch Trucks</Button>}
        >
          {needsDispatch.map((row) => `${row.job.id} (${jobTitle(row.job)}): ${row.dispatched} of ${row.required} dispatched`).join(' · ')}
        </Banner>
      )}

      <div className={`${styles.mainGrid} ${selected ? '' : styles.noInspector}`}>
        <Card pad="none" className={styles.listCard}>
          <div style={{ padding: '0 var(--tk-card-pad)' }}>
            <Tabs
              value={tab} onChange={(value) => { setTab(value); setPage(1); }}
              items={TRIP_TABS.map((t) => ({ ...t, count: counts[t.value] }))}
            />
          </div>
          <div className={styles.toolbar}>
            <SearchField placeholder="Search trips, job ID, route, cargo..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
            <label className={styles.filterField}>
              <span>Date Range</span>
              <select value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }}>
                <option value="">All Time</option>
                {months.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <Icon name="chevron-down" size={16} color="var(--tk-ink-400)" />
            </label>
            <label className={styles.filterField}>
              <span>Trip Status</span>
              <select value={stage} onChange={(e) => { setStage(e.target.value); setPage(1); }}>
                <option value="">All Statuses</option>
                {[...TRIP_STAGES, 'Delayed', 'Cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <Icon name="chevron-down" size={16} color="var(--tk-ink-400)" />
            </label>
            <Button variant="outline" icon="filter" onClick={() => setMoreOpen((v) => !v)} style={{ height: 46 }}>More Filters</Button>
          </div>
          {moreOpen && (
            <div className={styles.moreFilters}>
              <Select label="Truck" value={truck} placeholder="All Trucks" options={[...new Set(trips.map((t) => t.truckPlate))]} onChange={(e) => { setTruck(e.target.value); setPage(1); }} />
              <Select label="Driver" value={driver} placeholder="All Drivers" options={[...new Set(trips.map((t) => t.driverName).filter(Boolean))]} onChange={(e) => { setDriver(e.target.value); setPage(1); }} />
              <Button variant="ghost" onClick={() => { setTruck(''); setDriver(''); setMonth(''); setStage(''); setQuery(''); }}>Clear filters</Button>
            </div>
          )}

          {pageRows.length === 0 ? (
            <div style={{ padding: 40 }}>
              <EmptyState icon="route" title="No trips match this view" description="Try another tab or clear your filters. Trips appear here once you dispatch trucks on a won job." action={<Button variant="outline" onClick={() => navigate('/jobs')}>Find Jobs</Button>} />
            </div>
          ) : (
            <div className={styles.tableShell}>
              <DataTable
                rows={pageRows}
                rowKey={(t) => t.id}
                selected={selected ? [selected.id] : []}
                onRowClick={(t) => setSelectedId(t.id)}
                tableLayout="fixed"
                columns={[
                  {
                    key: 'id', header: 'Trip / Job ID', width: 158, render: (t) => (
                      <span className={styles.idCell}>
                        <CargoThumb category={t.job?.category} width={36} height={36} radius="var(--tk-r-sm)" />
                        <span><strong>{t.id}</strong><small>{t.jobId}</small></span>
                      </span>
                    ),
                  },
                  { key: 'route', header: 'Route', width: 120, render: (t) => <span className={styles.twoLine}><strong>{shortPlace(t.job?.origin)} → {shortPlace(t.job?.destination)}</strong><small>{t.job?.distanceKm?.toLocaleString()} km</small></span> },
                  { key: 'cargo', header: 'Cargo', width: 150, render: (t) => <span className={styles.twoLine}><strong>{jobTitle(t.job)}</strong><small>{t.job?.cargoType}</small></span> },
                  {
                    key: 'truck', header: 'Truck / Driver', width: 146, render: (t) => (
                      <span className={styles.twoLine}>
                        <strong>{t.truckPlate}</strong>
                        <span className={styles.driver}><Avatar name={t.driverName || '?'} size={18} />{t.driverName || 'Unassigned'}</span>
                      </span>
                    ),
                  },
                  { key: 'dates', header: 'Dates', width: 112, render: (t) => <span className={styles.twoLine}><span>{t.pickupDate}</span><small>→ {t.deliveryDate}</small></span> },
                  { key: 'status', header: 'Status', width: 118, render: (t) => <Badge tone={tripHealthTone(tripHealth(t))} dot>{tripHealth(t)}</Badge> },
                  {
                    key: 'actions', header: 'Actions', width: 64, align: 'center', render: (t) => (
                      <IconButton icon="chevron-right" label={`Open ${t.id}`} onClick={(e) => { e.stopPropagation(); openTrip(t); }} />
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

        {selected && (
          <TripInspector trip={selected} onClose={() => setSelectedId('')} onOpen={openTrip} onReport={setReportTrip} />
        )}
      </div>

      <ReportIssueModal
        trip={reportTrip} open={!!reportTrip} onClose={() => setReportTrip(null)}
        onDone={(msg) => { setReportTrip(null); showToast(msg); }}
      />
      <Toast message={toast} />
    </div>
  );
}

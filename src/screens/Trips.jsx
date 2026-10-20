'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '../router.js';
import {
  Avatar, Badge, Banner, Button, Card, DataTable, DatePicker, EmptyState, Icon, PageHeader,
  Pagination, SearchField, Select, Skeleton, SkeletonRow, StatCard, Tabs,
} from '../ds.js';
import { useGetCompanyTripsQuery } from '../store/features/trips/tripsApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { tripDetailHref } from '../domain/tripLinks.js';
import { syncTopBarSearch } from '../pageSearch.js';
import { jobTitle } from '../domain/jobs.js';
import {
  TRIP_STAGES, TRIP_TABS, shortPlace, tripHealth, tripHealthTone,
} from '../domain/trips.js';
import { CargoThumb } from '../components/CargoThumb.jsx';
import styles from './Trips.module.css';
import { monthValue } from '../ds/components/forms/datePickerDates.js';

const matchesPhase = (trip, phase) => trip.phase === phase && (phase !== 'Upcoming' || trip.driverAssigned === true);

export function Trips() {
  const navigate = useNavigate();
  const { currentData, error, isFetching } = useGetCompanyTripsQuery(undefined, { refetchOnMountOrArgChange: true });
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState('');
  const [stage, setStage] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [truck, setTruck] = useState('');
  const [driver, setDriver] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const onSearch = (event) => { setQuery(event.detail || ''); setPage(1); };
    window.addEventListener('trukkas:global-search', onSearch);
    return () => window.removeEventListener('trukkas:global-search', onSearch);
  }, []);

  const trips = useMemo(() => currentData ?? [], [currentData]);
  // No company API documents the prototype's per-job, multi-truck dispatch summary.
  const needsDispatch = null;

  const phaseCount = (phase) => currentData && trips.every((trip) => trip.phase !== null && (phase !== 'Upcoming' || trip.phase !== 'Upcoming' || trip.driverAssigned !== null))
    ? trips.filter((trip) => matchesPhase(trip, phase)).length : '—';
  const counts = { all: currentData ? trips.length : '—', Upcoming: phaseCount('Upcoming'), Active: phaseCount('Active'), Completed: phaseCount('Completed'), Cancelled: phaseCount('Cancelled') };
  const months = [...new Set(trips.map((t) => t.pickupMonth).filter(Boolean))];

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return trips
      .filter((t) => tab === 'all' || matchesPhase(t, tab))
      .filter((t) => (!month || t.pickupMonth === month) && (!stage || (stage === 'Delayed' ? t.delayed && t.phase === 'Active' : t.status === stage)))
      .filter((t) => (!truck || t.truckPlate === truck) && (!driver || t.driverName === driver))
      .filter((t) => !q || [t.number, t.job.number, t.id, t.jobId, t.truckPlate, t.driverName, t.job?.origin, t.job?.destination, jobTitle(t.job), t.job?.cargoType]
        .some((v) => String(v || '').toLowerCase().includes(q)));
  }, [trips, tab, month, stage, truck, driver, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openTrip = (trip) => navigate(tripDetailHref(trip.id));
  const metric = (value) => isFetching && !currentData ? <Skeleton width={65} height={28} /> : value;

  return (
    <div className={styles.page}>
      <PageHeader
        title="My Trips"
        description="Track and manage all your assigned trips in one place."
        actions={<Button icon="plus" onClick={() => navigate('/jobs')}>Find New Jobs</Button>}
      />

      <section className={styles.stats} aria-label="Trip summary">
        <StatCard icon="truck" label="Total Trips" value={metric(counts.all)} caption="All time" />
        <StatCard icon="circle-play" label="Assigned Trips" value={metric(counts.Upcoming)} caption="Awaiting pickup" />
        <StatCard icon="navigation" tint="green" label="Active Trips" value={metric(counts.Active)} caption="On the road" />
        <StatCard icon="circle-check" tint="navy" label="Completed Trips" value={metric(counts.Completed)} caption="Delivered" />
        <StatCard icon="circle-x" tint="red" label="Cancelled Trips" value={metric(counts.Cancelled)} caption="All time" />
      </section>

      {needsDispatch?.length > 0 && (
        <Banner
          tone="warning" icon="truck"
          title={`${needsDispatch.reduce((sum, row) => sum + row.remaining, 0)} truck(s) still to dispatch on won jobs`}
          action={<Button size="sm" variant="outline" onClick={() => navigate(`/jobs/${needsDispatch[0].job.id}`)}>Dispatch Trucks</Button>}
        >
          {needsDispatch.map((row) => `${row.job.id} (${jobTitle(row.job)}): ${row.dispatched} of ${row.required} dispatched`).join(' · ')}
        </Banner>
      )}

      <Card pad="none" className={styles.listCard}>
        <div style={{ padding: '0 var(--tk-card-pad)' }}>
          <Tabs
            value={tab} onChange={(value) => { setTab(value); setPage(1); }}
            items={TRIP_TABS.map((t) => ({ ...t, count: counts[t.value] }))}
          />
        </div>
        <div className={styles.toolbar}>
          <SearchField placeholder="Search trips, job ID, route, cargo..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); syncTopBarSearch(e.target.value); }} />
          <DatePicker label="Date Range" mode="month" variant="filter" value={monthValue(month)}
            allowedMonths={months.map(monthValue).filter(Boolean)} placeholder="All Time" style={{ '--tk-date-height': '46px' }}
            onChange={(event) => { setMonth(months.find((label) => monthValue(label) === event.target.value) ?? ''); setPage(1); }} />
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
            <Select label="Truck" value={truck} placeholder="All Trucks" options={[...new Set(trips.map((t) => t.truckPlate).filter((value) => value !== '—'))]} onChange={(e) => { setTruck(e.target.value); setPage(1); }} />
            <Select label="Driver" value={driver} placeholder="All Drivers" options={[...new Set(trips.map((t) => t.driverName).filter((value) => value !== '—'))]} onChange={(e) => { setDriver(e.target.value); setPage(1); }} />
            <Button variant="ghost" onClick={() => { setTruck(''); setDriver(''); setMonth(''); setStage(''); setQuery(''); setPage(1); syncTopBarSearch(''); }}>Clear filters</Button>
          </div>
        )}

        {isFetching && !currentData ? <SkeletonRow columns={7} /> : error ? <EmptyState icon="route" title={getApiErrorMessage(error)} /> : !currentData ? <span className="tk-meta">—</span> : pageRows.length === 0 ? (
          <div style={{ padding: 40 }}>
            <EmptyState icon="route" title="No trips match this view" description="Try another tab or clear your filters. Trips appear here once you dispatch trucks on a won job." action={<Button variant="outline" onClick={() => navigate('/jobs')}>Find Jobs</Button>} />
          </div>
        ) : (
          <div className={styles.tableShell}>
            <DataTable
              rows={pageRows}
              rowKey={(t) => t.id}
              onRowClick={openTrip}
              tableLayout="fixed"
              columns={[
                {
                  key: 'id', header: 'Trip / Job ID', width: 176, render: (t) => (
                    <span className={styles.idCell}>
                      <CargoThumb category={t.job?.category} width={36} height={36} radius="var(--tk-r-sm)" />
                      <span><strong>{t.number}</strong><small>{t.job.number}</small></span>
                    </span>
                  ),
                },
                { key: 'route', header: 'Route', width: 144, render: (t) => <span className={styles.twoLine}><strong>{shortPlace(t.job?.origin)} → {shortPlace(t.job?.destination)}</strong><small>{t.job?.distanceKm === null ? '—' : `${t.job.distanceKm.toLocaleString()} km`}</small></span> },
                { key: 'cargo', header: 'Cargo', render: (t) => <span className={styles.twoLine}><strong>{jobTitle(t.job)}</strong><small>{t.job?.cargoType}</small></span> },
                {
                  key: 'truck', header: 'Truck / Driver', width: 152, render: (t) => (
                    <span className={styles.twoLine}>
                      <strong>{t.truckPlate}</strong>
                      <span className={styles.driver}><Avatar name={t.driverName || '?'} size={18} />{t.driverName || 'Unassigned'}</span>
                    </span>
                  ),
                },
                { key: 'dates', header: 'Dates', width: 120, render: (t) => <span className={styles.twoLine}><span>{t.pickupDate}</span><small>→ {t.deliveryDate}</small></span> },
                { key: 'status', header: 'Status', width: 156, render: (t) => <Badge tone={tripHealthTone(tripHealth(t))} dot>{tripHealth(t)}</Badge> },
                {
                  key: 'actions', header: '', width: 88, align: 'center', render: (t) => (
                    <Button size="sm" variant="outline" aria-label={`View ${t.id}`} onClick={(e) => { e.stopPropagation(); openTrip(t); }}>View</Button>
                  ),
                },
              ]}
            />
          </div>
        )}
        <Pagination
          page={currentPage} pageCount={pageCount} pageSize={pageSize} total={currentData ? filtered.length : undefined}
          onPage={(p) => setPage(Math.max(1, Math.min(pageCount, p)))}
          onPageSize={(size) => { setPageSize(size); setPage(1); }}
        />
      </Card>
    </div>
  );
}

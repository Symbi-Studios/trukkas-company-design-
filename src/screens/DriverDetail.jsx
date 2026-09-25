'use client';

import { useMemo } from 'react';
import { useNavigate, useParams } from '../router.js';
import { Badge, Button, Card, DataTable, EmptyState, EntityHeaderCard, PageHeader } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { setDriverStatus } from '../mock/api.js';
import { formatNaira } from '../mock/format.js';

const STATUS_TONE = { Available: 'success', 'On Trip': 'info', 'Off Duty': 'neutral' };

export function DriverDetail() {
  const { driverId } = useParams();
  const navigate = useNavigate();
  const drivers = useCollection('drivers') || [];
  const jobs = useCollection('jobs') || [];
  const driver = drivers.find((d) => d.id === driverId);

  const trips = useMemo(() => jobs
    .filter((job) => job.trip?.driverId === driverId)
    .map((job) => ({ ...job.trip, cargoType: job.cargoType, jobId: job.id, budget: job.budget }))
    .sort((a, b) => b.id.localeCompare(a.id)), [jobs, driverId]);

  if (!driver) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title="Driver not found" />
        <Button variant="outline" onClick={() => navigate('/drivers')}>Back to Drivers</Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader
        crumbs={[{ label: 'Drivers', onClick: () => navigate('/drivers') }, driver.name]}
        title={driver.name}
        description={driver.phone}
        actions={<Button variant="outline" icon="arrow-left" onClick={() => navigate('/drivers')}>Back to Drivers</Button>}
      />
      <EntityHeaderCard
        name={driver.name}
        subtitle={`Joined ${driver.joined} · ${driver.address}`}
        badges={<><Badge tone={STATUS_TONE[driver.status]} dot>{driver.status}</Badge><Badge tone={driver.kyc === 'Verified' ? 'success' : 'warning'}>{driver.kyc}</Badge></>}
        facts={[
          { label: 'Phone', value: driver.phone },
          { label: 'Email', value: driver.email },
          { label: 'License No.', value: driver.licenseNumber },
          { label: 'License Class', value: driver.licenseClass },
          { label: 'License Expiry', value: driver.licenseExpiry },
          { label: 'Assigned Truck', value: driver.truckPlate || '—' },
        ]}
        actions={
          <>
            {driver.status !== 'Available' && <Button variant="outline" onClick={() => setDriverStatus(driver.id, 'Available')}>Mark Available</Button>}
            {driver.status !== 'Off Duty' && <Button variant="outline" onClick={() => setDriverStatus(driver.id, 'Off Duty')}>Mark Off Duty</Button>}
          </>
        }
      />
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16 }}>
        <Card style={{ display: 'grid', gap: 4 }}>
          <span className="tk-meta">Rating</span>
          <span style={{ font: '700 24px/1 var(--tk-font-sans)' }}>{driver.rating?.toFixed(1) ?? '—'} <span className="tk-meta" style={{ fontSize: 13 }}>({driver.reviewCount} reviews)</span></span>
        </Card>
        <Card style={{ display: 'grid', gap: 4 }}>
          <span className="tk-meta">Trips Completed</span>
          <span style={{ font: '700 24px/1 var(--tk-font-sans)' }}>{driver.tripsCompleted}</span>
        </Card>
        <Card style={{ display: 'grid', gap: 4 }}>
          <span className="tk-meta">Total Earnings</span>
          <span style={{ font: '700 24px/1 var(--tk-font-sans)' }}>{formatNaira(trips.filter((t) => t.status === 'Completed').reduce((sum, t) => sum + t.budget, 0))}</span>
        </Card>
      </section>
      <Card pad="none">
        <h3 className="tk-title" style={{ margin: 0, padding: '16px 16px 0' }}>Trip History</h3>
        {trips.length ? (
          <DataTable rows={trips} rowKey={(t) => t.id} onRowClick={(t) => navigate(`/jobs-trips/${t.jobId}`)} columns={[
            { key: 'id', header: 'Trip ID', render: (t) => t.id },
            { key: 'truck', header: 'Truck', render: (t) => t.truckPlate },
            { key: 'cargo', header: 'Cargo', render: (t) => t.cargoType },
            { key: 'earnings', header: 'Earnings', render: (t) => formatNaira(t.budget) },
            { key: 'status', header: 'Status', render: (t) => <Badge tone={t.status === 'Completed' ? 'success' : t.status === 'Cancelled' ? 'danger' : 'info'}>{t.status}</Badge> },
          ]} />
        ) : <EmptyState icon="route" title="No trips yet" />}
      </Card>
    </div>
  );
}

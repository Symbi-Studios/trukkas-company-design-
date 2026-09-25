'use client';

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '../router.js';
import {
  ActivityFeed, Badge, Button, Card, DataTable, DonutChart, DropdownMenu, EmptyState,
  Icon, LabelValue, Modal, PageHeader, StatCard, Tabs, TextField,
} from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { setTruckStatus, updateTruck } from '../mock/api.js';
import { documentStatusTone, summarizeDocuments } from '../domain/documents.js';
import { findTruckBySlug } from '../domain/vehicles.js';
import { formatNaira } from '../mock/format.js';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'documents', label: 'Documents' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'trips', label: 'Trips History' },
  { value: 'costs', label: 'Fuel & Costs' },
  { value: 'activity', label: 'Activity Log' },
];

const REQUIRED_LABELS = [
  ['Registration', 'Vehicle Registration Certificate'],
  ['Insurance', 'Insurance Certificate'],
  ['Road Worthiness', 'Road Worthiness Certificate'],
  ['Emission', 'Emission Test Report'],
  ['Customs', 'Customs Permit'],
];

function specRows(specs) {
  return [
    ['Engine Type', specs.engineType], ['Engine Capacity', specs.engineCapacity],
    ['Transmission', specs.transmission], ['Fuel Type', specs.fuelType],
    ['Axle Configuration', specs.axleConfig], ['Gross Vehicle Weight', specs.gvw],
    ['Load Capacity', specs.loadCapacity], ['Number of Axles', specs.axles],
    ['Fuel Tank Capacity', specs.fuelTankCapacity], ['Emission Standard', specs.emissionStandard],
    ['Trailer Compatibility', specs.trailerCompatibility],
  ];
}

export function VehicleDetail() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const trucks = useCollection('trucks') || [];
  const documents = useCollection('documents') || [];
  const maintenance = useCollection('maintenance') || [];
  const jobs = useCollection('jobs') || [];
  const [tab, setTab] = useState('overview');
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const truck = findTruckBySlug(trucks, vehicleId);
  const plate = truck?.plate;
  const truckDocs = useMemo(() => documents.filter((d) => d.truckPlate === plate), [documents, plate]);
  const truckMaintenance = useMemo(() => maintenance.filter((m) => m.truckPlate === plate), [maintenance, plate]);
  const trips = useMemo(() => jobs
    .filter((job) => job.trip?.truckPlate === plate)
    .map((job) => ({ ...job.trip, cargoType: job.cargoType, jobId: job.id, budget: job.budget }))
    .sort((a, b) => b.id.localeCompare(a.id)), [jobs, plate]);

  if (!truck) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title="Vehicle not found" />
        <Button variant="outline" onClick={() => navigate('/fleet')}>Back to Fleet</Button>
      </div>
    );
  }

  const docSummary = summarizeDocuments(truckDocs);
  const completedTrips = trips.filter((t) => t.status === 'Completed');
  const totalEarnings = completedTrips.reduce((sum, t) => sum + (t.budget || 0), 0);
  const totalMaintenanceCost = truckMaintenance.reduce((sum, m) => sum + (m.cost || 0), 0);
  const nextMaintenance = truckMaintenance.find((m) => m.status === 'Upcoming');

  async function toggleStatus(status) {
    setStatusMenuOpen(false);
    await setTruckStatus(truck.plate, status);
  }
  async function saveNotes() {
    await updateTruck(truck.plate, { notes: notesDraft });
    setNotesOpen(false);
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader
        crumbs={[{ label: 'My Fleet', onClick: () => navigate('/fleet') }, truck.plate]}
        title="Vehicle Details"
        description="View detailed information about this vehicle, its status, documents, and history."
        actions={<Button variant="outline" icon="arrow-left" onClick={() => navigate('/fleet')}>Back to Fleet</Button>}
      />

      <Card style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ width: 64, height: 64, borderRadius: 'var(--tk-r-lg)', background: 'var(--tk-surface-sunk)', display: 'grid', placeItems: 'center', color: 'var(--tk-ink-400)', flex: '0 0 auto' }}>
          <Icon name="truck" size={30} />
        </span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 className="tk-title" style={{ fontSize: 20, margin: 0 }}>{truck.plate}</h2>
            <Badge tone={truck.status === 'Active' ? 'success' : truck.status === 'On Trip' ? 'info' : truck.status === 'In Maintenance' ? 'warning' : 'danger'} dot>{truck.status}</Badge>
          </div>
          <span className="tk-meta">{truck.makeModel} · {truck.type}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: 24 }}>
          <LabelValue layout="stack" label="Registration No." value={truck.plate} />
          <LabelValue layout="stack" label="VIN Number" value={truck.vin} />
          <LabelValue layout="stack" label="Year" value={truck.year} />
          <LabelValue layout="stack" label="Purchase Date" value={truck.purchaseDate} />
        </div>
      </Card>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
        <StatCard icon="activity" label="Current Status" value={truck.status} labelPosition="bottom" />
        <StatCard icon="map-pin" label="Location" value={truck.location} labelPosition="bottom" />
        <StatCard icon="user" label="Assigned Driver" value={truck.driver || 'Unassigned'} caption={truck.driverPhone} labelPosition="bottom" />
        <StatCard icon="gauge" label="Odometer" value={`${truck.odometer.toLocaleString()} km`} caption={`Updated ${truck.odometerUpdated}`} labelPosition="bottom" />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 'var(--tk-grid-gap)', alignItems: 'start' }}>
        <Card pad="none">
          <div style={{ padding: '4px 16px 0' }}><Tabs value={tab} onChange={setTab} items={TABS} /></div>
          <div style={{ padding: 16 }}>
            {tab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <h3 className="tk-title" style={{ fontSize: 15 }}>Vehicle Information</h3>
                  <div>
                    <LabelValue label="Vehicle Type" value={truck.type} />
                    <LabelValue label="Make" value={truck.make} />
                    <LabelValue label="Model" value={truck.model} />
                    <LabelValue label="Color" value={truck.color} />
                    <LabelValue label="Ownership" value={truck.ownership} />
                    <LabelValue label="Insurance Expiry" value={truck.insuranceExpiry} />
                    <LabelValue label="Road Worthiness Expiry" value={truck.roadWorthinessExpiry} />
                  </div>
                </div>
                <div>
                  <h3 className="tk-title" style={{ fontSize: 15 }}>Specifications</h3>
                  <div>
                    {specRows(truck.specs).map(([label, value]) => <LabelValue key={label} label={label} value={value || '—'} />)}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Card tone="sunk" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div>
                      <h3 className="tk-title" style={{ fontSize: 14, margin: '0 0 4px' }}>Additional Notes</h3>
                      <p style={{ margin: 0, font: '400 13px/20px var(--tk-font-sans)', color: 'var(--tk-ink-500)' }}>{truck.notes || 'No notes yet.'}</p>
                    </div>
                    <Button variant="outline" size="sm" icon="pencil" onClick={() => { setNotesDraft(truck.notes || ''); setNotesOpen(true); }}>Edit Notes</Button>
                  </Card>
                </div>
              </div>
            )}

            {tab === 'documents' && (
              <div style={{ display: 'grid', gap: 20 }}>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                  <DonutChart size={120} thickness={16}
                    data={[{ label: 'Valid', value: docSummary.valid, color: 'var(--tk-success)' }, { label: 'Expiring', value: docSummary.expiringSoon, color: 'var(--tk-warning)' }, { label: 'Expired', value: docSummary.expired, color: 'var(--tk-danger)' }]}
                    centerValue={`${docSummary.valid}/${docSummary.total}`} centerLabel="Valid" />
                  <div style={{ display: 'flex', gap: 20 }}>
                    {REQUIRED_LABELS.map(([type, label]) => {
                      const doc = truckDocs.find((d) => d.type === type);
                      const tone = doc ? documentStatusTone(doc.status) : 'neutral';
                      const toneColor = { success: 'var(--tk-success)', warning: 'var(--tk-warning)', danger: 'var(--tk-danger)', neutral: 'var(--tk-ink-300)' }[tone];
                      return (
                        <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icon name={doc?.status === 'Valid' ? 'circle-check' : 'alert-triangle'} size={14} color={toneColor} />
                          <span className="tk-meta">{label}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
                {truckDocs.length ? (
                  <DataTable rows={truckDocs} rowKey={(d) => d.id} columns={[
                    { key: 'name', header: 'Document Name', render: (d) => <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="file-text" size={14} color="var(--tk-ink-400)" />{d.name}</span> },
                    { key: 'type', header: 'Type', render: (d) => d.type },
                    { key: 'expiryDate', header: 'Expiry Date', render: (d) => d.expiryDate },
                    { key: 'status', header: 'Status', render: (d) => <Badge tone={documentStatusTone(d.status)} dot>{d.status}</Badge> },
                    { key: 'uploadedOn', header: 'Uploaded On', render: (d) => d.uploadedOn },
                  ]} />
                ) : <EmptyState icon="file-text" title="No documents uploaded" description="Upload compliance documents for this vehicle." />}
              </div>
            )}

            {tab === 'maintenance' && (
              <div style={{ display: 'grid', gap: 20 }}>
                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
                  <StatCard icon="wrench" label="Total Services" value={truckMaintenance.length} labelPosition="bottom" />
                  <StatCard icon="circle-check" tint="green" label="Completed" value={truckMaintenance.filter((m) => m.status === 'Completed').length} labelPosition="bottom" />
                  <StatCard icon="clock-3" tint="amber" label="Upcoming" value={truckMaintenance.filter((m) => m.status === 'Upcoming').length} labelPosition="bottom" />
                  <StatCard icon="alert-triangle" tint="red" label="Overdue" value={truckMaintenance.filter((m) => m.status === 'Overdue').length} labelPosition="bottom" />
                </section>
                {nextMaintenance && (
                  <Card tone="sunk" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Icon name="wrench" size={16} color="var(--tk-blue)" />
                    <span className="tk-meta">Next service due: <strong style={{ color: 'var(--tk-ink-900)' }}>{nextMaintenance.serviceType}</strong> on {nextMaintenance.date}</span>
                  </Card>
                )}
                {truckMaintenance.length ? (
                  <DataTable rows={truckMaintenance} rowKey={(m) => m.id} columns={[
                    { key: 'date', header: 'Date', render: (m) => m.date },
                    { key: 'serviceType', header: 'Service Type', render: (m) => m.serviceType },
                    { key: 'description', header: 'Description', render: (m) => m.description },
                    { key: 'odometer', header: 'Odometer', render: (m) => `${m.odometer.toLocaleString()} km` },
                    { key: 'cost', header: 'Cost (₦)', render: (m) => formatNaira(m.cost) },
                    { key: 'status', header: 'Status', render: (m) => <Badge tone={m.status === 'Completed' ? 'success' : m.status === 'Overdue' ? 'danger' : 'info'}>{m.status}</Badge> },
                  ]} />
                ) : <EmptyState icon="wrench" title="No maintenance records" />}
              </div>
            )}

            {tab === 'trips' && (
              <div style={{ display: 'grid', gap: 20 }}>
                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
                  <StatCard icon="route" label="Total Trips" value={trips.length} labelPosition="bottom" />
                  <StatCard icon="circle-check" tint="green" label="Completed" value={completedTrips.length} labelPosition="bottom" />
                  <StatCard icon="banknote" tint="blue" label="Total Earnings" value={formatNaira(totalEarnings)} labelPosition="bottom" />
                </section>
                {trips.length ? (
                  <DataTable rows={trips} rowKey={(t) => t.id} onRowClick={(t) => navigate(`/jobs-trips/${t.jobId}`)} columns={[
                    { key: 'id', header: 'Trip ID', render: (t) => t.id },
                    { key: 'route', header: 'Route', render: (t) => `${t.currentLocation || '—'}` },
                    { key: 'cargo', header: 'Cargo', render: (t) => t.cargoType },
                    { key: 'earnings', header: 'Earnings', render: (t) => formatNaira(t.budget) },
                    { key: 'status', header: 'Status', render: (t) => <Badge tone={t.status === 'Completed' ? 'success' : t.status === 'Cancelled' ? 'danger' : 'info'}>{t.status}</Badge> },
                  ]} />
                ) : <EmptyState icon="route" title="No trips yet" description="This vehicle hasn't been assigned to a trip yet." />}
              </div>
            )}

            {tab === 'costs' && (
              <div style={{ display: 'grid', gap: 20 }}>
                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
                  <StatCard icon="wrench" label="Total Maintenance Cost" value={formatNaira(totalMaintenanceCost)} labelPosition="bottom" />
                  <StatCard icon="banknote" tint="green" label="Total Trip Earnings" value={formatNaira(totalEarnings)} labelPosition="bottom" />
                  <StatCard icon="gauge" tint="purple" label="Net (Earnings − Maintenance)" value={formatNaira(totalEarnings - totalMaintenanceCost)} labelPosition="bottom" />
                </section>
                <EmptyState icon="fuel" title="Fuel logging isn't set up yet" description="Fuel purchases will appear here once fuel-card or receipt tracking is connected." />
              </div>
            )}

            {tab === 'activity' && (
              truck.activityLog?.length ? (
                <ActivityFeed items={truck.activityLog.map((a) => ({
                  text: `${a.title} — ${a.detail}`, time: a.time,
                  tone: { danger: 'var(--tk-danger)', warning: 'var(--tk-warning)', purple: 'var(--tk-purple)', orange: 'var(--tk-orange)', info: 'var(--tk-blue)', success: 'var(--tk-success)' }[a.tone] || 'var(--tk-blue)',
                }))} />
              ) : <EmptyState icon="history" title="No activity yet" />
            )}
          </div>
        </Card>

        <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
          <Card style={{ display: 'grid', gap: 10 }}>
            <h3 className="tk-title" style={{ margin: 0, fontSize: 14 }}>Status & Actions</h3>
            <div style={{ position: 'relative' }}>
              <Button fullWidth variant="outline" iconRight="chevron-down" onClick={() => setStatusMenuOpen((v) => !v)}>{truck.status}</Button>
              {statusMenuOpen && (
                <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', zIndex: 20 }}>
                  <DropdownMenu width={220} items={['Active', 'In Maintenance', 'Inactive'].map((s) => ({ label: s, icon: truck.status === s ? 'check' : undefined, onClick: () => toggleStatus(s) }))} />
                </div>
              )}
            </div>
            <Button fullWidth variant="outline" icon="user" onClick={() => navigate('/drivers')}>Assign Driver</Button>
            <Button fullWidth variant="outline" icon="wrench" onClick={() => toggleStatus('In Maintenance')}>Mark for Maintenance</Button>
          </Card>
          <Card style={{ display: 'grid', gap: 6 }}>
            <h3 className="tk-title" style={{ margin: 0, fontSize: 14 }}>Fleet Summary</h3>
            <LabelValue label="Total Trips" value={trips.length} />
            <LabelValue label="Total Distance" value="—" />
            <LabelValue label="Total Earnings" value={formatNaira(totalEarnings)} />
          </Card>
        </div>
      </div>

      <Modal open={notesOpen} onClose={() => setNotesOpen(false)} title="Edit Notes" width={440}
        footer={<><Button variant="outline" onClick={() => setNotesOpen(false)}>Cancel</Button><Button onClick={saveNotes}>Save</Button></>}>
        <TextField label="Additional Notes" value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} />
      </Modal>
    </div>
  );
}

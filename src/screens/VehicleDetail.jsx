'use client';

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '../router.js';
import { ActivityFeed, Avatar, Badge, Button, Card, EmptyState, Icon, LabelValue, Modal, SectionCard, TextField } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { setTruckStatus, updateTruck } from '../mock/api.js';
import { findTruckBySlug } from '../domain/vehicles.js';
import { jobRate } from '../domain/jobs.js';
import { withJobs } from '../domain/trips.js';
import { formatNaira } from '../mock/format.js';
import { VehicleDetailFrame } from './VehicleDetailFrame.jsx';
import { AssignDriverModal, RemoveDriverModal } from '../components/AssignModals.jsx';
import { Toast, useToast } from '../components/Toast.jsx';
import { isOpenTrip } from '../domain/trips.js';

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
  const jobs = useCollection('jobs') || [];
  const allTrips = useCollection('trips') || [];
  const truck = findTruckBySlug(trucks, vehicleId);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [toast, showToast] = useToast();
  const drivers = useCollection('drivers') || [];
  const driver = drivers.find((d) => d.id === truck?.driverId);
  const onTrip = allTrips.some((t) => t.truckPlate === truck?.plate && isOpenTrip(t));

  const trips = useMemo(() => withJobs(allTrips, jobs)
    .filter((trip) => trip.truckPlate === truck?.plate)
    .map((trip) => ({ ...trip, budget: jobRate(trip.job) })), [allTrips, jobs, truck?.plate]);
  const totalEarnings = trips.filter((t) => t.status === 'Completed').reduce((sum, t) => sum + (t.budget || 0), 0);

  if (!truck) {
    return (
      <VehicleDetailFrame tab="overview" title="Vehicle not found">
        <EmptyState icon="truck" title="This vehicle could not be found" />
      </VehicleDetailFrame>
    );
  }

  async function saveNotes() {
    await updateTruck(truck.plate, { notes: notesDraft });
    setNotesOpen(false);
  }

  return (
    <VehicleDetailFrame
      tab="overview"
      title="Truck Details"
      description="View detailed information about this truck, its status, documents, and history."
      rail={
        <>
          {truck.vehicleClass !== 'Trailer' && (
            <SectionCard title="Assigned Driver" action={driver && <Badge tone={driver.status === 'On Trip' ? 'info' : driver.status === 'Available' ? 'success' : 'neutral'} dot>{driver.status}</Badge>}>
              {driver ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar name={driver.name} src={driver.photo || undefined} size={52} />
                    <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                      <strong style={{ font: '600 15px/20px var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{driver.name}</strong>
                      <span className="tk-meta">{driver.phone}</span>
                      <span className="tk-meta" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="star" filled size={12} color="var(--tk-warning)" />{driver.rating?.toFixed(1) ?? '—'} · {driver.tripsCompleted} trips · {driver.licenseClass}
                      </span>
                    </span>
                  </div>
                  <LabelValue label="Licence" value={driver.licenseNumber} style={{ padding: '4px 0' }} />
                  <LabelValue label="Licence Expiry" value={driver.licenseExpiry} style={{ padding: '4px 0' }} />
                  <Button variant="secondary" icon="user-round" fullWidth onClick={() => navigate(`/drivers/${driver.id}`)}>View Driver Profile</Button>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <Button variant="outline" size="sm" icon="repeat" disabled={onTrip} onClick={() => setAssignOpen(true)}>Replace</Button>
                    <Button variant="danger" size="sm" icon="user-minus" disabled={onTrip} onClick={() => setRemoveOpen(true)}>Remove</Button>
                  </div>
                  {onTrip && <span className="tk-meta">Driver changes are locked while this truck is on an active trip.</span>}
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10, justifyItems: 'start' }}>
                  <span className="tk-meta">No driver is assigned. This truck can’t be dispatched until it has one.</span>
                  <Button icon="user-plus" fullWidth onClick={() => setAssignOpen(true)}>Assign Driver</Button>
                </div>
              )}
            </SectionCard>
          )}
          <Card style={{ display: 'grid', gap: 10 }}>
            <h3 className="tk-title" style={{ margin: 0, fontSize: 14 }}>Status & Actions</h3>
            <div style={{ position: 'relative' }}>
              <Button fullWidth variant="outline" iconRight="chevron-down" onClick={() => setStatusMenuOpen((v) => !v)}>{truck.status}</Button>
              {statusMenuOpen && (
                <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', zIndex: 20, background: '#fff', border: '1px solid var(--tk-line)', borderRadius: 'var(--tk-r-lg)', boxShadow: 'var(--tk-shadow-menu)', padding: 6 }}>
                  {['Active', 'In Maintenance', 'Inactive'].map((s) => (
                    <button key={s} type="button" onClick={() => { setStatusMenuOpen(false); setTruckStatus(truck.plate, s); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 10px', border: 0, background: 'transparent', cursor: 'pointer', borderRadius: 'var(--tk-r-sm)', font: '500 13px/18px var(--tk-font-sans)' }}>{s}</button>
                  ))}
                </div>
              )}
            </div>
            <Button fullWidth variant="outline" icon="wrench" onClick={() => setTruckStatus(truck.plate, 'In Maintenance')}>Mark for Maintenance</Button>
            <Button fullWidth variant="outline" icon="file-text" onClick={() => navigate(`/fleet/${vehicleId}/documents`)}>View Documents</Button>
            <Button fullWidth variant="danger" icon="power" onClick={() => setTruckStatus(truck.plate, truck.status === 'Inactive' ? 'Active' : 'Inactive')}>{truck.status === 'Inactive' ? 'Activate Truck' : 'Deactivate Truck'}</Button>
          </Card>
          <Card style={{ display: 'grid', gap: 6 }}>
            <h3 className="tk-title" style={{ margin: 0, fontSize: 14 }}>Fleet Summary</h3>
            <LabelValue label="Total Trips" value={trips.length} />
            <LabelValue label="Total Distance" value={`${truck.odometer.toLocaleString()} km`} />
            <LabelValue label="Total Earnings" value={formatNaira(totalEarnings)} />
            <LabelValue label="Average Fuel Consumption" value="—" />
          </Card>
          <Card style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="tk-title" style={{ margin: 0, fontSize: 14 }}>Recent Activity</h3>
              <button type="button" onClick={() => navigate(`/fleet/${vehicleId}/activity`)} style={{ border: 0, background: 'transparent', color: 'var(--tk-blue)', font: '600 12px/1 var(--tk-font-sans)', cursor: 'pointer' }}>View All</button>
            </div>
            {truck.activityLog?.length ? (
              <ActivityFeed items={truck.activityLog.slice(0, 4).map((a) => ({ text: `${a.title} — ${a.detail}`, time: a.time }))} />
            ) : <span className="tk-meta">No recent activity.</span>}
          </Card>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <h3 className="tk-title" style={{ fontSize: 15 }}>Vehicle Information</h3>
          <div>
            <LabelValue label="Vehicle Type" value={truck.type} />
            <LabelValue label="Make" value={truck.make} />
            <LabelValue label="Model" value={truck.model} />
            <LabelValue label="Year of Manufacture" value={truck.year} />
            <LabelValue label="Chassis / VIN" value={truck.vin} />
            {truck.engineNumber && <LabelValue label="Engine Number" value={truck.engineNumber} />}
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
      {truck.photos?.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 className="tk-title" style={{ fontSize: 15 }}>Photos</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {truck.photos.map((p) => (
              <figure key={p.label} style={{ margin: 0 }}>
                <img src={p.url} alt={`${truck.plate} ${p.label}`} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 'var(--tk-r-md)', border: '1px solid var(--tk-line)' }} />
                <figcaption className="tk-meta">{p.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
      <AssignDriverModal truck={truck} open={assignOpen} onClose={() => setAssignOpen(false)} onDone={(d) => { setAssignOpen(false); showToast(`${d?.name || 'Driver'} assigned to ${truck.plate}.`); }} />
      <RemoveDriverModal truck={truck} open={removeOpen} onClose={() => setRemoveOpen(false)} onDone={() => { setRemoveOpen(false); showToast(`Driver removed from ${truck.plate}.`); }} />
      <Toast message={toast} />
      <Modal open={notesOpen} onClose={() => setNotesOpen(false)} title="Edit Notes" width={440}
        footer={<><Button variant="outline" onClick={() => setNotesOpen(false)}>Cancel</Button><Button onClick={saveNotes}>Save</Button></>}>
        <TextField label="Additional Notes" value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} />
      </Modal>
    </VehicleDetailFrame>
  );
}

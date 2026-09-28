'use client';

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '../router.js';
import {
  Avatar, Badge, Button, Card, DataTable, DropdownMenu, EmptyState, Icon, IconButton, LabelValue, MessageBubble,
  PageHeader, SectionCard, Select, SplitButton, StatCard, Tabs, Textarea, TextField,
} from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { addTripCost, addTripNote, cancelTrip, sendTripMessage, updateTripStatus, uploadTripDocument } from '../mock/api.js';
import { jobRate, jobTitle } from '../domain/jobs.js';
import {
  TRIP_COST_CATEGORIES, TRIP_SECTIONS, TRIP_STAGES, isOpenTrip, nextTripStage, tripCostTotal, tripHealth, tripHealthTone, tripPhase,
} from '../domain/trips.js';
import { plateSlug, vehicleStatusTone } from '../domain/vehicles.js';
import { formatNaira } from '../mock/format.js';
import { MessageModal } from '../components/MessageModal.jsx';
import { RouteMap } from '../components/RouteMap.jsx';
import { ReportIssueModal, UpdateLocationModal } from '../components/TripModals.jsx';
import { TripStepper } from '../components/TripStepper.jsx';
import { Toast, copyLink, useToast } from '../components/Toast.jsx';
import styles from './TripDetail.module.css';

const STATE_BADGE = {
  done: ['success', 'Completed'], active: ['info', 'In Progress'], pending: ['neutral', 'Pending'], cancelled: ['danger', 'Cancelled'],
};

function InfoStrip({ trip, job }) {
  const facts = [
    ['calendar', 'Pickup Date', trip.pickupDate],
    ['calendar-check', 'Delivery Date', trip.deliveryDate],
    ['route', 'Distance', `~ ${job.distanceKm.toLocaleString()} km`],
    ['arrow-right-left', 'Trip Type', job.tripType],
    ['circle-dollar-sign', 'Cargo Value', job.cargoValue ? formatNaira(job.cargoValue) : '—'],
    ['weight', 'Weight', `${job.weightKg.toLocaleString()} kg`],
  ];
  return (
    <Card pad="none" className={styles.infoStrip}>
      {facts.map(([icon, label, value]) => (
        <div key={label}>
          <Icon name={icon} size={20} color="var(--tk-ink-500)" />
          <span><small>{label}</small><strong>{value}</strong></span>
        </div>
      ))}
    </Card>
  );
}

function DriverCard({ trip, onNavigate }) {
  return (
    <SectionCard title="Driver">
      {trip.driverId ? (
        <>
          <div className={styles.person}>
            <Avatar name={trip.driverName} size={52} />
            <span><strong>{trip.driverName}</strong><small>{trip.driverPhone}</small></span>
            <Button variant="secondary" size="sm" icon="phone" onClick={() => { window.location.href = `tel:${trip.driverPhone.replace(/\s+/g, '')}`; }}>Call</Button>
          </div>
          <button type="button" className={styles.centerLink} onClick={() => onNavigate(`/drivers/${trip.driverId}`)}>View Driver Profile</button>
        </>
      ) : <span className="tk-meta">No driver assigned.</span>}
    </SectionCard>
  );
}

function TruckCard({ trip, truck, onNavigate }) {
  return (
    <SectionCard title="Truck">
      <div className={styles.person}>
        <span className={styles.truckTile}><Icon name="truck" size={30} /></span>
        <span>
          <strong>{trip.truckPlate}</strong>
          <small>{truck?.makeModel || '—'}</small>
          {trip.trailer && <small>{trip.trailer}</small>}
        </span>
        {truck && <Badge tone={vehicleStatusTone(truck.status)} dot>{truck.status}</Badge>}
      </div>
      <button type="button" className={styles.centerLink} onClick={() => onNavigate(`/fleet/${plateSlug(trip.truckPlate)}`)}>View Truck Details</button>
    </SectionCard>
  );
}

function QuickActions({ actions }) {
  return (
    <SectionCard title="Quick Actions">
      <div className={styles.quickGrid}>
        {actions.map((a) => (
          <Button key={a.label} variant="secondary" icon={a.icon} onClick={a.onClick} style={a.wide ? { gridColumn: '1 / -1' } : undefined}>{a.label}</Button>
        ))}
      </div>
    </SectionCard>
  );
}

function NotesCard({ trip, compact, onToast }) {
  const [note, setNote] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (!note.trim()) return;
    await addTripNote(trip.id, note.trim());
    setNote('');
    onToast('Note added.');
  }
  const notes = trip.notes.slice().reverse();
  return (
    <SectionCard title="Notes" count={compact ? undefined : trip.notes.length}>
      <form onSubmit={submit} className={styles.noteForm}>
        <TextField placeholder="Add a note about this trip..." value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: 1 }} />
        <Button type="submit" disabled={!note.trim()}>Add Note</Button>
      </form>
      {notes.length === 0 ? <p className="tk-meta" style={{ marginTop: 12 }}>No notes yet.</p> : (compact ? notes.slice(0, 2) : notes).map((n, i) => (
        <div key={i} className={styles.noteRow}>
          <Avatar name={n.author === 'You' ? 'You' : n.author} size={32} tone="var(--tk-navy)" />
          <span>
            <span><strong>{n.author}</strong> <span className="tk-meta">{n.time}</span></span>
            <p>{n.body}</p>
          </span>
        </div>
      ))}
    </SectionCard>
  );
}

function TimelineCard({ trip, onViewMap }) {
  return (
    <SectionCard
      title="Trip Timeline" description="Track the progress and key events of this trip in real-time."
      action={onViewMap && <Button variant="secondary" size="sm" icon="map-pin" onClick={onViewMap}>View on Map</Button>}
    >
      <ol className={styles.timeline}>
        {trip.timeline.map((item, i) => {
          const [tone, label] = STATE_BADGE[item.state] || STATE_BADGE.pending;
          return (
            <li key={i} className={styles[item.state] || ''}>
              <span className={styles.tlDate}><strong>{item.date}</strong><small>{item.time}</small></span>
              <span className={styles.tlDot}>{item.state === 'done' && <Icon name="check" size={11} color="#fff" />}</span>
              <span className={styles.tlIcon}><Icon name={item.icon || 'circle'} size={18} /></span>
              <span className={styles.tlBody}>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
                {item.reference && <small>Reference: {item.reference}</small>}
                {item.location && <small>Current location: {item.location}</small>}
              </span>
              <Badge tone={tone} dot>{label}</Badge>
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}

function DocumentsSection({ trip, job, onToast }) {
  const [busy, setBusy] = useState(null);
  async function upload(name) {
    setBusy(name);
    await uploadTripDocument(trip.id, name);
    setBusy(null);
    onToast(`${name} uploaded.`);
  }
  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <SectionCard title="Trip Documents" count={trip.documents.length} action={<Button size="sm" icon="upload" onClick={() => upload('Proof of Delivery')}>Upload Document</Button>}>
        {trip.documents.length === 0 ? <EmptyState icon="file-text" title="No documents yet" description="Upload waybills, delivery notes and receipts for this trip." /> : (
          <div className={styles.docRows}>
            {trip.documents.map((doc) => (
              <div key={doc.name}>
                <span className={styles.docIcon} data-kind={doc.status === 'Uploaded' ? doc.kind : 'pending'}><Icon name="file-text" size={18} /></span>
                <span className={styles.docMain}><strong>{doc.name}</strong><small>{doc.uploadedOn ? `Uploaded • ${doc.uploadedOn}${doc.size ? ` · ${doc.size}` : ''}` : 'Pending'}</small></span>
                <Badge tone={doc.status === 'Uploaded' ? 'success' : 'warning'}>{doc.status}</Badge>
                {doc.status === 'Uploaded'
                  ? <IconButton icon="download" tone="outline" size={32} label={`Download ${doc.name}`} onClick={() => onToast(`${doc.name} download started.`)} />
                  : <Button size="sm" variant="secondary" icon="upload" disabled={busy === doc.name} onClick={() => upload(doc.name)}>{busy === doc.name ? 'Uploading…' : 'Upload'}</Button>}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      {job.documents.length > 0 && (
        <SectionCard title="Shared by Forwarder" description="Job-level documents that apply to every trip on this job.">
          <div className={styles.docRows}>
            {job.documents.map((doc) => (
              <div key={doc.name}>
                <span className={styles.docIcon}><Icon name="file-text" size={18} /></span>
                <span className={styles.docMain}><strong>{doc.name}</strong><small>{doc.size}</small></span>
                <IconButton icon="download" tone="outline" size={32} label={`Download ${doc.name}`} onClick={() => onToast(`${doc.name} download started.`)} />
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function CostsSection({ trip, job, onToast }) {
  const [draft, setDraft] = useState({ category: TRIP_COST_CATEGORIES[0], amount: '', description: '' });
  const revenue = jobRate(job);
  const total = tripCostTotal(trip);
  async function submit(event) {
    event.preventDefault();
    if (!Number(draft.amount)) return;
    await addTripCost(trip.id, draft);
    setDraft({ category: draft.category, amount: '', description: '' });
    onToast('Cost added.');
  }
  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <div className={styles.costStats}>
        <StatCard icon="banknote" tint="green" label="Trip Revenue" value={formatNaira(revenue)} caption="Agreed rate for this truck" />
        <StatCard icon="receipt" tint="amber" label="Total Costs" value={formatNaira(total)} caption={`${trip.costs.length} entries`} />
        <StatCard icon="trending-up" tint={revenue - total >= 0 ? 'blue' : 'red'} label="Net Margin" value={formatNaira(revenue - total)} caption={revenue ? `${Math.round(((revenue - total) / revenue) * 100)}% of revenue` : undefined} />
      </div>
      <SectionCard title="Trip Costs" pad="none">
        {trip.costs.length === 0 ? <div style={{ padding: 24 }}><EmptyState icon="receipt" title="No costs logged" description="Log fuel, tolls, allowances and other trip expenses." /></div> : (
          <DataTable rows={trip.costs} rowKey={(c) => c.id} columns={[
            { key: 'category', header: 'Category', render: (c) => <strong style={{ color: 'var(--tk-ink-900)' }}>{c.category}</strong> },
            { key: 'description', header: 'Description', render: (c) => c.description || '—' },
            { key: 'date', header: 'Date', render: (c) => c.date },
            { key: 'amount', header: 'Amount', align: 'right', render: (c) => <strong style={{ color: 'var(--tk-ink-900)' }}>{formatNaira(c.amount)}</strong> },
          ]} />
        )}
        {isOpenTrip(trip) && (
          <form onSubmit={submit} className={styles.costForm}>
            <Select label="Category" value={draft.category} options={TRIP_COST_CATEGORIES} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
            <TextField label="Amount (₦)" type="number" min="0" required value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
            <TextField label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="e.g. Diesel top-up at Lokoja" />
            <Button type="submit" icon="plus" disabled={!Number(draft.amount)}>Add Cost</Button>
          </form>
        )}
      </SectionCard>
    </div>
  );
}

function CommunicationSection({ trip, job, onToast }) {
  const [body, setBody] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (!body.trim()) return;
    await sendTripMessage(trip.id, body.trim());
    setBody('');
    onToast('Message sent.');
  }
  return (
    <SectionCard title="Communication" description={`Messages with ${trip.driverName || 'the driver'} and the forwarder about ${trip.id}.`}>
      {trip.messages.length === 0 ? <EmptyState icon="messages-square" title="No messages yet" description="Start the conversation with your driver." /> : (
        <div>
          {trip.messages.map((m, i) => (
            <MessageBubble key={i} author={m.author} role={m.role} roleTone={m.role === 'Driver' ? 'orange' : m.role === 'Forwarder' ? 'purple' : 'blue'} time={m.time}>
              {m.body}
            </MessageBubble>
          ))}
        </div>
      )}
      {isOpenTrip(trip) && (
        <form onSubmit={submit} className={styles.composer}>
          <Textarea rows={3} maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} placeholder={`Message ${trip.driverName || 'driver'} and ${job ? 'the forwarder' : 'team'}...`} />
          <Button type="submit" icon="send" disabled={!body.trim()}>Send</Button>
        </form>
      )}
    </SectionCard>
  );
}

export function TripDetail({ section = 'overview' }) {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const trips = useCollection('trips') || [];
  const jobs = useCollection('jobs') || [];
  const trucks = useCollection('trucks') || [];
  const trip = trips.find((t) => t.id === tripId);
  const job = useMemo(() => jobs.find((j) => j.id === trip?.jobId), [jobs, trip?.jobId]);
  const truck = trucks.find((t) => t.plate === trip?.truckPlate);
  const [statusMenu, setStatusMenu] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [toast, showToast] = useToast();

  if (!trip || !job) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title="Trip not found" crumbs={[{ label: 'My Trips', onClick: () => navigate('/trips') }, tripId]} />
        <EmptyState icon="route" title="This trip could not be found" action={<Button variant="outline" onClick={() => navigate('/trips')}>Back to My Trips</Button>} />
      </div>
    );
  }

  const base = `/trips/${trip.id}`;
  const health = tripHealth(trip);
  const open = isOpenTrip(trip);
  const next = nextTripStage(trip);
  const liveProgress = tripPhase(trip) === 'Active' ? trip.progress : undefined;
  const scrollToMap = () => document.getElementById('trip-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  async function setStatus(status) {
    setStatusMenu(false);
    if (status === 'Cancelled') await cancelTrip(trip.id);
    else await updateTripStatus(trip.id, status);
    showToast(`${trip.id} marked ${status}.`);
  }

  const map = (
    <div id="trip-map">
      <RouteMap
        title={section === 'overview' ? 'Route & Live Location' : 'Live Location'}
        origin={job.origin} destination={job.destination} distanceKm={job.distanceKm}
        progress={liveProgress} lastUpdated={trip.lastUpdated}
        truckLabel={liveProgress != null ? `${trip.truckPlate}${trip.speedKmh ? ` · ${trip.speedKmh} km/h` : ''}` : undefined}
        height={section === 'overview' ? 250 : 220}
      />
    </div>
  );
  const quickActions = [
    open && { label: 'Update Location', icon: 'map-pin', onClick: () => setLocationOpen(true) },
    { label: 'Report Issue', icon: 'triangle-alert', onClick: () => setReportOpen(true) },
    section === 'timeline' && { label: 'Add Note', icon: 'file-plus', onClick: () => navigate(`${base}/notes`) },
    { label: 'Contact Support', icon: 'headset', onClick: () => setSupportOpen(true), wide: section !== 'timeline' },
  ].filter(Boolean);

  const rail = (
    <aside className={styles.rail}>
      {section === 'timeline' && map}
      <DriverCard trip={trip} onNavigate={navigate} />
      <TruckCard trip={trip} truck={truck} onNavigate={navigate} />
      {section === 'overview' && (
        <SectionCard title="Trip Documents" action={<button type="button" className={styles.link} onClick={() => navigate(`${base}/documents`)}>View All ({trip.documents.length})</button>}>
          {trip.documents.length === 0 ? <span className="tk-meta">No documents yet.</span> : (
            <div className={styles.docMini}>
              {trip.documents.slice(0, 5).map((doc) => (
                <div key={doc.name}>
                  <span className={styles.docIcon} data-kind={doc.status === 'Uploaded' ? doc.kind : 'pending'}><Icon name="file-text" size={16} /></span>
                  <span className={styles.docMain}><strong>{doc.name}</strong><small>{doc.uploadedOn ? `Uploaded • ${doc.uploadedOn}` : 'Pending'}</small></span>
                  <IconButton icon="download" tone="outline" size={28} label={`Download ${doc.name}`} disabled={!doc.uploadedOn} onClick={() => showToast(`${doc.name} download started.`)} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
      <QuickActions actions={quickActions} />
    </aside>
  );

  return (
    <div className={styles.page}>
      <PageHeader
        crumbs={[{ label: 'My Trips', onClick: () => navigate('/trips') }, trip.id]}
        title={trip.id}
        meta={<Badge tone={tripHealthTone(health)} dot>{health}</Badge>}
        description={
          <>
            <span className={styles.subtitle}>
              {jobTitle(job)} <span aria-hidden="true">•</span> {job.cargoType}
              <button type="button" className={styles.jobChip} onClick={() => navigate(`/jobs/${job.id}`)}>
                {job.id}{job.trucksRequired > 1 ? ` · ${job.trucksRequired} trucks` : ''}
              </button>
            </span>
            <span className={styles.routeText}>
              {job.origin} <Icon name="arrow-right" size={14} /> {job.destination}
              <IconButton icon="external-link" size={22} label="View route map" onClick={scrollToMap} style={{ color: 'var(--tk-blue)' }} />
            </span>
          </>
        }
        actions={
          <>
            <Button variant="secondary" icon="share-2" onClick={() => copyLink(showToast)}>Share Trip</Button>
            <Button variant="secondary" icon="triangle-alert" onClick={() => setReportOpen(true)}>Report Issue</Button>
            {open ? (
              <div style={{ position: 'relative' }}>
                <SplitButton
                  onAction={() => (next ? setStatus(next) : setStatusMenu((v) => !v))}
                  onToggle={() => setStatusMenu((v) => !v)}
                  style={{ minWidth: 220 }}
                >
                  {next ? `Mark as ${next}` : 'Update Status'}
                </SplitButton>
                {statusMenu && (
                  <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 30 }}>
                    <DropdownMenu width={230} items={[
                      { section: 'Update Status' },
                      ...TRIP_STAGES.slice(TRIP_STAGES.indexOf(trip.status) + 1).map((stage) => ({
                        label: stage, icon: stage === 'Completed' ? 'circle-check' : 'arrow-right', onClick: () => setStatus(stage),
                      })),
                      { divider: true },
                      { label: 'Cancel Trip', icon: 'ban', tone: 'danger', onClick: () => setStatus('Cancelled') },
                    ]} />
                  </div>
                )}
              </div>
            ) : (
              <Button disabled>Trip {trip.status}</Button>
            )}
          </>
        }
      />

      <Tabs
        value={section}
        onChange={(value) => navigate(value === 'overview' ? base : `${base}/${value}`)}
        items={TRIP_SECTIONS.map((s) => ({
          ...s,
          count: s.value === 'documents' ? trip.documents.length : s.value === 'notes' ? trip.notes.length : undefined,
        }))}
      />

      <div className={styles.layout}>
        <div className={styles.main}>
          <InfoStrip trip={trip} job={job} />

          {section === 'overview' && (
            <>
              <div className={styles.twoUp}>
                {map}
                <SectionCard title="Trip Progress" action={<button type="button" className={styles.link} onClick={() => navigate(`${base}/timeline`)}>View Timeline</button>}>
                  <div style={{ display: 'grid', gap: 18 }}>
                    <TripStepper trip={trip} />
                    <div className={styles.currentBox}>
                      <span className={styles.currentIcon}><Icon name={trip.status === 'Cancelled' ? 'ban' : trip.status === 'Completed' ? 'circle-check' : 'truck'} size={22} /></span>
                      <span>
                        <strong>{trip.status}</strong>
                        <small>{trip.timeline.find((t) => t.state === 'active')?.detail || `Trip is ${trip.status.toLowerCase()}.`}</small>
                        <small>Last location update: {trip.lastUpdated}</small>
                      </span>
                    </div>
                  </div>
                </SectionCard>
              </div>
              <div className={styles.twoUp}>
                <SectionCard title="Cargo Information">
                  <dl className={styles.cargoList}>
                    <div><dt>Cargo Type</dt><dd>{jobTitle(job)}</dd></div>
                    <div><dt>Description</dt><dd>{job.cargoType}</dd></div>
                    <div><dt>Weight</dt><dd>{job.weightKg.toLocaleString()} kg</dd></div>
                    <div><dt>Quantity</dt><dd>{job.quantity}</dd></div>
                    <div><dt>Cargo Value</dt><dd>{job.cargoValue ? formatNaira(job.cargoValue) : '—'}</dd></div>
                    <div><dt>Special Instructions</dt><dd>{job.specialInstructions || '—'}</dd></div>
                  </dl>
                </SectionCard>
                <SectionCard title="Locations">
                  <ol className={styles.locations}>
                    <li className={trip.status === 'Assigned' ? styles.pending : styles.done}>
                      <span className={styles.locDot} />
                      <span><strong>Pickup Location</strong><small>{job.origin}</small></span>
                      <span className={styles.locWhen}><small>{trip.pickupDate}</small><small>{trip.pickupTime}</small></span>
                      <Badge tone={trip.status === 'Assigned' ? 'neutral' : 'success'} dot>{trip.status === 'Assigned' ? 'Pending' : 'Completed'}</Badge>
                    </li>
                    {open && trip.status !== 'Assigned' && (
                      <li className={styles.active}>
                        <span className={styles.locDot} />
                        <span><strong>Current Location</strong><small>{trip.currentLocation}</small></span>
                        <span className={styles.locWhen}><small>{trip.lastUpdated}</small></span>
                        <Badge tone="info" dot>{trip.status}</Badge>
                      </li>
                    )}
                    <li className={trip.status === 'Completed' ? styles.done : styles.pending}>
                      <span className={styles.locDot} />
                      <span><strong>Destination</strong><small>{job.destination}</small></span>
                      <span className={styles.locWhen}><small>{trip.deliveryDate}</small><small>{trip.status === 'Completed' ? '' : '(Estimated)'}</small></span>
                      <Badge tone={trip.status === 'Completed' ? 'success' : 'neutral'} dot>{trip.status === 'Completed' ? 'Delivered' : 'Pending'}</Badge>
                    </li>
                  </ol>
                </SectionCard>
              </div>
              <NotesCard trip={trip} compact onToast={showToast} />
            </>
          )}

          {section === 'timeline' && <TimelineCard trip={trip} onViewMap={scrollToMap} />}
          {section === 'documents' && <DocumentsSection trip={trip} job={job} onToast={showToast} />}
          {section === 'costs' && <CostsSection trip={trip} job={job} onToast={showToast} />}
          {section === 'notes' && <NotesCard trip={trip} onToast={showToast} />}
          {section === 'communication' && <CommunicationSection trip={trip} job={job} onToast={showToast} />}

          {section !== 'overview' && section !== 'timeline' && (
            <Card className={styles.jobContext}>
              <Icon name="briefcase" size={18} color="var(--tk-blue)" />
              <span>
                Part of job <button type="button" className={styles.link} onClick={() => navigate(`/jobs/${job.id}`)}>{job.id}</button>
                {job.trucksRequired > 1 ? ` · one of ${job.trucksRequired} trucks booked for this job.` : '.'}
              </span>
              <LabelValue layout="stack" label="Rate for this trip" value={formatNaira(jobRate(job))} style={{ marginLeft: 'auto' }} />
            </Card>
          )}
        </div>
        {rail}
      </div>

      <ReportIssueModal trip={trip} open={reportOpen} onClose={() => setReportOpen(false)} onDone={(msg) => { setReportOpen(false); showToast(msg); }} />
      <UpdateLocationModal trip={trip} open={locationOpen} onClose={() => setLocationOpen(false)} onDone={(msg) => { setLocationOpen(false); showToast(msg); }} />
      <MessageModal
        open={supportOpen} onClose={() => setSupportOpen(false)} title="Contact Support" recipient="Trukkas Support"
        placeholder={`Tell us what you need help with on ${trip.id}...`}
        onSend={async () => { setSupportOpen(false); showToast('Support request sent. We will reply shortly.'); }}
      />
      <Toast message={toast} />
    </div>
  );
}

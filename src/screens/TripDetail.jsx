'use client';

import { useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useNavigate, useParams } from '../router.js';
import {
  Avatar, Badge, Button, Card, DataTable, DropdownMenu, EmptyState, Icon, IconButton, LabelValue, MessageBubble,
  PageHeader, SectionCard, Select, SkeletonRow, SplitButton, StatCard, Tabs, Textarea, TextField,
} from '../ds.js';
import {
  useGetCompanyTripQuery, useGetCompanyTripMessagesQuery, useUpdateCompanyTripStatusMutation,
  useContactCompanyTripSupportMutation, useAddCompanyTripNoteMutation, useAddCompanyTripCostMutation,
  useUploadCompanyTripDocumentMutation, useRequestCompanyTripCancellationMutation, useSendCompanyTripMessageMutation,
} from '../store/features/trips/tripsApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { jobTitle } from '../domain/jobs.js';
import { tripDetailHref } from '../domain/tripLinks.js';
import { jobDetailHref } from '../domain/jobLinks.js';
import { driverDetailHref } from '../domain/driverLinks.js';
import { fleetDetailHref } from '../domain/fleetLinks.js';
import {
  TRIP_COST_CATEGORIES, TRIP_SECTIONS, TRIP_STAGES, isOpenTrip, nextTripStage, tripHealth, tripHealthTone, tripPhase,
} from '../domain/trips.js';
import { vehicleStatusTone } from '../domain/vehicles.js';
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

const amountLabel = (value) => typeof value === 'number' && Number.isFinite(value) ? formatNaira(value) : '—';
const distanceLabel = (value) => typeof value === 'number' && Number.isFinite(value) ? `~ ${value.toLocaleString()} km` : '—';
const weightLabel = (value) => typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString()} kg` : '—';
function downloadDocument(doc, onToast) {
  if (!doc.url) { onToast('This document download is currently unavailable.'); return; }
  window.open(doc.url, '_blank', 'noopener,noreferrer');
}

function InfoStrip({ trip, job }) {
  const facts = [
    ['calendar', 'Pickup Date', trip.pickupDate],
    ['calendar-check', 'Delivery Date', trip.deliveryDate],
    ['route', 'Distance', distanceLabel(job.distanceKm)],
    ['arrow-right-left', 'Trip Type', job.tripType],
    ['circle-dollar-sign', 'Cargo Value', amountLabel(job.cargoValue)],
    ['weight', 'Weight', weightLabel(job.weightKg)],
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

function DriverCard({ trip }) {
  const navigate = useNavigate();
  return (
    <SectionCard title="Driver">
      {trip.driverId ? (
        <>
          <div className={styles.person}>
            <Avatar name={trip.driverName} src={trip.driverPhoto || undefined} size={52} />
            <span><strong>{trip.driverName}</strong><small>{trip.driverPhone}</small></span>
            <Button variant="secondary" size="sm" icon="phone" disabled={!/^\+?[\d\s()-]{7,}$/.test(trip.driverPhone)} onClick={() => { window.location.href = `tel:${trip.driverPhone.replace(/\s+/g, '')}`; }}>Call</Button>
          </div>
          <button type="button" className={styles.centerLink} onClick={() => navigate(driverDetailHref(trip.driverId))}>View Driver Profile</button>
        </>
      ) : <span className="tk-meta">{trip.driverAssigned === false ? 'No driver assigned.' : '—'}</span>}
    </SectionCard>
  );
}

function TruckCard({ trip, truck, onToast }) {
  const navigate = useNavigate();
  return (
    <SectionCard title="Truck">
      <div className={styles.person}>
        <span className={styles.truckTile}><Icon name="truck" size={30} /></span>
        <span>
          <strong>{trip.truckPlate}</strong>
          <small>{truck?.makeModel || '—'}</small>
          {trip.trailer && <small>{trip.trailer}</small>}
        </span>
        {truck && <Badge tone={truck.status === '—' ? 'neutral' : vehicleStatusTone(truck.status)} dot>{truck.status}</Badge>}
      </div>
      <button type="button" className={styles.centerLink} onClick={() => trip.truckId ? navigate(fleetDetailHref(trip.truckId)) : onToast('Truck details are currently unavailable.')}>View Truck Details</button>
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
  const [addNote, { isLoading: saving }] = useAddCompanyTripNoteMutation();
  const submitting = useRef(false);
  async function submit(event) {
    event.preventDefault();
    if (submitting.current || !note.trim()) return;
    submitting.current = true;
    try {
      await addNote({ tripId: trip.id, body: note.trim() }).unwrap();
      setNote('');
      onToast('Trip note added.');
    } catch (err) { onToast(getApiErrorMessage(err)); }
    finally { submitting.current = false; }
  }
  const notes = trip.notes;
  return (
    <SectionCard title="Notes" count={compact ? undefined : trip.notes?.length ?? '—'}>
      <form onSubmit={submit} className={styles.noteForm}>
        <TextField maxLength={2000} disabled={saving} placeholder="Add a note about this trip..." value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: 1 }} />
        <Button type="submit" disabled={saving || !note.trim()}>{saving ? 'Adding…' : 'Add Note'}</Button>
      </form>
      {notes === null ? <p className="tk-meta" style={{ marginTop: 12 }}>—</p> : notes.length === 0 ? <p className="tk-meta" style={{ marginTop: 12 }}>No notes yet.</p> : (compact ? notes.slice(0, 2) : notes).map((n, i) => (
        <div key={n.id ?? i} className={styles.noteRow}>
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
        {trip.timeline === null ? <span className="tk-meta">—</span> : trip.timeline.map((item, i) => {
          const [tone, label] = STATE_BADGE[item.state] || ['neutral', '—'];
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
  const fileInput = useRef(null);
  const pendingName = useRef(null);
  const uploading = useRef(false);
  const [uploadingName, setUploadingName] = useState(null);
  const [uploadDocument] = useUploadCompanyTripDocumentMutation();
  function upload(name = null) {
    if (uploadingName) return;
    pendingName.current = name;
    fileInput.current?.click();
  }
  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploading.current) return;
    uploading.current = true;
    const displayName = pendingName.current;
    pendingName.current = null;
    setUploadingName(displayName || 'document');
    try {
      await uploadDocument({ tripId: trip.id, file, name: displayName }).unwrap();
      onToast('Trip document uploaded.');
    } catch (err) { onToast(getApiErrorMessage(err)); }
    finally { uploading.current = false; setUploadingName(null); }
  }
  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <input ref={fileInput} hidden type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={handleFileChange} />
      <SectionCard title="Trip Documents" count={trip.documents?.length ?? '—'} action={<Button size="sm" icon="upload" disabled={!!uploadingName} onClick={() => upload()}>{uploadingName ? 'Uploading…' : 'Upload Document'}</Button>}>
        {trip.documents === null ? <span className="tk-meta">—</span> : trip.documents.length === 0 ? <EmptyState icon="file-text" title="No documents yet" description="Upload waybills, delivery notes and receipts for this trip." /> : (
          <div className={styles.docRows}>
            {trip.documents.map((doc, index) => (
              <div key={doc.id ?? `${doc.name}-${index}`}>
                <span className={styles.docIcon} data-kind={doc.status === 'Uploaded' ? doc.kind : 'pending'}><Icon name="file-text" size={18} /></span>
                <span className={styles.docMain}><strong>{doc.name}</strong><small>{doc.uploadedOn !== '—' ? `Uploaded • ${doc.uploadedOn}${doc.size ? ` · ${doc.size}` : ''}` : '—'}</small></span>
                <Badge tone={doc.status === 'Uploaded' ? 'success' : doc.status === '—' ? 'neutral' : 'warning'}>{doc.status}</Badge>
                {doc.url || doc.status === 'Uploaded' || doc.uploadable === false
                  ? <IconButton icon="download" tone="outline" size={32} label={`Download ${doc.name}`} disabled={!doc.url} onClick={() => downloadDocument(doc, onToast)} />
                  : <Button size="sm" variant="secondary" icon="upload" disabled={!!uploadingName} onClick={() => upload(doc.name)}>{uploadingName === doc.name ? 'Uploading…' : 'Upload'}</Button>}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      {(job.documents === null || job.documents.length > 0) && (
        <SectionCard title="Shared by Forwarder" description="Job-level documents that apply to every trip on this job.">
          <div className={styles.docRows}>
            {job.documents === null ? <span className="tk-meta">—</span> : job.documents.map((doc, index) => (
              <div key={doc.id ?? `${doc.name}-${index}`}>
                <span className={styles.docIcon}><Icon name="file-text" size={18} /></span>
                <span className={styles.docMain}><strong>{doc.name}</strong><small>{doc.size}</small></span>
                <IconButton icon="download" tone="outline" size={32} label={`Download ${doc.name}`} onClick={() => downloadDocument(doc, onToast)} />
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
  const [addCost, { isLoading: saving }] = useAddCompanyTripCostMutation();
  const submitting = useRef(false);
  const revenue = trip.revenue;
  const total = trip.costTotal;
  const margin = revenue !== null && total !== null ? revenue - total : null;
  async function submit(event) {
    event.preventDefault();
    const amount = Number(draft.amount);
    if (submitting.current || !Number.isFinite(amount) || amount <= 0) return;
    submitting.current = true;
    try {
      await addCost({ tripId: trip.id, category: draft.category, amount, description: draft.description }).unwrap();
      setDraft((current) => ({ ...current, amount: '', description: '' }));
      onToast('Trip cost added.');
    } catch (err) { onToast(getApiErrorMessage(err)); }
    finally { submitting.current = false; }
  }
  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <div className={styles.costStats}>
        <StatCard icon="banknote" tint="green" label="Trip Revenue" value={amountLabel(revenue)} caption="Agreed rate for this truck" />
        <StatCard icon="receipt" tint="amber" label="Total Costs" value={amountLabel(total)} caption={`${trip.costs?.length ?? '—'} entries`} />
        <StatCard icon="trending-up" tint={margin === null || margin >= 0 ? 'blue' : 'red'} label="Net Margin" value={amountLabel(margin)} caption={margin !== null && revenue > 0 ? `${Math.round((margin / revenue) * 100)}% of revenue` : '—'} />
      </div>
      <SectionCard title="Trip Costs" pad="none">
        {trip.costs === null ? <span className="tk-meta">—</span> : trip.costs.length === 0 ? <div style={{ padding: 24 }}><EmptyState icon="receipt" title="No costs logged" description="Log fuel, tolls, allowances and other trip expenses." /></div> : (
          <DataTable rows={trip.costs} rowKey={(c) => c.id} columns={[
            { key: 'category', header: 'Category', render: (c) => <strong style={{ color: 'var(--tk-ink-900)' }}>{c.category}</strong> },
            { key: 'description', header: 'Description', render: (c) => c.description || '—' },
            { key: 'date', header: 'Date', render: (c) => c.date },
            { key: 'amount', header: 'Amount', align: 'right', render: (c) => <strong style={{ color: 'var(--tk-ink-900)' }}>{amountLabel(c.amount)}</strong> },
          ]} />
        )}
        {isOpenTrip(trip) && (
          <form onSubmit={submit} className={styles.costForm}>
            <Select label="Category" disabled={saving} value={draft.category} options={TRIP_COST_CATEGORIES} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
            <TextField label="Amount (₦)" disabled={saving} type="number" min="0" required value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
            <TextField label="Description" disabled={saving} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="e.g. Diesel top-up at Lokoja" />
            <Button type="submit" icon="plus" disabled={saving || !Number.isFinite(Number(draft.amount)) || Number(draft.amount) <= 0}>{saving ? 'Adding…' : 'Add Cost'}</Button>
          </form>
        )}
      </SectionCard>
    </div>
  );
}

function CommunicationSection({ trip, onToast }) {
  const [body, setBody] = useState('');
  const [sendMessage, { isLoading: sending }] = useSendCompanyTripMessageMutation();
  const { currentData: messages, error: messageError, isFetching } = useGetCompanyTripMessagesQuery(trip.id, { refetchOnMountOrArgChange: true });
  const [sendError, setSendError] = useState('');
  const submitting = useRef(false);
  const driverName = trip.driverName === '—' ? 'the driver' : trip.driverName;
  async function submit(event) {
    event.preventDefault();
    if (submitting.current || !body.trim()) return;
    submitting.current = true;
    setSendError('');
    try {
      await sendMessage({ tripId: trip.id, content: body.trim() }).unwrap();
      setBody('');
      onToast('Message sent.');
    } catch (err) { setSendError(getApiErrorMessage(err)); }
    finally { submitting.current = false; }
  }
  return (
    <SectionCard title="Communication" description={`Private messages between your company and ${driverName} about ${trip.number}. Forwarders can’t see or join this conversation.`}>
      {isFetching && !messages ? <SkeletonRow variant="list" rows={3} /> : messageError ? <EmptyState icon="messages-square" title={getApiErrorMessage(messageError)} /> : messages === undefined ? <span className="tk-meta">—</span> : messages.length === 0 ? <EmptyState icon="messages-square" title="No messages yet" description="Start the conversation with your driver." /> : (
        <div>
          {messages.map((m, i) => (
            <MessageBubble key={m.id ?? i} author={m.author} role={m.role} roleTone={m.role === 'Driver' ? 'orange' : 'blue'} time={m.time}>
              {m.body}
            </MessageBubble>
          ))}
        </div>
      )}
      {isOpenTrip(trip) && (
        <form onSubmit={submit} className={styles.composer}>
          <Textarea rows={3} maxLength={500} disabled={sending} value={body} onChange={(e) => setBody(e.target.value)} placeholder={`Message ${driverName}...`} />
          <Button type="submit" icon="send" disabled={sending || trip.driverAssigned !== true || !body.trim()}>{sending ? 'Sending…' : 'Send'}</Button>
          {sendError && <p role="alert" style={{ gridColumn: '1 / -1', margin: 0, color: 'var(--tk-danger)', font: '500 13px/18px var(--tk-font-sans)' }}>{sendError}</p>}
        </form>
      )}
    </SectionCard>
  );
}

export function TripDetailFromQuery() {
  const params = useSearchParams();
  const ids = params.getAll('tripId');
  const tripId = ids.length === 1 ? ids[0].trim() : '';
  const requestedSection = params.get('section');
  const section = TRIP_SECTIONS.some((item) => item.value === requestedSection) ? requestedSection : 'overview';
  return <TripDetail key={tripId} tripId={tripId} section={section} />;
}

export function TripDetail({ section = 'overview', tripId: explicitTripId }) {
  const params = useParams();
  const tripId = explicitTripId ?? params.tripId;
  const navigate = useNavigate();
  const { currentData: trip, error, isFetching } = useGetCompanyTripQuery(tripId, { skip: !tripId, refetchOnMountOrArgChange: true });
  const [updateStatus, { isLoading: updatingStatus }] = useUpdateCompanyTripStatusMutation();
  const [contactSupport] = useContactCompanyTripSupportMutation();
  const [requestCancellation] = useRequestCompanyTripCancellationMutation();
  const statusSubmitting = useRef(false);
  const job = trip?.job;
  const truck = trip?.truck;
  const [statusMenu, setStatusMenu] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [toast, showToast] = useToast();

  if (isFetching && !trip) return (
    <div className={styles.page}>
      <PageHeader title="—" crumbs={[{ label: 'My Trips', onClick: () => navigate('/trips') }, tripId]} />
      <SkeletonRow variant="detail" />
    </div>
  );
  if (error || !trip || !job) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title="Trip not found" crumbs={[{ label: 'My Trips', onClick: () => navigate('/trips') }, tripId]} />
        <EmptyState icon="route" title={error ? getApiErrorMessage(error) : 'This trip could not be found'} action={<Button variant="outline" onClick={() => navigate('/trips')}>Back to My Trips</Button>} />
      </div>
    );
  }

  const sectionHref = (value) => tripDetailHref(trip.id, value);
  const health = tripHealth(trip);
  const open = isOpenTrip(trip);
  const next = nextTripStage(trip);
  const liveProgress = tripPhase(trip) === 'Active' ? trip.progress : undefined;
  const scrollToMap = () => document.getElementById('trip-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  async function setStatus(status) {
    if (statusSubmitting.current || updatingStatus) return;
    setStatusMenu(false);
    statusSubmitting.current = true;
    try {
      const result = await updateStatus({ tripId: trip.id, status }).unwrap();
      showToast(`${trip.number} marked ${result.status}.`);
    } catch (err) { showToast(getApiErrorMessage(err)); }
    finally { statusSubmitting.current = false; }
  }

  const map = (
    <div id="trip-map">
      <RouteMap
        title={section === 'overview' ? 'Route & Live Location' : 'Live Location'}
        origin={job.origin} destination={job.destination} distanceKm={job.distanceKm}
        progress={liveProgress} lastUpdated={trip.lastUpdated}
        routeCoordinates={job.routeCoordinates} markerCoordinates={trip.liveCoordinates} duration={null} showUnavailableDistance
        truckLabel={trip.liveCoordinates ? `${trip.truckPlate}${trip.speedKmh !== null ? ` · ${trip.speedKmh} km/h` : ''}` : undefined}
        height={section === 'overview' ? 250 : 220}
      />
    </div>
  );
  const quickActions = [
    open && { label: 'Update Location', icon: 'map-pin', onClick: () => setLocationOpen(true) },
    { label: 'Report Issue', icon: 'triangle-alert', onClick: () => setReportOpen(true) },
    section === 'timeline' && { label: 'Add Note', icon: 'file-plus', onClick: () => navigate(sectionHref('notes')) },
    { label: 'Contact Support', icon: 'headset', onClick: () => setSupportOpen(true), wide: section !== 'timeline' },
  ].filter(Boolean);

  const rail = (
    <aside className={styles.rail}>
      {section === 'timeline' && map}
      <DriverCard trip={trip} />
      <TruckCard trip={trip} truck={truck} onToast={showToast} />
      {section === 'overview' && (
        <SectionCard title="Trip Documents" action={<button type="button" className={styles.link} onClick={() => navigate(sectionHref('documents'))}>View All ({trip.documents?.length ?? '—'})</button>}>
          {trip.documents === null ? <span className="tk-meta">—</span> : trip.documents.length === 0 ? <span className="tk-meta">No documents yet.</span> : (
            <div className={styles.docMini}>
              {trip.documents.slice(0, 5).map((doc, index) => (
                <div key={doc.id ?? `${doc.name}-${index}`}>
                  <span className={styles.docIcon} data-kind={doc.status === 'Uploaded' ? doc.kind : 'pending'}><Icon name="file-text" size={16} /></span>
                  <span className={styles.docMain}><strong>{doc.name}</strong><small>{doc.uploadedOn !== '—' ? `Uploaded • ${doc.uploadedOn}` : '—'}</small></span>
                  <IconButton icon="download" tone="outline" size={28} label={`Download ${doc.name}`} disabled={!doc.url} onClick={() => downloadDocument(doc, showToast)} />
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
        crumbs={[{ label: 'My Trips', onClick: () => navigate('/trips') }, trip.number]}
        title={trip.number}
        meta={<Badge tone={tripHealthTone(health)} dot>{health}</Badge>}
        description={
          <>
            <span className={styles.subtitle}>
              {jobTitle(job)} <span aria-hidden="true">•</span> {job.cargoType}
              <button type="button" className={styles.jobChip} onClick={() => navigate(jobDetailHref(job.id))}>
                {job.number}{job.trucksRequired > 1 ? ` · ${job.trucksRequired} trucks` : ''}
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
                      { label: 'Cancel Trip', icon: 'ban', tone: 'danger', onClick: () => {
                        setStatusMenu(false);
                        if (trip.cancellationRequested) showToast('A cancellation request has already been sent to support.');
                        else setCancelOpen(true);
                      } },
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
        onChange={(value) => navigate(sectionHref(value))}
        items={TRIP_SECTIONS.map((s) => ({
          ...s,
          count: s.value === 'documents' ? trip.documents?.length ?? '—' : s.value === 'notes' ? trip.notes?.length ?? '—' : undefined,
        }))}
      />

      <div className={styles.layout}>
        <div className={styles.main}>
          <InfoStrip trip={trip} job={job} />

          {section === 'overview' && (
            <>
              <div className={styles.twoUp}>
                {map}
                <SectionCard title="Trip Progress" action={<button type="button" className={styles.link} onClick={() => navigate(sectionHref('timeline'))}>View Timeline</button>}>
                  <div style={{ display: 'grid', gap: 18 }}>
                    <TripStepper trip={trip} />
                    <div className={styles.currentBox}>
                      <span className={styles.currentIcon}><Icon name={trip.status === 'Cancelled' ? 'ban' : trip.status === 'Completed' ? 'circle-check' : 'truck'} size={22} /></span>
                      <span>
                        <strong>{trip.status}</strong>
                        <small>{trip.timeline?.find((t) => t.state === 'active')?.detail ?? '—'}</small>
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
                    <div><dt>Weight</dt><dd>{weightLabel(job.weightKg)}</dd></div>
                    <div><dt>Quantity</dt><dd>{job.quantity}</dd></div>
                    <div><dt>Cargo Value</dt><dd>{amountLabel(job.cargoValue)}</dd></div>
                    <div><dt>Special Instructions</dt><dd>{job.specialInstructions || '—'}</dd></div>
                  </dl>
                </SectionCard>
                <SectionCard title="Locations">
                  <ol className={styles.locations}>
                    <li className={trip.pickupComplete === true ? styles.done : styles.pending}>
                      <span className={styles.locDot} />
                      <span><strong>Pickup Location</strong><small>{job.origin}</small></span>
                      <span className={styles.locWhen}><small>{trip.pickupDate}</small><small>{trip.pickupTime}</small></span>
                      <Badge tone={trip.pickupComplete === true ? 'success' : 'neutral'} dot>{trip.pickupComplete === null ? '—' : trip.pickupComplete ? 'Completed' : 'Pending'}</Badge>
                    </li>
                    {open && trip.status !== 'Assigned' && (
                      <li className={styles.active}>
                        <span className={styles.locDot} />
                        <span><strong>Current Location</strong><small>{trip.currentLocation}</small></span>
                        <span className={styles.locWhen}><small>{trip.locationNoteUpdated}</small></span>
                        <Badge tone="info" dot>{trip.status}</Badge>
                      </li>
                    )}
                    <li className={trip.status === 'Completed' ? styles.done : styles.pending}>
                      <span className={styles.locDot} />
                      <span><strong>Destination</strong><small>{job.destination}</small></span>
                      <span className={styles.locWhen}><small>{trip.deliveryDate}</small><small>{trip.status === 'Completed' ? '' : '(Estimated)'}</small></span>
                      <Badge tone={trip.delivered === true ? 'success' : 'neutral'} dot>{trip.delivered === null ? '—' : trip.delivered ? 'Delivered' : 'Pending'}</Badge>
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
          {section === 'communication' && <CommunicationSection trip={trip} onToast={showToast} />}

          {section !== 'overview' && section !== 'timeline' && (
            <Card className={styles.jobContext}>
              <Icon name="briefcase" size={18} color="var(--tk-blue)" />
              <span>
                Part of job <button type="button" className={styles.link} onClick={() => navigate(jobDetailHref(job.id))}>{job.number}</button>
                {job.trucksRequired > 1 ? ` · one of ${job.trucksRequired} trucks booked for this job.` : '.'}
              </span>
              <LabelValue layout="stack" label="Rate for this trip" value={amountLabel(trip.revenue)} style={{ marginLeft: 'auto' }} />
            </Card>
          )}
        </div>
        {rail}
      </div>

      <ReportIssueModal trip={trip} open={reportOpen} onClose={() => setReportOpen(false)} onDone={(msg) => { setReportOpen(false); showToast(msg); }} />
      <UpdateLocationModal trip={trip} open={locationOpen} onClose={() => setLocationOpen(false)} onDone={(msg) => { setLocationOpen(false); showToast(msg); }} />
      <MessageModal
        open={supportOpen || cancelOpen} onClose={() => { setSupportOpen(false); setCancelOpen(false); }}
        title={cancelOpen ? 'Request Trip Cancellation' : 'Contact Support'} recipient="Trukkas Support"
        placeholder={cancelOpen ? 'Explain why this trip needs to be cancelled...' : `Tell us what you need help with on ${trip.number}...`}
        textareaLabel={cancelOpen ? 'Reason for cancellation' : 'Message'}
        submitLabel={cancelOpen ? 'Request Cancellation' : 'Send Message'} submitIcon={cancelOpen ? 'ban' : 'send'}
        maxLength={cancelOpen ? null : 500}
        onSend={async (message) => {
          if (cancelOpen) {
            const result = await requestCancellation({ tripId: trip.id, reason: message }).unwrap();
            setCancelOpen(false);
            showToast(result.message);
          } else {
            await contactSupport({ tripId: trip.id, message }).unwrap();
            setSupportOpen(false);
            showToast('Support request sent. We will reply shortly.');
          }
        }}
      />
      <Toast message={toast} />
    </div>
  );
}

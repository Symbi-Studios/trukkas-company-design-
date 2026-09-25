'use client';

import { useState } from 'react';
import { useNavigate, useParams } from '../router.js';
import {
  Badge, Button, Card, EntityHeaderCard, Icon, LabelValue, Modal, PageHeader,
  ProgressBar, Tabs, TextField, Timeline, Textarea,
} from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { placeBid, withdrawBid, updateTripStatus, addTripNote, cancelJob } from '../mock/api.js';
import { jobStatusTone, tripStatusTone, TRIP_STAGES, nextStepFor } from '../domain/jobs.js';
import { posters } from '../mock/fixtures/companies.js';
import { formatNaira } from '../mock/format.js';

function posterName(id) {
  return posters.find((p) => p.id === id)?.name || '—';
}

function BidPanel({ job }) {
  const [amount, setAmount] = useState(String(job.myBid?.amount ?? job.budget));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (job.status === 'Quoted') {
    return (
      <Card style={{ display: 'grid', gap: 12 }}>
        <h3 className="tk-title" style={{ margin: 0 }}>Your Bid</h3>
        <span style={{ font: '700 24px/1 var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{formatNaira(job.myBid.amount)}</span>
        <span className="tk-meta">Submitted {job.myBid.submittedAt} · Awaiting forwarder response</span>
        {job.myBid.message && <p style={{ margin: 0, font: '400 13px/20px var(--tk-font-sans)', color: 'var(--tk-ink-500)' }}>“{job.myBid.message}”</p>}
        <Button variant="danger" onClick={() => withdrawBid(job.id)}>Withdraw Bid</Button>
      </Card>
    );
  }
  if (job.status !== 'Pending') return null;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    await placeBid(job.id, Number(amount), message);
    setBusy(false);
  }
  return (
    <Card style={{ display: 'grid', gap: 14 }}>
      <h3 className="tk-title" style={{ margin: 0 }}>Place a Bid</h3>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <TextField label="Bid Amount (₦)" type="number" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)}
          hint={`Suggested range: ${formatNaira(job.budget * 0.9)} – ${formatNaira(job.budget * 1.1)}`} />
        <Textarea label="Message (optional)" rows={4} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="Introduce your company and why you're the best fit for this job..." />
        <Button type="submit" fullWidth disabled={busy}>{busy ? 'Submitting…' : 'Place Bid'}</Button>
        {job.closesAt && <span className="tk-meta" style={{ textAlign: 'center' }}>{job.closesAt}</span>}
      </form>
    </Card>
  );
}

function TripPanel({ job }) {
  const [tab, setTab] = useState('overview');
  const [note, setNote] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const trip = job.trip;
  const stageIndex = TRIP_STAGES.indexOf(trip.status);

  async function advance() {
    const next = TRIP_STAGES[Math.min(stageIndex + 1, TRIP_STAGES.length - 1)];
    await updateTripStatus(job.id, next);
  }
  async function submitNote(event) {
    event.preventDefault();
    if (!note.trim()) return;
    await addTripNote(job.id, note.trim());
    setNote('');
  }

  return (
    <Card pad="none" style={{ display: 'grid' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px var(--tk-card-pad) 0' }}>
        <h3 className="tk-title" style={{ margin: 0 }}>{trip.id}</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {job.status === 'In Progress' && trip.status !== 'Completed' && (
            <Button onClick={advance}>Mark as {TRIP_STAGES[Math.min(stageIndex + 1, TRIP_STAGES.length - 1)]}</Button>
          )}
          {job.status === 'In Progress' && <Button variant="danger" onClick={() => setCancelOpen(true)}>Cancel Trip</Button>}
        </div>
      </div>
      <div style={{ padding: '10px var(--tk-card-pad) 0' }}>
        <Tabs value={tab} onChange={setTab} items={[
          { value: 'overview', label: 'Overview' },
          { value: 'timeline', label: 'Timeline' },
          { value: 'documents', label: 'Documents', count: trip.documents.length },
          { value: 'notes', label: 'Notes', count: trip.notes.length },
        ]} />
      </div>
      <div style={{ padding: 'var(--tk-card-pad)' }}>
        {tab === 'overview' && (
          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <ProgressBar value={trip.progress} label="Trip Progress" caption={`${trip.progress}%`} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                {TRIP_STAGES.map((stage, i) => (
                  <span key={stage} style={{ font: '500 11px/16px var(--tk-font-sans)', color: i <= stageIndex ? 'var(--tk-blue)' : 'var(--tk-ink-300)', textAlign: 'center', flex: 1 }}>{stage}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16 }}>
              <LabelValue label="Driver" value={trip.driverName || '—'} />
              <LabelValue label="Truck" value={trip.truckPlate || '—'} />
              <LabelValue label="Current Location" value={trip.currentLocation || '—'} />
            </div>
            <span className="tk-meta">Last updated: {trip.lastUpdated}</span>
          </div>
        )}
        {tab === 'timeline' && (
          <Timeline items={trip.timeline.map((item) => ({
            title: item.title, time: item.time, description: item.detail,
            state: item.state === 'active' ? 'current' : item.state === 'cancelled' ? 'danger' : item.state,
            icon: item.state === 'done' ? 'check' : undefined,
          }))} />
        )}
        {tab === 'documents' && (
          trip.documents.length ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {trip.documents.map((doc) => (
                <div key={doc.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--tk-line)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon name="file-text" size={16} color="var(--tk-ink-400)" />
                    <span>{doc.name}{doc.uploadedOn && <span className="tk-meta"> · Uploaded {doc.uploadedOn}</span>}</span>
                  </span>
                  <Badge tone={doc.status === 'Uploaded' ? 'success' : 'warning'}>{doc.status}</Badge>
                </div>
              ))}
            </div>
          ) : <span className="tk-meta">No documents uploaded for this trip yet.</span>
        )}
        {tab === 'notes' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <form onSubmit={submitNote} style={{ display: 'flex', gap: 8 }}>
              <TextField style={{ flex: 1 }} placeholder="Add a note about this trip..." value={note} onChange={(e) => setNote(e.target.value)} />
              <Button type="submit">Add Note</Button>
            </form>
            {trip.notes.length === 0 ? <span className="tk-meta">No notes yet.</span> : trip.notes.slice().reverse().map((n, i) => (
              <div key={i} style={{ padding: '10px 0', borderTop: '1px solid var(--tk-line)' }}>
                <span style={{ font: '600 13px/18px var(--tk-font-sans)' }}>{n.author}</span>
                <span className="tk-meta"> · {n.time}</span>
                <p style={{ margin: '4px 0 0', font: '400 13px/20px var(--tk-font-sans)', color: 'var(--tk-ink-500)' }}>{n.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel Trip"
        description="This will stop the trip and free up the assigned truck and driver."
        footer={<><Button variant="outline" onClick={() => setCancelOpen(false)}>Never mind</Button>
          <Button variant="danger" onClick={async () => { await cancelJob(job.id, 'Cancelled by fleet manager.'); setCancelOpen(false); }}>Cancel Trip</Button></>}>
        <p style={{ margin: 0 }}>Are you sure you want to cancel {trip.id}?</p>
      </Modal>
    </Card>
  );
}

export function JobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const jobs = useCollection('jobs') || [];
  const job = jobs.find((j) => j.id === jobId);

  if (!job) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title="Job not found" />
        <Button variant="outline" onClick={() => navigate('/jobs-trips')}>Back to Jobs & Trips</Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader
        crumbs={[{ label: 'Jobs & Trips', onClick: () => navigate('/jobs-trips') }, job.id]}
        title={job.cargoType}
        description={`${job.origin} → ${job.destination}`}
        meta={<Badge tone={jobStatusTone(job.status)} dot>{job.status}</Badge>}
      />
      <EntityHeaderCard
        name={job.id}
        initials="JB"
        subtitle={`Posted by ${posterName(job.postedBy)} · ${job.postedOn}`}
        badges={<Badge tone="info">{job.jobType}</Badge>}
        facts={[
          { label: 'Budget', value: formatNaira(job.budget) },
          { label: 'Weight', value: `${job.weightKg.toLocaleString()} kg` },
          { label: 'Equipment', value: job.equipment },
          { label: 'Pickup', value: job.pickupDate },
          { label: 'Delivery', value: job.deliveryDate },
          { label: 'Distance', value: `${job.distanceKm.toLocaleString()} km` },
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: job.trip ? '1fr' : 'minmax(0,1fr) 340px', gap: 'var(--tk-grid-gap)', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
          <Card style={{ display: 'grid', gap: 14 }}>
            <h3 className="tk-title" style={{ margin: 0 }}>Cargo Description</h3>
            <p style={{ margin: 0, font: '400 14px/22px var(--tk-font-sans)', color: 'var(--tk-ink-500)' }}>{job.cargoDescription}</p>
            {job.specialInstructions && (
              <div style={{ display: 'flex', gap: 8, padding: 12, borderRadius: 'var(--tk-r-md)', background: 'var(--tk-warning-soft)' }}>
                <Icon name="info" size={16} color="var(--tk-warning)" />
                <span style={{ font: '400 13px/19px var(--tk-font-sans)', color: 'var(--tk-ink-700)' }}>{job.specialInstructions}</span>
              </div>
            )}
          </Card>
          <Card style={{ display: 'grid', gap: 10 }}>
            <h3 className="tk-title" style={{ margin: 0 }}>Requirements</h3>
            {job.requirements.map((req) => (
              <span key={req} style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 13px/20px var(--tk-font-sans)', color: 'var(--tk-ink-700)' }}>
                <Icon name="circle-check" size={16} color="var(--tk-success)" /> {req}
              </span>
            ))}
          </Card>
          {job.trip && <TripPanel job={job} />}
          {!job.trip && job.status === 'Cancelled' && (
            <Card style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Icon name="ban" size={16} color="var(--tk-danger)" />
              <span className="tk-meta">This job was cancelled — {nextStepFor(job)}.</span>
            </Card>
          )}
        </div>
        {!job.trip && <BidPanel job={job} />}
      </div>
    </div>
  );
}

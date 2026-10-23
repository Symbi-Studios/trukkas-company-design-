'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from '../router.js';
import { Button, Card, Icon, PageHeader, Select } from '../ds.js';
import { useCreateSupportTicketMutation } from '../store/features/support/supportApi.js';
import { useGetFleetQuery } from '../store/features/fleet/fleetApi.js';
import { useGetCompanyDriversQuery } from '../store/features/drivers/driversApi.js';
import { useGetCompanyTripsQuery } from '../store/features/trips/tripsApi.js';
import { useGetMyJobsQuery } from '../store/features/jobs/jobsApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { formatBytes, toUploads } from '../components/FileDrop.jsx';
import { flashSupport } from './Support.jsx';
import { SUPPORT_TOPICS, topicByValue } from '../domain/support.js';
import styles from './SubmitTicket.module.css';

const CATEGORIES = [...SUPPORT_TOPICS.map(({ value, label }) => ({ value, label })), { value: 'Other', label: 'Other' }];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'].map((p) => ({ value: p, label: p }));

const SUPPORT_PHONE = '0903 123 4567';
const MAX_CHARS = 1000;
const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf';
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);

const EMPTY = { category: '', priority: '', subject: '', description: '', related: '', truckPlate: '', driverId: '' };

function FieldLabel({ children, required, optional, htmlFor }) {
  return (
    <label id={htmlFor ? `${htmlFor}-label` : undefined} htmlFor={htmlFor} className={styles.label}>
      {children}
      {required && <span className={styles.required}> *</span>}
      {optional && <span className={styles.optional}> (Optional)</span>}
    </label>
  );
}

function IconSelect({ id, icon, iconColor, value, onChange, placeholder, options, error }) {
  return (
    <div className={`${styles.selectControl} ${!value ? styles.selectPlaceholder : ''} ${error ? styles.invalid : ''}`}>
      <Icon name={icon} size={18} color={iconColor || 'var(--tk-ink-700)'} className={styles.selectIcon} aria-hidden="true" />
      <Select id={id} value={value} onChange={onChange} placeholder={placeholder}
        options={[{ value: '', label: placeholder }, ...options]}
        aria-labelledby={`${id}-label`} aria-invalid={!!error} />
    </div>
  );
}

export function SubmitTicket() {
  const navigate = useNavigate();
  // Optional pickers: if any list fails to load, its dropdown is just empty.
  const { data: trucks = [] } = useGetFleetQuery();
  const { currentData: drivers = [] } = useGetCompanyDriversQuery();
  const { currentData: trips = [] } = useGetCompanyTripsQuery();
  const { data: jobs = [] } = useGetMyJobsQuery();
  const [createTicket] = useCreateSupportTicketMutation();
  const running = useRef(false);
  const [draft, setDraft] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [fileError, setFileError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const fileInput = useRef(null);

  const relatedOptions = useMemo(() => {
    const place = (value) => (value && value !== '—' ? value.split(',')[0] : null);
    const route = (job) => (job && place(job.origin) && place(job.destination) ? ` · ${place(job.origin)} → ${place(job.destination)}` : '');
    const ref = (item) => (item.number && item.number !== '—' ? item.number : item.id);
    const jobOptions = jobs.filter((j) => j.status !== 'Quoted').map((j) => ({ value: `job:${j.id}`, label: `Job ${ref(j)}${route(j)}` }));
    const tripOptions = trips.map((t) => ({ value: `trip:${t.id}`, label: `Trip ${ref(t)}${route(t.job)}` }));
    return [...jobOptions, ...tripOptions];
  }, [trips, jobs]);
  const truckOptions = trucks.filter((t) => t.plate !== '—').map((t) => ({ value: t.plate, label: t.makeModel && t.makeModel !== '—' ? `${t.plate} · ${t.makeModel}` : t.plate }));
  const driverOptions = drivers.map((d) => ({ value: d.id, label: d.name }));

  const set = (key) => (e) => {
    const value = e.target.value;
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  // Picking a trip pre-fills its truck and driver so the agent has the full context.
  function setRelated(e) {
    const value = e.target.value;
    const trip = value.startsWith('trip:') && trips.find((t) => t.id === value.slice(5));
    setDraft((d) => ({
      ...d,
      related: value,
      truckPlate: (trip?.truckPlate !== '—' && trip?.truckPlate) || d.truckPlate,
      driverId: trip?.driverId || d.driverId,
    }));
  }

  // Guides link here with ?category=<topic value> to pre-select the issue category.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('category');
    if (topicByValue(requested)) setDraft((d) => ({ ...d, category: requested }));
  }, []);

  function addFiles(list) {
    if (running.current) return;
    const incoming = Array.from(list || []);
    const problems = [];
    const wrongType = incoming.filter((f) => !ALLOWED_TYPES.has(f.type));
    const tooBig = incoming.filter((f) => ALLOWED_TYPES.has(f.type) && f.size > MAX_BYTES);
    if (wrongType.length) problems.push(`${wrongType.map((f) => f.name).join(', ')} is not a JPG, PNG or PDF.`);
    if (tooBig.length) problems.push(`${tooBig.map((f) => f.name).join(', ')} exceeds ${formatBytes(MAX_BYTES)}.`);
    const accepted = incoming.filter((f) => ALLOWED_TYPES.has(f.type) && f.size <= MAX_BYTES);
    const room = MAX_FILES - files.length;
    if (accepted.length > room) problems.push(`You can upload up to ${MAX_FILES} files.`);
    setFileError(problems.join(' '));
    if (room > 0 && accepted.length) setFiles((current) => [...current, ...toUploads(accepted.slice(0, room))]);
  }

  function validate() {
    const next = {};
    if (!draft.category) next.category = 'Select an issue category.';
    if (!draft.priority) next.priority = 'Select a priority.';
    if (!draft.subject.trim()) next.subject = 'Enter a subject.';
    if (!draft.description.trim()) next.description = 'Describe the issue.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    if (running.current) return;
    setSubmitError('');
    if (!validate()) return;
    running.current = true;
    setBusy(true);
    try {
      const ticket = await createTicket({
        subject: draft.subject,
        category: draft.category,
        body: draft.description,
        priority: draft.priority,
        relatedType: draft.related.startsWith('trip:') ? 'TRIP' : draft.related.startsWith('job:') ? 'JOB' : undefined,
        relatedId: draft.related.startsWith('trip:') ? trips.find((trip) => trip.id === draft.related.slice(5))?.jobId : draft.related.startsWith('job:') ? draft.related.slice(4) : undefined,
        truckId: trucks.find((truck) => truck.plate === draft.truckPlate)?.id,
        driverId: draft.driverId || undefined,
        files,
      }).unwrap();
      files.forEach((f) => URL.revokeObjectURL(f.url));
      flashSupport(`Ticket ${ticket.id} submitted. Our support team will get back to you shortly.`);
      navigate('/support');
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        crumbs={[
          { label: 'Dashboard', onClick: () => navigate('/') },
          { label: 'Support', onClick: () => navigate('/support') },
          'Submit Ticket',
        ]}
        title="Submit Support Ticket"
        description="Let us know how we can help. Fill in the details below and our support team will assist you."
      />

      <div className={styles.layout}>
        <Card className={styles.formCard}>
          <form onSubmit={submit} noValidate className={styles.form}>
            <h2 className={styles.sectionTitle}>Ticket Information</h2>
            <div className={styles.row2}>
              <div className={styles.field}>
                <FieldLabel htmlFor="ticket-category" required>Issue Category</FieldLabel>
                <IconSelect id="ticket-category" icon="building-2" value={draft.category} onChange={set('category')}
                  placeholder="Select a category" options={CATEGORIES} error={errors.category} />
                {errors.category && <span className={styles.error}>{errors.category}</span>}
              </div>
              <div className={styles.field}>
                <FieldLabel htmlFor="ticket-priority" required>Priority</FieldLabel>
                <IconSelect id="ticket-priority" icon="flag" iconColor="var(--tk-danger)" value={draft.priority} onChange={set('priority')}
                  placeholder="Select priority" options={PRIORITIES} error={errors.priority} />
                {errors.priority && <span className={styles.error}>{errors.priority}</span>}
              </div>
            </div>

            <div className={styles.field}>
              <FieldLabel htmlFor="ticket-subject" required>Subject</FieldLabel>
              <div className={`${styles.control} ${errors.subject ? styles.invalid : ''}`}>
                <input id="ticket-subject" value={draft.subject} onChange={set('subject')} maxLength={120}
                  placeholder="Enter a short and clear subject for your issue" aria-invalid={!!errors.subject} />
              </div>
              {errors.subject && <span className={styles.error}>{errors.subject}</span>}
            </div>

            <div className={styles.field}>
              <FieldLabel htmlFor="ticket-description" required>Description</FieldLabel>
              <div className={`${styles.control} ${styles.area} ${errors.description ? styles.invalid : ''}`}>
                <textarea id="ticket-description" rows={4} value={draft.description} onChange={set('description')} maxLength={MAX_CHARS}
                  placeholder="Provide a detailed description of the issue, including what you were doing, what went wrong, and any error messages."
                  aria-invalid={!!errors.description} />
              </div>
              <div className={styles.fieldFoot}>
                {errors.description ? <span className={styles.error}>{errors.description}</span> : <span />}
                <span className={styles.counter}>{draft.description.length}/{MAX_CHARS} characters</span>
              </div>
            </div>

            <h2 className={`${styles.sectionTitle} ${styles.spaced}`}>Related Information</h2>
            <div className={styles.row3}>
              <div className={styles.field}>
                <FieldLabel htmlFor="ticket-related">Related To</FieldLabel>
                <IconSelect id="ticket-related" icon="truck" iconColor="var(--tk-blue)" value={draft.related} onChange={setRelated}
                  placeholder="Select (Optional)" options={relatedOptions} />
              </div>
              <div className={styles.field}>
                <FieldLabel htmlFor="ticket-truck" optional>Truck</FieldLabel>
                <IconSelect id="ticket-truck" icon="truck" value={draft.truckPlate} onChange={set('truckPlate')}
                  placeholder="Select a truck" options={truckOptions} />
              </div>
              <div className={styles.field}>
                <FieldLabel htmlFor="ticket-driver" optional>Driver</FieldLabel>
                <IconSelect id="ticket-driver" icon="user-round" iconColor="var(--tk-blue)" value={draft.driverId} onChange={set('driverId')}
                  placeholder="Select a driver" options={driverOptions} />
              </div>
            </div>

            <div className={`${styles.field} ${styles.spaced}`}>
              <h2 className={styles.sectionTitleSm}>Attachments <span className={styles.optional}>(Optional)</span></h2>
              <p className={styles.help}>You can upload screenshots, documents or other files to help us understand the issue.</p>
              {files.length < MAX_FILES && (
                <div
                  role="button" tabIndex={0}
                  className={`${styles.drop} ${over ? styles.dropOver : ''}`}
                  onClick={() => fileInput.current?.click()}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.current?.click(); } }}
                  onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                  onDragLeave={() => setOver(false)}
                  onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}
                >
                  <Icon name="cloud-upload" size={28} color="var(--tk-blue)" />
                  <span>Drag and drop files here, or <strong>click to upload</strong></span>
                </div>
              )}
              <input ref={fileInput} type="file" hidden multiple accept={ACCEPT}
                onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
              {files.length > 0 && (
                <ul className={styles.files}>
                  {files.map((f, i) => (
                    <li key={f.url}>
                      {f.type.startsWith('image/')
                        ? <img src={f.url} alt="" className={styles.thumb} />
                        : <span className={styles.fileIcon}><Icon name="file-text" size={16} /></span>}
                      <span className={styles.fileMain}><strong>{f.name}</strong><small>{f.size}</small></span>
                      <button type="button" className={styles.remove} aria-label={`Remove ${f.name}`}
                        onClick={() => setFiles((list) => list.filter((_, j) => j !== i))}>
                        <Icon name="x" size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {fileError && <span className={styles.error}>{fileError}</span>}
              <p className={styles.formats}>
                <span>Supported formats: JPG, PNG, PDF</span>
                <span className={styles.sep}>|</span>
                <span>Max file size: 10MB per file</span>
                <span className={styles.sep}>|</span>
                <span>You can upload up to {MAX_FILES} files</span>
              </p>
            </div>

            {submitError && <span className={styles.error} role="alert">{submitError}</span>}
            <div className={styles.actions}>
              <Button variant="outline" onClick={() => navigate('/support')} style={{ minWidth: 108 }}>Cancel</Button>
              <Button type="submit" disabled={busy} style={{ minWidth: 140 }}>{busy ? 'Submitting…' : 'Submit Ticket'}</Button>
            </div>
          </form>
        </Card>

        <aside className={styles.aside}>
          <Card>
            <h2 className={styles.asideTitle}>Common Support Topics</h2>
            <p className={styles.asideSub}>Get quick help with common issues.</p>
            <div className={styles.topics}>
              {SUPPORT_TOPICS.map((topic) => (
                <Link key={topic.slug} to={`/support/guides?topic=${topic.slug}`} className={styles.topic}>
                  <Icon name={topic.icon} size={18} color="var(--tk-blue)" />
                  <span>{topic.label}</span>
                  <Icon name="chevron-right" size={16} color="var(--tk-blue)" />
                </Link>
              ))}
            </div>
          </Card>

          <div className={styles.hours}>
            <Icon name="clock" size={24} color="var(--tk-blue)" />
            <div>
              <h3>Support Hours</h3>
              <p>Our support team is available to help you<br />Monday - Friday, 8:00 AM - 8:00 PM (WAT)</p>
              <p>You will receive a response via email and in your dashboard notifications.</p>
            </div>
          </div>

          <Card className={styles.urgent}>
            <span className={styles.urgentIcon}><Icon name="headset" size={26} color="var(--tk-blue)" /></span>
            <div className={styles.urgentBody}>
              <h3>Need Immediate Help?</h3>
              <p>For urgent issues, you can contact our support team directly.</p>
              <a className={styles.call} href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`}>
                <span><Icon name="phone" size={16} color="var(--tk-blue)" /> Contact Support</span>
                <small>{SUPPORT_PHONE}</small>
              </a>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

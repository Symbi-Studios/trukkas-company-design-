import { useEffect, useState } from 'react';
import { Badge, Button, Icon, Modal, ProgressBar, SectionCard, Select, Tag, TextField } from '../ds.js';
import { createDocument } from '../mock/api.js';
import { complianceFor, documentStatusTone, maskNumber } from '../domain/documents.js';
import { FileDrop } from './FileDrop.jsx';
import styles from './DocumentCompliance.module.css';

const STATUS_ICON = {
  success: ['circle-check', 'var(--tk-success)'],
  warning: ['clock-alert', 'var(--tk-warning)'],
  danger: ['circle-x', 'var(--tk-danger)'],
  info: ['hourglass', 'var(--tk-blue)'],
  neutral: ['circle-dashed', 'var(--tk-ink-300)'],
};

/** Requirement-by-requirement checklist for one owner (company, vehicle or driver). */
export function ComplianceChecklist({ title, description, requirements, docs, onUpload, onOpen, action, style }) {
  const { rows, summary } = complianceFor(requirements, docs);
  const pct = summary.requiredTotal ? Math.round((summary.requiredMet / summary.requiredTotal) * 100) : 100;
  return (
    <SectionCard
      title={title} description={description} style={style}
      action={action || <Badge tone={summary.complete ? 'success' : 'warning'} dot>{summary.complete ? 'Compliant' : 'Action needed'}</Badge>}
    >
      <ProgressBar
        value={pct} height={8} label="Required documents" caption={`${summary.requiredMet} of ${summary.requiredTotal}`}
        color={summary.complete ? 'var(--tk-success)' : 'var(--tk-warning)'}
      />
      <ul className={styles.rows}>
        {rows.map(({ req, doc, status }) => {
          const tone = documentStatusTone(status);
          const [icon, color] = STATUS_ICON[tone] || STATUS_ICON.neutral;
          return (
            <li key={req.type}>
              <Icon name={icon} size={18} color={color} />
              <span className={styles.main}>
                <span className={styles.titleRow}>
                  <strong>{req.label}</strong>
                  <Tag tone={req.required ? 'blue' : 'neutral'}>{req.required ? 'Required' : 'Optional'}</Tag>
                </span>
                <small>
                  {doc
                    ? [doc.number && `${req.number || 'No.'}: ${doc.number}`, req.file !== false && doc.name, doc.expiryDate && doc.expiryDate !== '—' && `Expires ${doc.expiryDate}`, `Uploaded ${doc.uploadedOn}`].filter(Boolean).join(' · ')
                    : req.hint || 'Not uploaded yet.'}
                </small>
              </span>
              <Badge tone={tone}>{status}</Badge>
              <span className={styles.actions}>
                {doc && onOpen && <Button size="sm" variant="outline" icon="eye" onClick={() => onOpen(doc)}>View</Button>}
                {onUpload && (
                  <Button size="sm" variant={doc ? 'outline' : 'secondary'} icon={doc ? 'refresh-cw' : 'upload'} onClick={() => onUpload(req)}>
                    {doc ? (status === 'Expired' || status === 'Expiring Soon' ? 'Renew' : 'Replace') : req.file === false ? 'Add' : 'Upload'}
                  </Button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

/** Upload (or replace) one compliance document for an owner. */
export function UploadDocumentModal({ open, onClose, ownerType, ownerId, ownerLabel, requirements, initialType, onDone }) {
  const [type, setType] = useState('');
  const [files, setFiles] = useState([]);
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setType(initialType || requirements[0]?.type || '');
    setFiles([]); setNumber(''); setExpiry(''); setError('');
  }, [open, initialType, requirements]);

  const req = requirements.find((r) => r.type === type) || { type, label: type, file: true };
  const needsFile = req.file !== false;

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (needsFile && files.length === 0) { setError('Choose a file to upload.'); return; }
    if (req.number && !req.file && !number.trim()) { setError(`Enter the ${req.number}.`); return; }
    if (req.expires && !expiry) { setError('Enter the expiry date.'); return; }
    setBusy(true);
    try {
      const doc = await createDocument({
        ownerType, ownerId, type: req.type,
        name: needsFile ? files[0].name : `${req.label}${ownerLabel ? ` — ${ownerLabel}` : ''}`,
        fileSize: needsFile ? files[0].size : '—',
        url: needsFile ? files[0].url : undefined,
        number: number.trim() ? (req.sensitive ? maskNumber(number) : number.trim()) : null,
        expiryDate: expiry || null,
      });
      onDone?.(doc);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open} onClose={onClose} width={520}
      title={`Upload ${req.label || 'Document'}`}
      description={ownerLabel ? `For ${ownerLabel}` : undefined}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="upload-doc-form" type="submit" icon="upload" disabled={busy}>{busy ? 'Uploading…' : 'Submit for Review'}</Button></>}
    >
      <form id="upload-doc-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <Select label="Document Type" value={type} options={requirements.map((r) => ({ value: r.type, label: `${r.label}${r.required ? '' : ' (optional)'}` }))} onChange={(e) => setType(e.target.value)} />
        {req.hint && <span className="tk-meta" style={{ marginTop: -6 }}>{req.hint}</span>}
        {req.number && (
          <TextField
            label={req.number} value={number} onChange={(e) => setNumber(e.target.value)} inputMode={req.sensitive ? 'numeric' : undefined}
            autoComplete="off"
            hint={req.sensitive ? 'Verified with the issuing authority. Only the last 4 digits are kept on file.' : undefined}
          />
        )}
        {needsFile && <FileDrop files={files} onChange={setFiles} accept={req.accept || 'application/pdf,image/*'} preview />}
        {req.expires && <TextField label="Expiry Date" type="date" required value={expiry} onChange={(e) => setExpiry(e.target.value)} />}
        {error && <span style={{ color: 'var(--tk-danger)', font: '500 13px/18px var(--tk-font-sans)' }}>{error}</span>}
      </form>
    </Modal>
  );
}

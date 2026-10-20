'use client';

import { useRef, useState } from 'react';
import { Link, useNavigate } from '../router.js';
import { Badge, Button, Card, DataTable, EmptyState, Icon, Modal, PageHeader, SkeletonRow, TextField, Textarea } from '../ds.js';
import { useCreateSupportTicketMutation, useGetSupportTicketsQuery } from '../store/features/support/supportApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { supportTicketHref } from '../domain/supportLinks.js';
import { useTopBarSearch } from '../pageSearch.js';
import { FileDrop } from '../components/FileDrop.jsx';

const STATUS_TONE = { Open: 'info', Pending: 'warning', Resolved: 'success' };

function NewTicketModal({ open, onClose }) {
  const [draft, setDraft] = useState({ subject: '', category: 'General', body: '' });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const running = useRef(false);
  const [createTicket] = useCreateSupportTicketMutation();
  async function submit(event) {
    event.preventDefault();
    if (running.current) return;
    setError('');
    if (!draft.subject.trim() || !draft.body.trim()) { setError('Enter a subject and a message for support.'); return; }
    running.current = true;
    setBusy(true);
    try {
      await createTicket({ ...draft, files }).unwrap();
      setDraft({ subject: '', category: 'General', body: '' });
      files.forEach((file) => URL.revokeObjectURL(file.url));
      setFiles([]);
      onClose();
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { running.current = false; setBusy(false); }
  }
  return (
    <Modal open={open} onClose={() => { if (!running.current) onClose(); }} title="Contact Support" width={480}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button form="new-ticket-form" type="submit" disabled={busy || !draft.subject.trim() || !draft.body.trim()}>{busy ? 'Sending…' : 'Send'}</Button></>}>
      <form id="new-ticket-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <TextField label="Subject" required error={error} disabled={busy} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
        <Textarea label="How can we help?" rows={4} disabled={busy} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
        <FileDrop label="Attachments (optional)" multiple preview files={files} onChange={(next) => { if (!running.current) setFiles(next); }} maxBytes={25 * 1024 * 1024}
          accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" hint="Screenshots, photos, videos or documents · up to 25 MB each" />
      </form>
    </Modal>
  );
}

export function Support() {
  const navigate = useNavigate();
  const { data, error, isLoading } = useGetSupportTicketsQuery(undefined, { refetchOnMountOrArgChange: true });
  const tickets = data ?? [];
  // Help routes have no documented response schema; do not show fixture FAQs.
  const faqs = [];
  const [newOpen, setNewOpen] = useState(false);
  const [query, setQuery] = useState('');
  useTopBarSearch(setQuery);
  const q = query.trim().toLowerCase();
  const matches = (...values) => !q || values.some((v) => String(v || '').toLowerCase().includes(q));
  const visibleTickets = tickets.filter((t) => matches(t.id, t.subject, t.category, t.status));
  const visibleFaqs = faqs.filter((f) => matches(f.question, f.answer));

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader title="Support" description={error ? getApiErrorMessage(error) : 'Get help with jobs, payments, fleet, or your account.'} actions={<Button icon="plus" onClick={() => setNewOpen(true)}>Contact Support</Button>} />
      <Card pad="none">
        <h3 className="tk-title" style={{ margin: 0, padding: '16px 16px 0' }}>Your Tickets</h3>
        {isLoading ? <SkeletonRow columns={5} /> : error ? <EmptyState icon="life-buoy" title={getApiErrorMessage(error)} /> : tickets.length === 0 ? (
          <EmptyState icon="life-buoy" title="No support tickets" description="Reach out to us any time — we usually respond within a few hours." />
        ) : visibleTickets.length === 0 ? (
          <EmptyState icon="search" title="No tickets match your search" />
        ) : (
          <DataTable
            rows={visibleTickets}
            rowKey={(t) => t.id}
            onRowClick={(t) => navigate(supportTicketHref(t.id))}
            columns={[
              { key: 'id', header: 'Ticket ID', render: (t) => <Link to={supportTicketHref(t.id)} onClick={(e) => e.stopPropagation()}>{t.id}</Link> },
              { key: 'subject', header: 'Subject', render: (t) => t.subject },
              { key: 'category', header: 'Category', render: (t) => t.category },
              { key: 'status', header: 'Status', render: (t) => <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge> },
              { key: 'updatedAt', header: 'Updated', render: (t) => t.updatedAt },
            ]}
          />
        )}
      </Card>
      <Card>
        <h3 className="tk-title" style={{ margin: '0 0 12px' }}>Frequently Asked Questions</h3>
        <div style={{ display: 'grid', gap: 4 }}>
          {visibleFaqs.length === 0 && <span className="tk-meta">{q ? 'No help articles match your search.' : '—'}</span>}
          {visibleFaqs.map((f) => (
            <details key={f.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--tk-line)' }}>
              <summary style={{ cursor: 'pointer', font: '600 13px/20px var(--tk-font-sans)', color: 'var(--tk-ink-900)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="circle-help" size={15} color="var(--tk-blue)" /> {f.question}
              </summary>
              <p style={{ margin: '8px 0 0 23px', font: '400 13px/20px var(--tk-font-sans)', color: 'var(--tk-ink-500)' }}>{f.answer}</p>
            </details>
          ))}
        </div>
      </Card>
      <NewTicketModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

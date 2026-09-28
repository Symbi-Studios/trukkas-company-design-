'use client';

import { useState } from 'react';
import { Link, useNavigate } from '../router.js';
import { Badge, Button, Card, DataTable, EmptyState, Icon, Modal, PageHeader, TextField, Textarea } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { createSupportTicket } from '../mock/api.js';
import { FileDrop } from '../components/FileDrop.jsx';

const STATUS_TONE = { Open: 'info', Pending: 'warning', Resolved: 'success' };

function NewTicketModal({ open, onClose }) {
  const [draft, setDraft] = useState({ subject: '', category: 'General', body: '' });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (!draft.subject.trim()) return;
    setBusy(true);
    const attachments = files.map(({ name, size, type, url }) => ({ name, size, type, url }));
    await createSupportTicket({ subject: draft.subject, category: draft.category, messages: draft.body || attachments.length ? [{ author: 'You', role: 'You', time: 'Just now', agent: false, body: draft.body, attachments }] : [] });
    setBusy(false);
    setDraft({ subject: '', category: 'General', body: '' });
    setFiles([]);
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="Contact Support" width={480}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="new-ticket-form" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send'}</Button></>}>
      <form id="new-ticket-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <TextField label="Subject" required value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
        <Textarea label="How can we help?" rows={4} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
        <FileDrop label="Attachments (optional)" multiple preview files={files} onChange={setFiles} maxBytes={25 * 1024 * 1024}
          accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" hint="Screenshots, photos, videos or documents · up to 25 MB each" />
      </form>
    </Modal>
  );
}

export function Support() {
  const navigate = useNavigate();
  const tickets = useCollection('supportTickets') || [];
  const faqs = useCollection('faqs') || [];
  const [newOpen, setNewOpen] = useState(false);

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader title="Support" description="Get help with jobs, payments, fleet, or your account." actions={<Button icon="plus" onClick={() => setNewOpen(true)}>Contact Support</Button>} />
      <Card pad="none">
        <h3 className="tk-title" style={{ margin: 0, padding: '16px 16px 0' }}>Your Tickets</h3>
        {tickets.length === 0 ? (
          <EmptyState icon="life-buoy" title="No support tickets" description="Reach out to us any time — we usually respond within a few hours." />
        ) : (
          <DataTable
            rows={tickets}
            rowKey={(t) => t.id}
            onRowClick={(t) => navigate(`/support/${t.id}`)}
            columns={[
              { key: 'id', header: 'Ticket ID', render: (t) => <Link to={`/support/${t.id}`} onClick={(e) => e.stopPropagation()}>{t.id}</Link> },
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
          {faqs.map((f) => (
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

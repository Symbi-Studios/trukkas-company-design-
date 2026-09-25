'use client';

import { useState } from 'react';
import { useNavigate, useParams } from '../router.js';
import { Badge, Button, Card, MessageBubble, PageHeader, TextField } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { replyToTicket } from '../mock/api.js';

const STATUS_TONE = { Open: 'info', Pending: 'warning', Resolved: 'success' };

export function TicketDetail() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const tickets = useCollection('supportTickets') || [];
  const ticket = tickets.find((t) => t.id === ticketId);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  if (!ticket) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title="Ticket not found" />
        <Button variant="outline" onClick={() => navigate('/support')}>Back to Support</Button>
      </div>
    );
  }

  async function submit(event) {
    event.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    await replyToTicket(ticket.id, reply.trim());
    setReply('');
    setBusy(false);
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader
        crumbs={[{ label: 'Support', onClick: () => navigate('/support') }, ticket.id]}
        title={ticket.subject}
        description={`${ticket.category} · Opened ${ticket.createdAt}`}
        meta={<Badge tone={STATUS_TONE[ticket.status]}>{ticket.status}</Badge>}
      />
      <Card pad="none">
        <div style={{ padding: '0 var(--tk-card-pad)' }}>
          {ticket.messages.length === 0 ? (
            <p style={{ padding: '16px 0', margin: 0 }} className="tk-meta">No messages yet.</p>
          ) : ticket.messages.map((m, i) => (
            <MessageBubble key={i} author={m.author} role={m.role} roleTone={m.agent ? 'blue' : 'neutral'} time={m.time}>{m.body}</MessageBubble>
          ))}
        </div>
        <form onSubmit={submit} style={{ display: 'flex', gap: 8, padding: 'var(--tk-card-pad)', borderTop: '1px solid var(--tk-line)' }}>
          <TextField style={{ flex: 1 }} placeholder="Write a reply..." value={reply} onChange={(e) => setReply(e.target.value)} />
          <Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send'}</Button>
        </form>
      </Card>
    </div>
  );
}

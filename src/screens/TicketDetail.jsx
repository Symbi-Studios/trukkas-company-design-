'use client';

import { useRef, useState } from 'react';
import { useNavigate, useParams } from '../router.js';
import { AttachmentCard, Badge, Button, Card, IconButton, MessageBubble, PageHeader, Textarea } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { replyToTicket } from '../mock/api.js';
import { toUploads } from '../components/FileDrop.jsx';
import styles from './TicketDetail.module.css';

const STATUS_TONE = { Open: 'info', Pending: 'warning', Resolved: 'success' };
const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT = 'image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt';

function kindOf(type = '') {
  if (type.startsWith('image/')) return 'image';
  if (type === 'application/pdf') return 'pdf';
  if (/sheet|excel|csv/.test(type)) return 'sheet';
  return 'doc';
}

/** Renders a message's attachments: inline previews for images/video, file cards otherwise. */
export function MessageAttachments({ items }) {
  if (!items?.length) return null;
  return (
    <div className={styles.attachments}>
      {items.map((a, i) => {
        if (a.url && a.type?.startsWith('image/')) {
          return <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className={styles.media}><img src={a.url} alt={a.name} /></a>;
        }
        if (a.url && a.type?.startsWith('video/')) {
          return <video key={i} className={styles.media} src={a.url} controls preload="metadata" />;
        }
        return (
          <AttachmentCard key={i} name={a.name} size={a.size} kind={kindOf(a.type)}
            onOpen={() => a.url && window.open(a.url, '_blank', 'noopener')} style={{ minWidth: 0, maxWidth: 280 }} />
        );
      })}
    </div>
  );
}

export function TicketDetail() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const tickets = useCollection('supportTickets') || [];
  const ticket = tickets.find((t) => t.id === ticketId);
  const [reply, setReply] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef(null);

  if (!ticket) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title="Ticket not found" />
        <Button variant="outline" onClick={() => navigate('/support')}>Back to Support</Button>
      </div>
    );
  }

  function addFiles(list) {
    const all = Array.from(list || []);
    const tooBig = all.filter((f) => f.size > MAX_BYTES);
    setError(tooBig.length ? `${tooBig.map((f) => f.name).join(', ')} is larger than 25 MB.` : '');
    setFiles((current) => [...current, ...toUploads(all.filter((f) => f.size <= MAX_BYTES))].slice(0, 6));
  }

  async function submit(event) {
    event.preventDefault();
    if (!reply.trim() && files.length === 0) return;
    setBusy(true);
    await replyToTicket(ticket.id, reply.trim(), files.map(({ name, size, type, url }) => ({ name, size, type, url })));
    setReply('');
    setFiles([]);
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
            <MessageBubble key={i} author={m.author} role={m.role} roleTone={m.agent ? 'blue' : 'neutral'} time={m.time}>
              {m.body}
              <MessageAttachments items={m.attachments} />
            </MessageBubble>
          ))}
        </div>
        <form
          onSubmit={submit}
          className={`${styles.composer} ${dragging ? styles.dragging : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        >
          {files.length > 0 && (
            <div className={styles.pending}>
              {files.map((f, i) => (
                <span key={f.url} className={styles.chip}>
                  {f.type.startsWith('image/') ? <img src={f.url} alt="" /> : <span className={styles.chipIcon}>{f.type.startsWith('video/') ? '▶' : 'DOC'}</span>}
                  <span><strong>{f.name}</strong><small>{f.size}</small></span>
                  <IconButton icon="x" size={24} label={`Remove ${f.name}`} onClick={() => setFiles((list) => list.filter((_, j) => j !== i))} />
                </span>
              ))}
            </div>
          )}
          <Textarea rows={3} placeholder="Write a reply… You can also drag files here." value={reply} onChange={(e) => setReply(e.target.value)} />
          {error && <span className={styles.error}>{error}</span>}
          <div className={styles.actions}>
            <input ref={input} type="file" hidden multiple accept={ACCEPT} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            <Button variant="outline" icon="paperclip" onClick={() => input.current?.click()}>Attach</Button>
            <span className="tk-meta">Photos, videos, PDFs or documents · up to 6 files, 25 MB each</span>
            <Button type="submit" icon="send" disabled={busy || (!reply.trim() && files.length === 0)}>{busy ? 'Sending…' : 'Send'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

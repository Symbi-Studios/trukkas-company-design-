import { useEffect, useState } from 'react';
import { Button, Modal, Textarea } from '../ds.js';

/** Compose a message to a forwarder, driver or support. The caller decides where it goes. */
export function MessageModal({ open, onClose, title, recipient, placeholder, onSend }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setBody(''); }, [open]);

  async function submit(event) {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await onSend(body.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open} onClose={onClose} title={title} description={recipient ? `To: ${recipient}` : undefined} width={480}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="message-form" type="submit" icon="send" disabled={busy || !body.trim()}>{busy ? 'Sending…' : 'Send Message'}</Button></>}
    >
      <form id="message-form" onSubmit={submit}>
        <Textarea label="Message" rows={5} maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} placeholder={placeholder} />
      </form>
    </Modal>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Button, Modal, Textarea } from '../ds.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';

/** Compose a message to a forwarder, driver or support. The caller decides where it goes. */
export function MessageModal({ open, onClose, title, recipient, placeholder, onSend }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  useEffect(() => { if (open) { setBody(''); setError(''); } }, [open, recipient]);

  async function submit(event) {
    event.preventDefault();
    if (submitting.current || !body.trim()) return;
    if (body.trim().length > 500) { setError('Enter a message of 500 characters or fewer.'); return; }
    submitting.current = true;
    setError('');
    setBusy(true);
    try {
      await onSend(body.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : getApiErrorMessage(err));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open} onClose={() => { if (!submitting.current) onClose(); }} title={title} description={recipient ? `To: ${recipient}` : undefined} width={480}
      footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button form="message-form" type="submit" icon="send" disabled={busy || !body.trim()}>{busy ? 'Sending…' : 'Send Message'}</Button></>}
    >
      <form id="message-form" onSubmit={submit}>
        <Textarea label="Message" rows={5} maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} placeholder={placeholder} disabled={busy} />
        {error && <p role="alert" style={{ color: 'var(--tk-danger)', font: '500 13px/18px var(--tk-font-sans)' }}>{error}</p>}
      </form>
    </Modal>
  );
}

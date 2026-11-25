'use client';

import { useState } from 'react';
import { Banner, Button, Icon, Modal, Select, TextField, Textarea } from '../ds.js';
import { FEEDBACK_TYPES, useGetFeedbackTopicsQuery, useSendFeedbackMutation } from '../store/features/feedback/feedbackApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import styles from './Feedback.module.css';

/** "Send feedback about Trukkas": an idea, a problem or praise. Separate from support tickets and trip ratings. */
export function SendFeedbackDialog({ onClose, onSent }) {
  const [type, setType] = useState('SUGGESTION');
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const topics = useGetFeedbackTopicsQuery();
  const [send, state] = useSendFeedbackMutation();
  const saving = state.isLoading;
  const ready = title.trim() && body.trim() && title.trim().length <= 150 && body.trim().length <= 5000 && !saving;

  async function submit() {
    if (!ready) return;
    setError('');
    try {
      await send({ title, body, type, topic }).unwrap();
      onSent?.();
      onClose();
    } catch (failure) { setError(getApiErrorMessage(failure)); }
  }

  const topicOptions = (topics.currentData?.topics || []).map((value) => ({ value, label: value }));
  return (
    <Modal open width={560} title="Send feedback" description="Tell the Trukkas team what’s working and what isn’t. We read everything."
      onClose={() => { if (!saving) onClose(); }}
      footer={<>
        <Button variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
        <Button disabled={!ready} onClick={submit}>{saving ? 'Sending…' : 'Send feedback'}</Button>
      </>}>
      <form className={styles.form} onSubmit={(event) => { event.preventDefault(); submit(); }}>
        {error && <Banner tone="danger" title="Couldn’t send feedback">{error}</Banner>}
        <div className={styles.field}>
          <span className={styles.label}>What kind of feedback?</span>
          <div className={styles.types} role="radiogroup" aria-label="Feedback type">
            {FEEDBACK_TYPES.map((option) => (
              <button key={option.value} type="button" role="radio" aria-checked={type === option.value} className={styles.type} disabled={saving} onClick={() => setType(option.value)}>
                <span className={styles.typeIcon} aria-hidden="true"><Icon name={option.icon} size={15} /></span>
                <span><strong>{option.label}</strong><small>{option.hint}</small></span>
              </button>
            ))}
          </div>
        </div>
        {topicOptions.length > 0 && (
          <Select label="Topic (optional)" placeholder="Choose a topic" value={topic} options={topicOptions} disabled={saving} onChange={(event) => setTopic(event.target.value)} />
        )}
        <TextField label="Title" value={title} maxLength={150} disabled={saving} placeholder="Sum it up in a few words" onChange={(event) => setTitle(event.target.value)} />
        <Textarea label="Details" rows={5} maxLength={5000} value={body} disabled={saving}
          placeholder={type === 'ISSUE' ? 'What happened, and what did you expect?' : 'Tell us more.'} onChange={(event) => setBody(event.target.value)} />
        <p className={styles.hint}>Need help with a job, payment or account? <a href="/support/new">Contact support</a> instead. Support tickets get a faster answer.</p>
      </form>
    </Modal>
  );
}

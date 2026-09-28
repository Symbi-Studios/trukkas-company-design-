import { useId, useRef, useState } from 'react';
import { Icon, IconButton } from '../ds.js';
import styles from './FileDrop.module.css';

export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Wraps browser Files as upload records. The prototype keeps files in memory
 * (object URLs for previews); a real integration uploads them and stores the
 * returned file id/url instead.
 */
export function toUploads(fileList) {
  return Array.from(fileList || []).map((file) => ({
    file,
    name: file.name,
    type: file.type,
    size: formatBytes(file.size),
    fileSize: formatBytes(file.size),
    url: URL.createObjectURL(file),
  }));
}

const MAX_BYTES = 10 * 1024 * 1024;

/** Drag-and-drop / click-to-browse upload area with a removable file list. */
export function FileDrop({
  label, hint, accept, multiple = false, files = [], onChange, compact = false, preview = false, maxBytes = MAX_BYTES, style,
}) {
  const inputId = useId();
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState('');

  function add(list) {
    const incoming = Array.from(list || []);
    const tooBig = incoming.filter((f) => f.size > maxBytes);
    setError(tooBig.length ? `${tooBig.map((f) => f.name).join(', ')} exceeds ${formatBytes(maxBytes)}.` : '');
    const uploads = toUploads(incoming.filter((f) => f.size <= maxBytes));
    if (!uploads.length) return;
    onChange(multiple ? [...files, ...uploads] : uploads.slice(0, 1));
  }

  const showZone = multiple || files.length === 0;
  return (
    <div className={styles.wrap} style={style}>
      {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
      {showZone && (
        <div
          role="button" tabIndex={0}
          className={`${styles.zone} ${compact ? styles.compact : ''} ${over ? styles.over : ''}`}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
        >
          <span className={styles.zoneIcon}><Icon name="cloud-upload" size={compact ? 18 : 22} /></span>
          <span className={styles.zoneCopy}>
            <strong><span>Click to upload</span> or drag and drop</strong>
            <small>{hint || 'PDF, JPG or PNG up to 10 MB'}</small>
          </span>
        </div>
      )}
      <input
        id={inputId} ref={input} type="file" hidden accept={accept} multiple={multiple}
        onChange={(e) => { add(e.target.files); e.target.value = ''; }}
      />
      {error && <span className={styles.error}>{error}</span>}
      {files.length > 0 && (
        <ul className={styles.files}>
          {files.map((f, i) => (
            <li key={f.url || f.name + i}>
              {preview && f.type?.startsWith('image/')
                ? <img src={f.url} alt="" className={styles.thumb} />
                : <span className={styles.fileIcon}><Icon name={f.type?.startsWith('image/') ? 'image' : f.type?.startsWith('video/') ? 'video' : 'file-text'} size={16} /></span>}
              <span className={styles.fileMain}><strong>{f.name}</strong><small>{f.size}</small></span>
              <IconButton icon="x" size={28} label={`Remove ${f.name}`} onClick={() => onChange(files.filter((_, j) => j !== i))} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

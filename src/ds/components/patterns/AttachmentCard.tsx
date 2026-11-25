import React from 'react';
import { Icon } from '../../assets/icons/Icon';

const KIND = {
  pdf:   ['var(--tk-danger-soft)', 'var(--tk-danger)', 'file-text'],
  image: ['var(--tk-blue-soft)', 'var(--tk-blue)', 'image'],
  sheet: ['var(--tk-success-soft)', 'var(--tk-success)', 'sheet'],
  doc:   ['var(--tk-neutral-soft)', 'var(--tk-ink-500)', 'file'],
};

export function AttachmentCard({ name, size, kind = 'doc', onOpen, style }: AttachmentCardProps) {
  const [bg, fg, icon] = KIND[kind] || KIND.doc;
  return (
    <button type="button" onClick={onOpen}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, cursor: 'pointer',
               borderRadius: 'var(--tk-r-lg)', border: '1px solid var(--tk-line)', background: '#fff',
               textAlign: 'left', minWidth: 200, ...style }}>
      <span style={{ width: 34, height: 34, borderRadius: 'var(--tk-r-sm)', background: bg, color: fg,
                     display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
        <Icon name={icon} size={17} />
      </span>
      <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
        <span style={{ font: '500 13px/18px var(--tk-font-sans)', color: 'var(--tk-ink-900)',
                       overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        <span className="tk-meta">{size}</span>
      </span>
    </button>
  );
}

export interface AttachmentCardProps {
  name: React.ReactNode;
  size?: React.ReactNode;
  kind?: 'pdf' | 'image' | 'sheet' | 'doc';
  onOpen?: () => void;
  style?: React.CSSProperties;
}

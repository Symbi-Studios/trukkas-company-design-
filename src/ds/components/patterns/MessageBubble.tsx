import React from 'react';
import { Avatar } from '../core/Avatar';
import { Tag } from '../core/Tag';

/** One turn in a support-ticket conversation. */
export function MessageBubble({ author, role, roleTone = 'blue', time, children, internal, style }: MessageBubbleProps) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '16px 0',
                  borderTop: '1px solid var(--tk-line)',
                  background: internal ? 'var(--tk-warning-soft)' : 'transparent', ...style }}>
      <Avatar name={typeof author === 'string' ? author : ''} size={30} />
      <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ font: '600 13px/18px var(--tk-font-sans)', color: 'var(--tk-ink-900)' }}>{author}</span>
          {role && <Tag tone={roleTone}>{role}</Tag>}
          <div style={{ flex: 1 }} />
          <span className="tk-meta">{time}</span>
        </div>
        <div style={{ font: '400 13px/20px var(--tk-font-sans)', color: 'var(--tk-ink-500)' }}>{children}</div>
      </div>
    </div>
  );
}

export interface MessageBubbleProps {
  author: React.ReactNode;
  role?: React.ReactNode;
  roleTone?: 'blue' | 'purple' | 'teal' | 'orange' | 'neutral';
  time?: React.ReactNode;
  children?: React.ReactNode;
  internal?: boolean;
  style?: React.CSSProperties;
}

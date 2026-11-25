import React from 'react';
import { Icon } from '../../assets/icons/Icon';

export function Pagination({ page = 1, pageCount = 1, pageSize = 10, total, onPage, onPageSize, style }: PaginationProps) {
  const btn = (active: boolean, disabled: boolean) => ({
    minWidth: 32, height: 32, padding: '0 8px', borderRadius: 'var(--tk-r-sm)',
    border: '1px solid ' + (active ? 'var(--tk-blue)' : 'var(--tk-line-strong)'),
    background: active ? 'var(--tk-blue)' : '#fff',
    color: active ? '#fff' : disabled ? 'var(--tk-ink-300)' : 'var(--tk-ink-500)',
    font: 'var(--tk-label-weight) var(--tk-label-size)/var(--tk-label-lh) var(--tk-font-sans)', cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'grid', placeItems: 'center',
  });
  const pages: Array<number | '…'> = [];
  for (let i = 1; i <= Math.min(pageCount, 3); i++) pages.push(i);
  if (pageCount > 4) pages.push('…');
  if (pageCount > 3) pages.push(pageCount);
  return (
    <div className="tk-pagination" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  padding: '14px var(--tk-card-pad)', borderTop: '1px solid var(--tk-line)', ...style }}>
      {total != null && (
        <span className="tk-meta tk-pagination-summary">
          Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total.toLocaleString()}
        </span>
      )}
      <div style={{ flex: 1 }} />
      <div className="tk-pagination-pages" style={{ display: 'flex', gap: 6 }}>
        <button style={btn(false, page === 1)} onClick={() => onPage?.(page - 1)} aria-label="Previous">
          <Icon name="chevron-left" size={15} />
        </button>
        {pages.map((p, i) => p === '…'
          ? <span key={'e' + i} style={{ ...btn(false, true), border: 0, background: 'transparent' }}>…</span>
          : <button key={p} style={btn(p === page, false)} onClick={() => onPage?.(p)}>{p}</button>)}
        <button style={btn(false, page === pageCount)} onClick={() => onPage?.(page + 1)} aria-label="Next">
          <Icon name="chevron-right" size={15} />
        </button>
      </div>
      {onPageSize && (
        <select value={pageSize} onChange={e => onPageSize(Number(e.target.value))}
          style={{ height: 32, borderRadius: 'var(--tk-r-sm)', border: '1px solid var(--tk-line-strong)',
                   background: '#fff', color: 'var(--tk-ink-500)', padding: '0 8px',
                   font: 'var(--tk-label-weight) var(--tk-label-size)/var(--tk-label-lh) var(--tk-font-sans)', cursor: 'pointer' }}>
          {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
        </select>
      )}
    </div>
  );
}

export interface PaginationProps {
  page?: number;
  pageCount?: number;
  pageSize?: number;
  /** total rows — renders the "Showing 1 to 10 of 1,248" line */
  total?: number;
  onPage?: (page: number) => void;
  /** omit to hide the rows-per-page select */
  onPageSize?: (size: number) => void;
  style?: React.CSSProperties;
}

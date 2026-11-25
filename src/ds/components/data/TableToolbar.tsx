import React from 'react';

/** The filter strip above a table: search on the left, filter dropdowns, then a clear link. */
export function TableToolbar({ search, filters, trailing, onClear, style }: TableToolbarProps) {
  return (
    <div className="tk-table-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                  padding: '14px var(--tk-card-pad)', ...style }}>
      {search && <div className="tk-table-toolbar-search" style={{ flex: '1 1 280px', minWidth: 200 }}>{search}</div>}
      {filters && <div className="tk-table-toolbar-filters">{filters}</div>}
      <div className="tk-table-toolbar-spacer" style={{ flex: 1 }} />
      {trailing && <div className="tk-table-toolbar-trailing">{trailing}</div>}
      {onClear && (
        <button type="button" onClick={onClear}
          style={{ border: 0, background: 'transparent', cursor: 'pointer',
                   font: '600 13px/1 var(--tk-font-sans)', color: 'var(--tk-orange)' }}>
          Clear All
        </button>
      )}
    </div>
  );
}

export interface TableToolbarProps {
  /** a <SearchField/> */
  search?: React.ReactNode;
  /** one or more <FilterSelect/> */
  filters?: React.ReactNode;
  /** right-aligned extras, e.g. an Apply Filters button */
  trailing?: React.ReactNode;
  onClear?: () => void;
  style?: React.CSSProperties;
}

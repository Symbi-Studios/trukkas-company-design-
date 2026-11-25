import React from "react";
import { Checkbox } from "../forms/Checkbox";

/**
 * The console list table. Columns declare { key, header, width, align, render }.
 * Rows are 56px, separated by hairlines; the header row is uppercase-free 12px ink-400.
 */
export function DataTable<T>({
  columns = [],
  rows = [],
  selectable,
  selected = [],
  onSelect,
  onRowClick,
  rowKey = (r, i) => (r as { id?: string | number }).id ?? i,
  tableLayout = "auto",
  style,
  coloredHeader,
  expandedRowKeys = [],
  renderExpandedRow,
}: DataTableProps<T>) {
  const allOn = rows.length > 0 && selected.length === rows.length;
  const cell = {
    padding: "var(--tk-row-pad-y) var(--tk-row-pad-x)",
    verticalAlign: "middle",
  };
  return (
    <div className="tk-scroll tk-table-wrap" style={{ overflowX: "auto", ...style }}>
      <table
        className="tk-data-table"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout,
          minWidth: Math.max(640, columns.length * 118 + (selectable ? 44 : 0)),
          font: "var(--tk-body-weight) var(--tk-body-size)/var(--tk-body-lh) var(--tk-font-sans)",
        }}
      >
        <thead>
          <tr style={{ borderBottom: "1px solid var(--tk-line)" }}>
            {selectable && (
              <th className="tk-table-select"
                style={{
                  ...cell,
                  width: 44,
                }}
              >
                <Checkbox
                  checked={allOn}
                  indeterminate={!allOn && selected.length > 0}
                  onChange={(v) => onSelect?.(v ? rows.map(rowKey) : [])}
                />
              </th>
            )}
            {columns.map((c) => (
              <th
                key={c.key}
                data-key={c.key}
                style={{
                  ...cell,
                  width: c.width,
                  textAlign: c.align || "left",
                  font: "var(--tk-body-strong-weight) var(--tk-label-size)/var(--tk-label-lh) var(--tk-font-sans)",
                  color: "var(--tk-ink-400)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  backgroundColor: coloredHeader
                    ? "var(--tk-surface-soft)"
                    : "transparent",
                }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const k = rowKey(r, i);
            const on = selected.includes(k);
            const expanded = expandedRowKeys.includes(k);
            return (
              <React.Fragment key={k}>
              <tr
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onRowClick(r); } } : undefined}
                onClick={() => onRowClick?.(r)}
                style={{
                  borderBottom: "1px solid var(--tk-line)",
                  background: on ? "var(--tk-surface-soft)" : "transparent",
                  cursor: onRowClick ? "pointer" : "default",
                  
                }}
              >
                {selectable && (
                  <td className="tk-table-select" style={cell} onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={on}
                      onChange={(v) =>
                        onSelect?.(
                          v
                            ? [...selected, k]
                            : selected.filter((x) => x !== k),
                        )
                      }
                    />
                  </td>
                )}
                {columns.map((c) => (
                  <td
                    key={c.key}
                    data-label={c.header}
                    data-key={c.key}
                    style={{
                      ...cell,
                      textAlign: c.align || "left",
                      color: "var(--tk-ink-500)",
                    }}
                  >
                    {c.render ? c.render(r) : (r as Record<string, React.ReactNode>)[c.key]}
                  </td>
                ))}
              </tr>
              {expanded && renderExpandedRow && (
                <tr className="tk-data-table-expanded">
                  <td colSpan={columns.length + (selectable ? 1 : 0)} style={{ padding: 0, background: "var(--tk-surface-soft)" }}>
                    {renderExpandedRow(r)}
                  </td>
                </tr>
              )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * @startingPoint section="Data" subtitle="Console list table" viewport="700x300"
 */
export interface DataTableColumn<T = any> {
  key: string;
  header?: React.ReactNode;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => React.ReactNode;
}
export interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** adds the leading checkbox column */
  selectable?: boolean;
  /** tints the entire header row with the info-soft background */
  coloredHeader?: boolean;
  selected?: Array<string | number>;
  onSelect?: (keys: Array<string | number>) => void;
  onRowClick?: (row: T) => void;
  rowKey?: (row: T, index: number) => string | number;
  /** 'fixed' makes each column's `width` authoritative instead of content-negotiated —
   *  use for dense tables (8+ columns) where auto-layout starves narrow columns to make
   *  room for badges/numbers with hard content minimums. Pair with an ellipsis style on
   *  cell content so overflow truncates instead of breaking the row. Default 'auto'. */
  tableLayout?: 'auto' | 'fixed';
  expandedRowKeys?: Array<string | number>;
  renderExpandedRow?: (row: T) => React.ReactNode;
  style?: React.CSSProperties;
}

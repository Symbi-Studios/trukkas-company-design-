import React from 'react';
import styles from './Skeleton.module.css';

/** Quiet placeholders with reduced-motion support; never rendered as live data. */
export function Skeleton({ width = '100%', height = 12, radius = 6, style }) {
  return <span aria-hidden="true" className={styles.block} style={{ width, height, borderRadius: radius, ...style }} />;
}

function TextLines({ width = '68%' }) {
  return <span className={styles.text}><Skeleton width={width} height={13} /><Skeleton width="88%" height={10} /></span>;
}

function FormFields({ count = 6 }) {
  return <div className={styles.form}>{Array.from({ length: count }, (_, index) => <div key={index} className={`${styles.field} ${count > 4 && index === 4 ? styles.full : ''}`}>
    <Skeleton width={index % 2 ? 92 : 130} height={12} /><Skeleton height={40} radius={8} />
  </div>)}</div>;
}

function ListItems({ rows }) {
  return <div>{Array.from({ length: rows }, (_, index) => <div key={index} className={styles.item}>
    <Skeleton width={36} height={36} radius={10} /><TextLines width={index % 2 ? '52%' : '66%'} /><Skeleton width={54} height={22} radius={20} />
  </div>)}</div>;
}

/** Content-shaped loading states shared by tables, tabs, forms and detail pages. */
export function SkeletonRow({ columns = 4, rows = 4, variant = 'table', action = true, style }) {
  let content;
  if (variant === 'form') content = <><FormFields count={rows} />{action && <Skeleton width={145} height={38} radius={8} style={{ marginTop: 18 }} />}</>;
  else if (variant === 'preferences') content = <>
    <div className={styles.stack}>{Array.from({ length: rows }, (_, index) => <div key={index} className={styles.preference}>
      <Skeleton width={38} height={22} radius={20} /><TextLines width={index % 2 ? '38%' : '48%'} />
    </div>)}</div>{action && <Skeleton width={150} height={38} radius={8} style={{ marginTop: 16 }} />}
  </>;
  else if (variant === 'bank') content = <>
    <div className={styles.bank}><Skeleton width={36} height={36} radius={10} /><div className={styles.stack} style={{ flex: 1, minWidth: 0 }}><Skeleton width="86%" height={16} /><Skeleton width="70%" /><Skeleton width="58%" height={10} /></div></div>
    <Skeleton width={176} height={38} radius={8} style={{ marginTop: 14 }} />
  </>;
  else if (variant === 'list') content = <ListItems rows={rows} />;
  else if (variant === 'security') content = <><ListItems rows={1} /><Skeleton width={150} height={38} radius={8} style={{ marginTop: 12 }} /></>;
  else if (variant === 'roles') content = <div className={styles.roles}>
    <div className={styles.stack}>{Array.from({ length: 5 }, (_, index) => <div key={index} className={styles.role}><Skeleton width="68%" height={14} /><Skeleton width="82%" height={10} /></div>)}</div>
    <div className={styles.stack}><FormFields count={2} />{Array.from({ length: 3 }, (_, index) => <div key={index} className={styles.permissions}>{Array.from({ length: 4 }, (_, item) => <div key={item} className={styles.preference}><Skeleton width={18} height={18} radius={4} /><Skeleton width="70%" height={12} /></div>)}</div>)}</div>
  </div>;
  else if (variant === 'chart') content = <><div className={styles.chart}>{[35, 58, 44, 72, 54, 82, 65, 48, 76, 59, 90, 68].map((height, index) => <Skeleton key={index} height={`${height}%`} radius={5} />)}</div><div className={styles.legend}><Skeleton width={80} height={10} /><Skeleton width={80} height={10} /></div></>;
  else if (variant === 'detail') content = <div className={styles.detail}>
    <div className={styles.stack}><Skeleton width="38%" height={26} /><Skeleton width="60%" /></div>
    <div className={styles.stats}>{Array.from({ length: 4 }, (_, index) => <div key={index} className={styles.stat}><Skeleton width="75%" height={11} /><Skeleton width="55%" height={24} /><Skeleton width="90%" height={10} /></div>)}</div>
    <div className={styles.detailBody}><FormFields count={4} /><ListItems rows={2} /></div>
  </div>;
  else if (variant === 'review') content = <div>{Array.from({ length: rows }, (_, index) => <div key={index} className={styles.review}><ListItems rows={1} /><div className={styles.stack}><Skeleton width="96%" /><Skeleton width="82%" /><Skeleton width="48%" /></div></div>)}</div>;
  else content = <div className={styles.table} style={{ '--skeleton-rest': Math.max(0, columns - 1) }}>
    <div className={`${styles.tableRow} ${styles.tableHeader}`}>{Array.from({ length: columns }, (_, index) => <Skeleton key={index} width="58%" height={10} />)}</div>
    {Array.from({ length: rows }, (_, row) => <div key={row} className={styles.tableRow}>{Array.from({ length: columns }, (_, column) => <div key={column} className={styles.cell}>
      <Skeleton width={`${[74, 58, 82, 64][(row + column) % 4]}%`} height={12} />{column === 0 && <Skeleton width="48%" height={9} />}
    </div>)}</div>)}
  </div>;
  return <div className={styles.content} role="status" aria-label="Loading" aria-busy="true" style={style}><div aria-hidden="true">{content}</div></div>;
}

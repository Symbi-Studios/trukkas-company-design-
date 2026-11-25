import React from 'react';
import { Breadcrumbs } from './Breadcrumbs';

/** Title block: breadcrumbs, 28/700 title, one-line description, right-hand actions. */
export function PageHeader({ crumbs, title, description, actions, meta, style }: PageHeaderProps) {
  return (
    <div className="tk-page-header" style={{ display: 'grid', gap: 10, ...style }}>
      {crumbs && <Breadcrumbs items={crumbs} />}
      <div className="tk-page-header-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div className="tk-page-header-copy" style={{ flex: 1, minWidth: 240, display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="tk-display">{title}</h1>
            {meta}
          </div>
          {description && (
            <p style={{ margin: 0, font: '400 14px/20px var(--tk-font-sans)', color: 'var(--tk-ink-400)' }}>
              {description}
            </p>
          )}
        </div>
        {actions && <div className="tk-page-header-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{actions}</div>}
      </div>
    </div>
  );
}

/**
 * @startingPoint section="Navigation" subtitle="Page title block with actions" viewport="700x150"
 */
export interface PageHeaderProps {
  crumbs?: Array<string | { label: React.ReactNode; onClick?: () => void }>;
  title: React.ReactNode;
  /** one factual sentence describing what the page manages */
  description?: React.ReactNode;
  /** Buttons, right-aligned; at most one primary */
  actions?: React.ReactNode;
  /** inline node beside the title, e.g. a Badge */
  meta?: React.ReactNode;
  style?: React.CSSProperties;
}

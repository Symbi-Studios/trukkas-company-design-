// @ts-nocheck -- legacy module: complete TypeScript typing during migration.
'use client';

import { Badge, Banner, Button, EmptyState, Icon, ProgressBar } from '../ds';
import { categoryLabel, complianceLabel, complianceTone, INELIGIBILITY } from '../domain/maintenanceRules';
import { isPendingBackend } from '../store/features/fleet/fleetApi';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage';
import styles from './MaintenanceCompliance.module.css';

const km = (value) => value == null ? '—' : `${Math.round(value).toLocaleString('en-NG')} km`;
export function remainingLabel(req) {
  if (!req) return '—';
  const parts = [];
  if (req.remainingKm != null) parts.push(req.remainingKm < 0 ? `${km(-req.remainingKm)} over` : `${km(req.remainingKm)} to go`);
  if (req.remainingDays != null) parts.push(req.remainingDays < 0 ? `${-req.remainingDays} days overdue` : req.remainingDays === 0 ? 'due today' : `${req.remainingDays} days left`);
  return parts.join(' · ') || '—';
}
const blockTitle = (view) => view.reasonCode === 'MAINTENANCE_OVERDUE' || view.reasonCode === 'RESTRICTED' ? 'Truck Unavailable — Mandatory Maintenance Required' : `Truck Unavailable — ${INELIGIBILITY[view.reasonCode] ?? 'Not eligible for jobs'}`;
export const blockedMessage = (view) => view.message || view.restrictionReason || 'This truck cannot be assigned to a new job until the required maintenance has been completed and cleared.';

/** One line per truck that cannot take jobs right now (live `/maintenance/eligibility`). */
export function BlockedTrucks({ eligibility, error, onSchedule, onOpen }) {
  if (error) return null;
  const blocked = Object.values(eligibility ?? {}).filter((view) => view.eligible === false && view.reasonCode !== 'NOT_ACTIVE');
  if (!blocked.length) return null;
  return (
    <section className={styles.blocked} aria-label="Trucks blocked from new jobs">
      <header>
        <span className={styles.blockedIco}><Icon name="lock-keyhole" size={16} /></span>
        <span><strong>{blocked.length} truck{blocked.length > 1 ? 's' : ''} can’t take new jobs</strong><small>Clear the maintenance below to make {blocked.length > 1 ? 'them' : 'it'} available again. Trips already under way are not affected.</small></span>
      </header>
      {blocked.map((view) => (
        <div key={view.truckId} className={styles.blockedRow}>
          <span className={styles.plate}>{view.plate}</span>
          <span className={styles.reason}><strong>{INELIGIBILITY[view.reasonCode] ?? 'Not eligible'}</strong><small>{blockedMessage(view)}</small></span>
          <span className={styles.actions}>
            {onOpen && <Button size="sm" variant="outline" onClick={() => onOpen(view)}>View truck</Button>}
            {view.reasonCode !== 'UNDER_MAINTENANCE' && onSchedule && <Button size="sm" icon="wrench" onClick={() => onSchedule(view)}>Schedule service</Button>}
          </span>
        </div>
      ))}
    </section>
  );
}

/** Banner for a single truck's page when it cannot take jobs. */
export function TruckRestrictionBanner({ view, action }) {
  if (!view || view.eligible !== false || view.reasonCode === 'NOT_ACTIVE') return null;
  return <Banner tone="danger" title={blockTitle(view)} action={action}>{blockedMessage(view)}{view.restricted && view.restrictedAt ? ` Restricted ${view.restrictedAt}.` : ''}</Banner>;
}

/** Requirements generated from Trukkas rules (proposed `/maintenance/requirements`). */
export function RequirementList({ requirements, error, loading, onSchedule, showTruck = true, compact = false }) {
  if (loading) return null;
  if (error) {
    return isPendingBackend(error)
      ? <EmptyState icon="hourglass" title="Due dates from Trukkas rules are coming" description="Trukkas is switching on rule-based tracking. Until then, keep scheduling services yourself; overdue scheduled services still block trucks." />
      : <EmptyState icon="wrench" title={getApiErrorMessage(error)} />;
  }
  if (!requirements?.length) return <EmptyState icon="circle-check" title="Nothing due" description="Every truck is up to date with Trukkas maintenance rules." />;
  return (
    <div className={`${styles.reqs} ${compact ? styles.compact : ''}`}>
      {requirements.map((req) => {
        const used = req.intervalKm && req.remainingKm != null ? (req.intervalKm - req.remainingKm) / req.intervalKm * 100
          : req.intervalDays && req.remainingDays != null ? (req.intervalDays - req.remainingDays) / req.intervalDays * 100 : null;
        const tone = complianceTone(req.status);
        return (
          <div key={req.id} className={styles.req}>
            <div className={styles.reqMain}>
              <span className={styles.reqTitle}>
                {showTruck && <span className={styles.plate}>{req.truckPlate}</span>}
                <strong>{req.ruleName}</strong>
                {req.mandatory && <Badge tone="neutral">Mandatory</Badge>}
              </span>
              <small>{categoryLabel(req.category)} · {remainingLabel(req)} · due {req.dueKm != null ? `at ${km(req.dueKm)}` : ''}{req.dueKm != null && req.dueDate !== '—' ? ' or ' : ''}{req.dueDate !== '—' ? `by ${req.dueDate}` : ''}</small>
              {used != null && <ProgressBar value={Math.max(0, Math.min(100, used))} color={tone === 'danger' ? 'var(--tk-danger)' : tone === 'warning' || tone === 'orange' ? 'var(--tk-warning)' : 'var(--tk-blue)'} />}
            </div>
            <Badge tone={tone} dot>{complianceLabel(req.status)}</Badge>
            {onSchedule && (req.openRecordId ? <span className="tk-meta">Scheduled</span> : req.status !== 'UP_TO_DATE' && req.status !== 'UNDER_MAINTENANCE' ? <Button size="sm" variant={tone === 'danger' ? 'primary' : 'outline'} onClick={() => onSchedule(req)}>Schedule</Button> : null)}
          </div>
        );
      })}
    </div>
  );
}

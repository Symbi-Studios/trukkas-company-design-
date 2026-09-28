import { Icon, ProgressBar } from '../ds.js';
import { TRIP_STAGES } from '../domain/trips.js';
import styles from './TripStepper.module.css';

/** "Trip Progress": percentage bar over the five trip stages with their dates. */
export function TripStepper({ trip, showBar = true, compact = false }) {
  const current = TRIP_STAGES.indexOf(trip.status);
  const cancelled = trip.status === 'Cancelled';
  return (
    <div className={styles.wrap}>
      {showBar && <ProgressBar value={trip.progress} height={6} color={cancelled ? 'var(--tk-danger)' : 'var(--tk-blue)'} />}
      <ol className={`${styles.steps} ${compact ? styles.compact : ''}`}>
        {TRIP_STAGES.map((stage, index) => {
          const state = cancelled ? 'pending'
            : index < current || trip.status === 'Completed' ? 'done'
              : index === current ? 'current' : 'pending';
          return (
            <li key={stage} className={styles[state]}>
              <span className={styles.dot}>{state === 'done' && <Icon name="check" size={11} color="#fff" />}</span>
              <strong>{stage}</strong>
              <small>{trip.stageDates?.[stage] || 'Pending'}</small>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

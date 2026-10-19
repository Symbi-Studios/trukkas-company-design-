'use client';

import { ActivityFeed, EmptyState } from '../ds.js';
import { useFleetVehicle } from '../store/features/fleet/useFleetVehicle.js';
import { VehicleDetailFrame } from './VehicleDetailFrame.jsx';

export function VehicleActivityLog() {
  const { truck } = useFleetVehicle();

  if (!truck) return <VehicleDetailFrame tab="activity" title="Vehicle not found"><EmptyState icon="history" title="Not found" /></VehicleDetailFrame>;

  return (
    <VehicleDetailFrame tab="activity" title="Activity Log" description="Everything that's happened on this truck, most recent first.">
      {truck.activityLog?.length ? (
        <ActivityFeed items={truck.activityLog.map((a) => ({
          text: `${a.title} — ${a.detail}`, time: a.time,
          tone: { danger: 'var(--tk-danger)', warning: 'var(--tk-warning)', purple: 'var(--tk-purple)', orange: 'var(--tk-orange)', info: 'var(--tk-blue)', success: 'var(--tk-success)' }[a.tone] || 'var(--tk-blue)',
        }))} />
      ) : <span className="tk-meta">—</span>}
    </VehicleDetailFrame>
  );
}

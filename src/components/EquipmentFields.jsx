'use client';

import { ChoiceCard, Select, TextField } from '../ds.js';
import { useGetEquipmentOptionsQuery } from '../store/features/reference/referenceApi.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';

/**
 * What the truck can carry. Job matching depends on it, so it is asked for on
 * every truck head: a container truck (type, size, weight capacity) or a bulk
 * truck (Flatbed, Lowbed…).
 */
export function EquipmentFields({ value, onChange, error, disabled, lockedKind = null }) {
  const { data: options, error: loadError, isLoading } = useGetEquipmentOptionsQuery();
  const set = (patch) => onChange({ ...value, ...patch });
  if (loadError) return <span style={{ color: 'var(--tk-danger)', font: '500 13px/18px var(--tk-font-sans)' }}>{getApiErrorMessage(loadError)}</span>;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <ChoiceCard icon="container" title="Container truck" description="Carries 20ft / 40ft containers from the port."
          selected={value.kind === 'container'} onSelect={() => !disabled && (!lockedKind || lockedKind === 'container') && set({ kind: 'container' })} />
        <ChoiceCard icon="truck" title="Bulk truck" description="Flatbed, Lowbed and other break-bulk bodies."
          selected={value.kind === 'bulk'} onSelect={() => !disabled && (!lockedKind || lockedKind === 'bulk') && set({ kind: 'bulk' })} />
      </div>
      {lockedKind && <span className="tk-meta">A container truck can’t be changed to a bulk truck, or the reverse.</span>}
      {value.kind === 'container' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <Select label="Container Type" required disabled={disabled || isLoading} value={value.containerTypeId} placeholder="Select type"
            options={options?.containerTypes ?? []} onChange={(e) => set({ containerTypeId: e.target.value })} />
          <Select label="Largest Container Size" required disabled={disabled || isLoading} value={value.containerSizeId} placeholder="Select size"
            options={options?.containerSizes ?? []} onChange={(e) => set({ containerSizeId: e.target.value })} />
          <TextField label="Weight Capacity (tonnes)" required type="number" min="1" step="any" disabled={disabled} value={value.containerWeight}
            onChange={(e) => set({ containerWeight: e.target.value })} placeholder="e.g. 30" />
        </div>
      )}
      {value.kind === 'container' && <span className="tk-meta">A truck can carry any container up to the size you pick.</span>}
      {value.kind === 'bulk' && (
        <Select label="Truck Type" required disabled={disabled || isLoading} value={value.truckTypeId} placeholder="Select truck type"
          options={options?.truckTypes ?? []} onChange={(e) => set({ truckTypeId: e.target.value })} />
      )}
      {error && <span role="alert" style={{ color: 'var(--tk-danger)', font: '500 13px/18px var(--tk-font-sans)' }}>{error}</span>}
    </div>
  );
}

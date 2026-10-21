'use client';

import { useRef, useState } from 'react';
import { useNavigate } from '../router.js';
import { Badge, Button, Card, DropdownMenu, EmptyState, Icon, LabelValue, PageHeader, SkeletonRow, Tabs } from '../ds.js';
import { vehicleStatusTone } from '../domain/vehicles.js';
import { useFleetVehicle } from '../store/features/fleet/useFleetVehicle.js';
import { useLazyExportFleetVehicleQuery, useUpdateFleetVehicleMutation } from '../store/features/fleet/fleetApi.js';
import { fleetDetailHref } from '../domain/fleetLinks.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { Toast, useToast } from '../components/Toast.jsx';
import { EditFleetVehicleModal } from '../components/FleetVehicleModals.jsx';

const TABS = [
  { value: 'overview', label: 'Overview', href: '' },
  { value: 'documents', label: 'Documents', href: '/documents' },
  { value: 'maintenance', label: 'Maintenance', href: '/maintenance' },
  { value: 'trips', label: 'Trips History', href: '/trips-history' },
  { value: 'costs', label: 'Fuel & Costs', href: '/costs' },
  { value: 'activity', label: 'Activity Log', href: '/activity' },
];

/** Shared chrome for every /fleet/[vehicleId]... page: truck summary card,
 *  section tabs (real navigation, not local state), and a main/rail grid. */
export function VehicleDetailFrame({ tab, title, description, primaryAction, children, rail }) {
  const navigate = useNavigate();
  const { truck, error, isLoading } = useFleetVehicle();
  const [moreOpen, setMoreOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [toast, showToast] = useToast();
  const [updateVehicle, { isLoading: updating }] = useUpdateFleetVehicleMutation();
  const [exportVehicle, { isFetching: exporting }] = useLazyExportFleetVehicleQuery();
  const mutating = useRef(false);
  async function changeStatus() {
    if (mutating.current) return;
    mutating.current = true; setMoreOpen(false);
    try { await updateVehicle({ id: truck.id, status: truck.status === 'Inactive' ? 'Active' : 'Inactive' }).unwrap(); }
    catch (err) { showToast(getApiErrorMessage(err)); }
    finally { mutating.current = false; }
  }
  async function download() {
    if (mutating.current) return;
    mutating.current = true; setMoreOpen(false);
    try {
      const file = await exportVehicle(truck.id).unwrap();
      const url = URL.createObjectURL(new Blob([file.content], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'vehicle.csv'; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { showToast(getApiErrorMessage(err)); }
    finally { mutating.current = false; }
  }


  if (isLoading) return <SkeletonRow variant="detail" />;
  if (!truck) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title="Vehicle not found" />
        {error && <EmptyState icon="truck" title={getApiErrorMessage(error)} />}
        <Button variant="outline" onClick={() => navigate('/fleet')}>Back to Fleet</Button>
      </div>
    );
  }

  const activeTab = TABS.find((t) => t.value === tab);
  const base = fleetDetailHref(truck.id);
  const isOverview = tab === 'overview';

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader
        crumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { label: 'My Fleet', onClick: () => navigate('/fleet') },
          isOverview ? 'View Truck' : { label: 'View Truck', onClick: () => navigate(base) },
          ...(isOverview ? [] : [activeTab.label]),
        ]}
        title={title}
        description={description}
        actions={
          <>
            <Button variant="outline" icon="arrow-left" onClick={() => navigate(isOverview ? '/fleet' : base)}>
              {isOverview ? 'Back to Fleet' : 'Back to Truck'}
            </Button>
            {primaryAction}
            <div style={{ position: 'relative' }}>
              <Button variant="outline" iconRight="chevron-down" disabled={updating || exporting} onClick={() => setMoreOpen((v) => !v)}>More Actions</Button>
              {moreOpen && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 30 }}>
                  <DropdownMenu width={220} items={[
                    { label: 'Edit Truck', icon: 'pencil', onClick: () => { setMoreOpen(false); setEditOpen(true); } },
                    { label: 'Export Data', icon: 'download', onClick: download },
                    { divider: true },
                    {
                      label: truck.status === 'Inactive' ? 'Reactivate Truck' : 'Deactivate Truck', icon: 'power', tone: 'danger',
                      onClick: changeStatus,
                    },
                  ]} />
                </div>
              )}
            </div>
          </>
        }
      />

      <Card style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {truck.photos?.[0]?.url ? (
          <img src={truck.photos[0].url} alt={`${truck.plate} ${truck.photos[0].label}`} style={{ width: 88, height: 64, objectFit: 'cover', borderRadius: 'var(--tk-r-lg)', flex: '0 0 auto' }} />
        ) : (
          <span style={{ width: 64, height: 64, borderRadius: 'var(--tk-r-lg)', background: 'var(--tk-surface-sunk)', display: 'grid', placeItems: 'center', color: 'var(--tk-ink-400)', flex: '0 0 auto' }}>
            <Icon name="truck" size={30} />
          </span>
        )}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 className="tk-title" style={{ fontSize: 20, margin: 0 }}>{truck.plate}</h2>
            <Badge tone={vehicleStatusTone(truck.status)} dot>{truck.status}</Badge>
          </div>
          <span className="tk-meta">{truck.makeModel} · {truck.type}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: 24 }}>
          <LabelValue layout="stack" label="Registration No." value={truck.plate} />
          <LabelValue layout="stack" label="VIN Number" value={truck.vin} />
          <LabelValue layout="stack" label="Year" value={truck.year} />
          <LabelValue layout="stack" label="Purchase Date" value={truck.purchaseDate} />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 'var(--tk-grid-gap)', alignItems: 'start' }}>
        <Card pad="none">
          <div style={{ padding: '4px 16px 0' }}>
            <Tabs value={tab} onChange={(value) => {
              const target = TABS.find((t) => t.value === value);
              navigate(fleetDetailHref(truck.id, target.value));
            }} items={TABS} />
          </div>
          <div style={{ padding: 16 }}>{children}</div>
        </Card>
        <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
          {rail}
          <Card style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="headphones" size={18} color="var(--tk-blue)" />
            <span>
              <strong style={{ display: 'block', font: '600 13px/18px var(--tk-font-sans)' }}>Need Help?</strong>
              <span className="tk-meta">Contact our support team for assistance with {tab === 'documents' ? 'truck documents' : tab === 'maintenance' ? 'maintenance or service scheduling' : tab === 'trips' ? 'trip records or disputes' : 'this vehicle'}.</span>
              <Button variant="outline" size="sm" fullWidth style={{ marginTop: 10 }} onClick={() => navigate('/support')}>Contact Support</Button>
            </span>
          </Card>
        </div>
      </div>
      <Toast message={toast} />
      {editOpen && <EditFleetVehicleModal key={truck.id} truck={truck} onClose={() => setEditOpen(false)} />}
    </div>
  );
}

export { TABS as VEHICLE_TABS };

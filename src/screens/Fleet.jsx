'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '../router.js';
import {
  Badge, Button, Card, DataTable, DonutChart, EmptyState, Icon, LegendList,
  Modal, PageHeader, SearchField, Select, StatCard, TextField,
} from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { addTruck } from '../mock/api.js';
import { plateSlug } from '../domain/vehicles.js';

const VEHICLE_TABS = ['All Vehicles', 'Trucks', 'Trailers', 'Others'];

function typeGroup(type) {
  if (type === 'Trailer') return 'Trailers';
  if (type === 'Truck (Head)') return 'Trucks';
  return 'Others';
}

function AddVehicleModal({ open, onClose }) {
  const [draft, setDraft] = useState({ plate: '', type: 'Truck (Head)', makeModel: '' });
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (!draft.plate.trim()) return;
    setBusy(true);
    await addTruck(draft);
    setBusy(false);
    setDraft({ plate: '', type: 'Truck (Head)', makeModel: '' });
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="Add Vehicle" width={460}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button form="add-vehicle-form" type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add Vehicle'}</Button></>}>
      <form id="add-vehicle-form" onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <TextField label="Registration No." required value={draft.plate} onChange={(e) => setDraft({ ...draft, plate: e.target.value })} placeholder="e.g. ABJ 555 XY" />
        <Select label="Vehicle Type" value={draft.type} options={['Truck (Head)', 'Trailer']} onChange={(e) => setDraft({ ...draft, type: e.target.value })} />
        <TextField label="Make & Model" value={draft.makeModel} onChange={(e) => setDraft({ ...draft, makeModel: e.target.value })} placeholder="e.g. Mercedes Actros 2022" />
      </form>
    </Modal>
  );
}

export function Fleet() {
  const navigate = useNavigate();
  const trucks = useCollection('trucks') || [];
  const [tab, setTab] = useState('All Vehicles');
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const onSearch = (event) => setQuery(event.detail || '');
    window.addEventListener('trukkas:global-search', onSearch);
    return () => window.removeEventListener('trukkas:global-search', onSearch);
  }, []);

  const filtered = useMemo(() => trucks
    .filter((t) => tab === 'All Vehicles' || typeGroup(t.type) === tab)
    .filter((t) => !query || [t.plate, t.makeModel, t.driver].some((v) => String(v || '').toLowerCase().includes(query.toLowerCase()))),
  [trucks, tab, query]);

  const statusBreakdown = [
    { label: 'Active', value: trucks.filter((t) => t.status === 'Active').length, color: 'var(--tk-success)' },
    { label: 'On Trip', value: trucks.filter((t) => t.status === 'On Trip').length, color: 'var(--tk-blue)' },
    { label: 'In Maintenance', value: trucks.filter((t) => t.status === 'In Maintenance').length, color: 'var(--tk-warning)' },
    { label: 'Inactive', value: trucks.filter((t) => t.status === 'Inactive').length, color: 'var(--tk-danger)' },
  ];
  const typeBreakdown = [
    { label: 'Trucks (Head)', value: trucks.filter((t) => t.type === 'Truck (Head)').length },
    { label: 'Trailers', value: trucks.filter((t) => t.type === 'Trailer').length },
  ];

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader
        title="My Fleet"
        description="Manage your trucks, trailers, and other fleet assets."
        actions={<Button icon="plus" onClick={() => setAddOpen(true)}>Add Vehicle</Button>}
      />
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
        <StatCard icon="truck" label="Total Vehicles" value={trucks.length} />
        <StatCard icon="circle-check" tint="green" label="Active" value={trucks.filter((t) => ['Active', 'On Trip'].includes(t.status)).length} />
        <StatCard icon="wrench" tint="amber" label="In Maintenance" value={trucks.filter((t) => t.status === 'In Maintenance').length} />
        <StatCard icon="circle-off" tint="red" label="Inactive" value={trucks.filter((t) => t.status === 'Inactive').length} />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 'var(--tk-grid-gap)', alignItems: 'start' }}>
        <Card pad="none">
          <div style={{ display: 'flex', gap: 24, padding: '0 16px', borderBottom: '1px solid var(--tk-line)', overflowX: 'auto' }}>
            {VEHICLE_TABS.map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} style={{
                height: 46, border: 0, borderBottom: '2px solid ' + (tab === t ? 'var(--tk-blue)' : 'transparent'),
                background: 'transparent', color: tab === t ? 'var(--tk-blue)' : 'var(--tk-ink-400)',
                font: (tab === t ? 600 : 500) + ' 14px/1 var(--tk-font-sans)', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>{t} ({t === 'All Vehicles' ? trucks.length : trucks.filter((v) => typeGroup(v.type) === t).length})</button>
            ))}
          </div>
          <div style={{ padding: 14, borderBottom: '1px solid var(--tk-line)' }}>
            <SearchField placeholder="Search vehicles..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon="truck" title="No vehicles found" description="Try a different tab or search term." />
          ) : (
            <DataTable
              rows={filtered}
              rowKey={(t) => t.plate}
              onRowClick={(t) => navigate(`/fleet/${plateSlug(t.plate)}`)}
              columns={[
                { key: 'vehicle', header: 'Vehicle', render: (t) => <Link to={`/fleet/${plateSlug(t.plate)}`} onClick={(e) => e.stopPropagation()} style={{ display: 'block' }}><strong style={{ display: 'block', color: 'var(--tk-ink-900)' }}>{t.plate}</strong><span className="tk-meta">{t.makeModel}</span></Link> },
                { key: 'type', header: 'Type', render: (t) => t.type },
                { key: 'reg', header: 'Registration No.', render: (t) => t.plate },
                { key: 'status', header: 'Status', render: (t) => <Badge tone={t.status === 'Active' ? 'success' : t.status === 'On Trip' ? 'info' : t.status === 'In Maintenance' ? 'warning' : 'danger'} dot>{t.status}</Badge> },
                { key: 'driver', header: 'Driver', render: (t) => t.driver || '—' },
                { key: 'lastActive', header: 'Last Active', render: (t) => t.odometerUpdated },
              ]}
            />
          )}
        </Card>

        <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
          <Card style={{ display: 'grid', gap: 12 }}>
            <h3 className="tk-title" style={{ margin: 0 }}>Fleet Overview</h3>
            <div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
              <DonutChart size={150} thickness={20} data={statusBreakdown} centerValue={trucks.length} centerLabel="Vehicles" />
              <LegendList style={{ width: '100%' }} items={statusBreakdown} />
            </div>
          </Card>
          <Card style={{ display: 'grid', gap: 10 }}>
            <h3 className="tk-title" style={{ margin: 0 }}>Vehicle Types</h3>
            <LegendList showShare={false} items={typeBreakdown} />
          </Card>
          <Card style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="headphones" size={18} color="var(--tk-blue)" />
            <span>
              <strong style={{ display: 'block', font: '600 13px/18px var(--tk-font-sans)' }}>Need Help?</strong>
              <span className="tk-meta">For fleet management support, contact our team.</span>
              <Button variant="outline" size="sm" fullWidth style={{ marginTop: 10 }} onClick={() => navigate('/support')}>Contact Support</Button>
            </span>
          </Card>
        </div>
      </div>
      <AddVehicleModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

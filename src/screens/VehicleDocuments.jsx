'use client';

import { useMemo, useState } from 'react';
import { Badge, Button, Card, DataTable, DonutChart, EmptyState, Icon, SearchField, Select, SkeletonRow } from '../ds.js';
import { useFleetVehicle } from '../store/features/fleet/useFleetVehicle.js';
import { useGetFleetDocumentsQuery, useUploadFleetDocumentMutation } from '../store/features/fleet/fleetApi.js';
import { fleetDocumentSupported } from '../store/features/fleet/fleetContracts.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { VEHICLE_REQUIREMENTS, documentStatusTone } from '../domain/documents.js';
import { UploadDocumentModal } from '../components/DocumentCompliance.jsx';
import { Toast, useToast } from '../components/Toast.jsx';
import { VehicleDetailFrame } from './VehicleDetailFrame.jsx';


export function VehicleDocuments() {
  const { truck } = useFleetVehicle();
  const { currentData: documents, error, isLoading } = useGetFleetDocumentsQuery(truck?.id, { skip: !truck, refetchOnMountOrArgChange: true });
  const [uploadDocument] = useUploadFleetDocumentMutation();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Document Types');
  const [uploadType, setUploadType] = useState(null);
  const [toast, showToast] = useToast();

  const truckDocs = !error ? documents ?? [] : [];
  const types = useMemo(() => ['All Document Types', ...new Set(truckDocs.map((d) => d.type))], [truckDocs]);
  const filtered = truckDocs.filter((d) =>
    (typeFilter === 'All Document Types' || d.type === typeFilter)
    && (!query || [d.name, d.type].some((v) => v.toLowerCase().includes(query.toLowerCase()))));

  const completeStatuses = documents && !error && documents.every((doc) => ['Valid', 'Expiring Soon', 'Expired'].includes(doc.status));
  const summary = { total: !error ? documents?.length ?? '—' : '—', ...Object.fromEntries([['valid', 'Valid'], ['expiringSoon', 'Expiring Soon'], ['expired', 'Expired']].map(([key, status]) => [key, completeStatuses ? documents.filter((doc) => doc.status === status).length : '—'])) };
  const compliance = { rows: VEHICLE_REQUIREMENTS.map((req) => {
    const doc = truckDocs.find((item) => item.type === req.type);
    return { req, doc, status: doc?.status ?? (documents && !error && fleetDocumentSupported(req.type) ? 'Missing' : '—') };
  }), summary: { missing: '—', requiredMet: '—', requiredTotal: VEHICLE_REQUIREMENTS.filter((req) => req.required).length } };
  const missing = compliance.summary.missing;
  const chartData = completeStatuses ? [
    { label: 'Valid', value: summary.valid, color: 'var(--tk-success)' },
    { label: 'Expiring Soon', value: summary.expiringSoon, color: 'var(--tk-warning)' },
    { label: 'Expired', value: summary.expired, color: 'var(--tk-danger)' },
  ] : [];

  if (!truck) return <VehicleDetailFrame tab="documents" title="Vehicle not found" />;

  return (
    <VehicleDetailFrame
      tab="documents"
      title="Truck Documents"
      description="View and manage all documents for this truck. Documents are used for compliance and will be required for jobs."
      primaryAction={<Button icon="upload" onClick={() => setUploadType(VEHICLE_REQUIREMENTS[0].type)}>Upload Document</Button>}
      rail={
        <>
          <Card style={{ display: 'grid', gap: 12 }}>
            <h3 className="tk-title" style={{ margin: 0, fontSize: 14 }}>Document Compliance</h3>
            <div style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
              <DonutChart size={130} thickness={16}
                data={chartData}
                centerValue={summary.valid} centerLabel="Documents Valid" />
              <div style={{ display: 'grid', gap: 6, width: '100%' }}>
                {[['Valid', summary.valid, 'var(--tk-success)'], ['Expiring Soon', summary.expiringSoon, 'var(--tk-warning)'], ['Expired', summary.expired, 'var(--tk-danger)'], ['Missing', missing, 'var(--tk-ink-300)']].map(([label, value, color]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 13px/18px var(--tk-font-sans)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} /><span style={{ flex: 1, color: 'var(--tk-ink-500)' }}>{label}</span><strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <Card style={{ display: 'grid', gap: 10 }}>
            <h3 className="tk-title" style={{ margin: 0, fontSize: 14 }}>Required Documents</h3>
            <span className="tk-meta">{compliance.summary.requiredMet} of {compliance.summary.requiredTotal} required documents in place.</span>
            {compliance.rows.map(({ req, doc, status }) => {
              const tone = documentStatusTone(status);
              return (
                <button key={req.type} type="button" onClick={() => setUploadType(req.type)} title={doc ? 'Replace document' : 'Upload document'}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: 0, border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 13px/18px var(--tk-font-sans)', color: 'var(--tk-ink-700)' }}>
                    <Icon name={tone === 'success' ? 'circle-check' : 'circle-dot'} size={15} color={tone === 'success' ? 'var(--tk-success)' : tone === 'danger' ? 'var(--tk-danger)' : tone === 'warning' ? 'var(--tk-warning)' : 'var(--tk-ink-300)'} />
                    {req.label}{!req.required && <span className="tk-meta"> (optional)</span>}
                  </span>
                  <Badge tone={tone}>{status}</Badge>
                </button>
              );
            })}
          </Card>
          <Card style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="cloud-upload" size={18} color="var(--tk-blue)" />
            <span>
              <strong style={{ display: 'block', font: '600 13px/18px var(--tk-font-sans)' }}>Need to Update a Document?</strong>
              <span className="tk-meta">Upload the latest document version to keep your truck compliant and eligible for jobs.</span>
              <Button variant="outline" size="sm" fullWidth style={{ marginTop: 10 }} onClick={() => setUploadType(VEHICLE_REQUIREMENTS[0].type)}>Upload Document</Button>
            </span>
          </Card>
        </>
      }
    >
      <p style={{ margin: '0 0 14px', font: '400 13px/20px var(--tk-font-sans)', color: 'var(--tk-ink-400)' }}>
        These documents are required for compliance and may be requested by forwarders or during inspections.
      </p>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <SearchField style={{ flex: 1 }} placeholder="Search documents..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select value={typeFilter} options={types} onChange={(e) => setTypeFilter(e.target.value)} style={{ width: 200 }} />
      </div>
      {isLoading ? <SkeletonRow columns={6} /> : error ? <EmptyState icon="file-text" title={getApiErrorMessage(error)} /> : filtered.length === 0 ? (
        <EmptyState icon="file-text" title="No documents found" />
      ) : (
        <DataTable rows={filtered} rowKey={(d) => d.id} columns={[
          { key: 'name', header: 'Document Name', render: (d) => <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="file-text" size={14} color="var(--tk-danger)" />{d.name}</span> },
          { key: 'type', header: 'Type', render: (d) => d.type },
          { key: 'expiryDate', header: 'Expiry Date', render: (d) => d.expiryDate },
          { key: 'status', header: 'Status', render: (d) => <Badge tone={documentStatusTone(d.status)} dot>{d.status}</Badge> },
          { key: 'uploadedOn', header: 'Uploaded On', render: (d) => d.uploadedOn },
          { key: 'actions', header: 'Actions', render: (d) => (
            <span style={{ display: 'flex', gap: 6 }}>
              <Button size="sm" variant="outline" icon="eye" onClick={() => d.url ? window.open(d.url, '_blank', 'noopener,noreferrer') : showToast('The API did not return a document URL.')}>View</Button>
              {VEHICLE_REQUIREMENTS.some((r) => r.type === d.type) && <Button size="sm" variant="outline" icon="refresh-cw" onClick={() => setUploadType(d.type)}>Replace</Button>}
            </span>
          ) },
        ]} />
      )}
      <UploadDocumentModal
        open={!!uploadType} onClose={() => setUploadType(null)} ownerType="vehicle" ownerId={truck.id} ownerLabel={truck.plate}
        requirements={VEHICLE_REQUIREMENTS} initialType={uploadType}
        submitDocument={async (draft) => {
          try { return await uploadDocument({ truckId: truck.id, ...draft }).unwrap(); }
          catch (err) { throw new Error(getApiErrorMessage(err)); }
        }}
        onDone={(doc) => { setUploadType(null); showToast(`${doc.name} submitted for review.`); }}
      />
      <Toast message={toast} />
    </VehicleDetailFrame>
  );
}

'use client';

import { useState } from 'react';
import { useNavigate, useParams } from '../router.js';
import { Badge, Button, Card, LabelValue, Modal, PageHeader, TextField } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { updateDocument } from '../mock/api.js';
import { REQUIREMENTS_BY_OWNER, documentStatusTone, formatDisplayDate, ownerLink, statusFromExpiry } from '../domain/documents.js';

const OWNER_LABEL = { company: 'Company', vehicle: 'Vehicle', driver: 'Driver' };

export function DocumentDetail() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const documents = useCollection('documents') || [];
  const drivers = useCollection('drivers') || [];
  const company = useCollection('companyProfile')?.[0];
  const document_ = documents.find((d) => d.id === documentId);
  const [renewOpen, setRenewOpen] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');

  if (!document_) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title="Document not found" />
        <Button variant="outline" onClick={() => navigate('/documents')}>Back to Documents</Button>
      </div>
    );
  }

  const ownerType = document_.ownerType || 'vehicle';
  const ownerName = ownerType === 'driver' ? drivers.find((d) => d.id === document_.ownerId)?.name || document_.ownerId
    : ownerType === 'company' ? company?.name : document_.truckPlate || document_.ownerId;
  const requirement = (REQUIREMENTS_BY_OWNER[ownerType] || []).find((r) => r.type === document_.type);
  const canRenew = requirement?.expires || (document_.expiryDate && document_.expiryDate !== '—');

  async function renew() {
    if (!expiryDate) return;
    await updateDocument(document_.id, { expiryDate: formatDisplayDate(expiryDate), status: statusFromExpiry(expiryDate), uploadedOn: 'Just now' });
    setRenewOpen(false);
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader
        crumbs={[{ label: 'Documents', onClick: () => navigate('/documents') }, { label: ownerName, onClick: () => navigate(ownerLink(document_)) }, document_.name]}
        title={document_.name}
        description={`${requirement?.label || document_.type} · ${OWNER_LABEL[ownerType]}: ${ownerName}`}
        meta={<Badge tone={documentStatusTone(document_.status)} dot>{document_.status}</Badge>}
        actions={
          <>
            <Button variant="outline" icon="arrow-left" onClick={() => navigate(ownerLink(document_))}>Back to {OWNER_LABEL[ownerType]}</Button>
            {document_.url && <Button variant="outline" icon="eye" onClick={() => window.open(document_.url, '_blank', 'noopener')}>Open File</Button>}
            {canRenew && <Button icon="refresh-cw" onClick={() => setRenewOpen(true)}>Renew Document</Button>}
          </>
        }
      />
      <Card>
        <LabelValue label={OWNER_LABEL[ownerType]} value={ownerName} />
        <LabelValue label="Document Type" value={requirement?.label || document_.type} />
        {document_.number && <LabelValue label={requirement?.number || 'Number'} value={document_.number} />}
        <LabelValue label="Expiry Date" value={document_.expiryDate || '—'} />
        <LabelValue label="Uploaded On" value={document_.uploadedOn} />
        <LabelValue label="File Size" value={document_.fileSize} />
        <LabelValue label="Requirement" value={requirement ? (requirement.required ? 'Required' : 'Optional') : 'Other'} />
      </Card>
      <Modal open={renewOpen} onClose={() => setRenewOpen(false)} title="Renew Document" width={420}
        footer={<><Button variant="outline" onClick={() => setRenewOpen(false)}>Cancel</Button><Button onClick={renew}>Save</Button></>}>
        <TextField label="New Expiry Date" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
      </Modal>
    </div>
  );
}

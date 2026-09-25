'use client';

import { useState } from 'react';
import { useNavigate, useParams } from '../router.js';
import { Badge, Button, Card, LabelValue, Modal, PageHeader, TextField } from '../ds.js';
import { useCollection } from '../mock/useCollection.js';
import { updateDocument } from '../mock/api.js';
import { documentStatusTone } from '../domain/documents.js';

export function DocumentDetail() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const documents = useCollection('documents') || [];
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

  async function renew() {
    if (!expiryDate) return;
    await updateDocument(document_.id, { expiryDate, status: 'Valid', uploadedOn: 'Just now' });
    setRenewOpen(false);
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader
        crumbs={[{ label: 'Documents', onClick: () => navigate('/documents') }, document_.name]}
        title={document_.name}
        description={`${document_.type} · ${document_.truckPlate}`}
        meta={<Badge tone={documentStatusTone(document_.status)} dot>{document_.status}</Badge>}
        actions={<Button icon="refresh-cw" onClick={() => setRenewOpen(true)}>Renew Document</Button>}
      />
      <Card>
        <LabelValue label="Vehicle" value={document_.truckPlate} />
        <LabelValue label="Document Type" value={document_.type} />
        <LabelValue label="Expiry Date" value={document_.expiryDate} />
        <LabelValue label="Uploaded On" value={document_.uploadedOn} />
        <LabelValue label="File Size" value={document_.fileSize} />
      </Card>
      <Modal open={renewOpen} onClose={() => setRenewOpen(false)} title="Renew Document" width={420}
        footer={<><Button variant="outline" onClick={() => setRenewOpen(false)}>Cancel</Button><Button onClick={renew}>Save</Button></>}>
        <TextField label="New Expiry Date" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
      </Modal>
    </div>
  );
}

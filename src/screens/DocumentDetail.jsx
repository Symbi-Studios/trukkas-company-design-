'use client';

import { useRef, useState } from 'react';
import { useNavigate, useParams } from '../router.js';
import { Badge, Button, Card, EmptyState, LabelValue, Modal, PageHeader, SkeletonRow, TextField } from '../ds.js';
import { useGetDocumentCompanyQuery, useGetDocumentDetailQuery, useRenewComplianceDocumentMutation } from '../store/features/documents/documentsApi.js';
import { COMPANY_DOCUMENT_REQUIREMENTS, validDate } from '../store/features/documents/documentContracts.js';
import { getApiErrorMessage } from '../store/api/getApiErrorMessage.js';
import { REQUIREMENTS_BY_OWNER, documentStatusTone } from '../domain/documents.js';
import { documentOwnerHref } from '../domain/documentLinks.js';

const OWNER_LABEL = { company: 'Company', vehicle: 'Vehicle', driver: 'Driver' };

export function DocumentDetail({ documentId: queryId, ownerType: queryOwnerType = '', ownerId = '' } = {}) {
  const { documentId: routeId } = useParams();
  const documentId = queryId ?? routeId;
  const navigate = useNavigate();
  const { currentData: document_, error, isLoading } = useGetDocumentDetailQuery({ id: documentId, ownerType: queryOwnerType, ownerId }, { skip: !documentId, refetchOnMountOrArgChange: true });
  const { currentData: company } = useGetDocumentCompanyQuery(undefined, { skip: document_?.ownerType !== 'company' });
  const [renewDocument, { isLoading: renewing }] = useRenewComplianceDocumentMutation();
  const saving = useRef(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [renewError, setRenewError] = useState('');

  if (isLoading) return <SkeletonRow variant="detail" />;
  if (error) return <EmptyState icon="file-text" title={getApiErrorMessage(error)} action={<Button variant="outline" onClick={() => navigate('/documents')}>Back to Documents</Button>} />;

  if (!document_) {
    return (
      <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
        <PageHeader title="Document not found" />
        <Button variant="outline" onClick={() => navigate('/documents')}>Back to Documents</Button>
      </div>
    );
  }

  const ownerType = document_.ownerType;
  const ownerName = ownerType === 'company' ? company?.name ?? '—' : document_.truckPlate ?? '—';
  const requirement = (ownerType === 'company' ? COMPANY_DOCUMENT_REQUIREMENTS : REQUIREMENTS_BY_OWNER[ownerType] || []).find((r) => r.type === document_.type);
  const canRenew = requirement?.expires || (document_.expiryDate && document_.expiryDate !== '—');

  async function renew() {
    if (saving.current) return;
    if (!validDate(expiryDate)) { setRenewError('Enter a valid expiry date.'); return; }
    saving.current = true; setRenewError('');
    try { await renewDocument({ id: document_.id, ownerType, ownerId: document_.ownerId, expiryDate }).unwrap(); setRenewOpen(false); }
    catch (error) { setRenewError(getApiErrorMessage(error)); }
    finally { saving.current = false; }
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--tk-grid-gap)' }}>
      <PageHeader
        crumbs={[{ label: 'Documents', onClick: () => navigate('/documents') }, { label: ownerName, onClick: () => navigate(documentOwnerHref(document_)) }, document_.name]}
        title={document_.name}
        description={`${requirement?.label || document_.type} · ${OWNER_LABEL[ownerType]}: ${ownerName}`}
        meta={<Badge tone={documentStatusTone(document_.status)} dot>{document_.status}</Badge>}
        actions={
          <>
            <Button variant="outline" icon="arrow-left" onClick={() => navigate(documentOwnerHref(document_))}>Back to {OWNER_LABEL[ownerType]}</Button>
            {document_.url && <Button variant="outline" icon="eye" onClick={() => window.open(document_.url, '_blank', 'noopener,noreferrer')}>Open File</Button>}
            {canRenew && <Button icon="refresh-cw" onClick={() => { setRenewError(''); setRenewOpen(true); }}>Renew Document</Button>}
          </>
        }
      />
      <Card>
        <LabelValue label={OWNER_LABEL[ownerType]} value={ownerName} />
        <LabelValue label="Document Type" value={requirement?.label || document_.type} />
        {(requirement?.number || document_.number && document_.number !== '—') && <LabelValue label={requirement?.number || 'Number'} value={document_.number ?? '—'} />}
        <LabelValue label="Expiry Date" value={document_.expiryDate || '—'} />
        <LabelValue label="Uploaded On" value={document_.uploadedOn} />
        <LabelValue label="File Size" value={document_.fileSize} />
        <LabelValue label="Requirement" value={requirement ? (requirement.required ? 'Required' : 'Optional') : 'Other'} />
      </Card>
      <Modal open={renewOpen} onClose={() => { if (!saving.current) setRenewOpen(false); }} title="Renew Document" width={420}
        footer={<><Button variant="outline" disabled={renewing} onClick={() => setRenewOpen(false)}>Cancel</Button><Button disabled={renewing || !validDate(expiryDate)} onClick={renew}>Save</Button></>}>
        <TextField label="New Expiry Date" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        {renewError && <span className="tk-meta" style={{ color: 'var(--tk-danger)' }}>{renewError}</span>}
      </Modal>
    </div>
  );
}

'use client';

import { useSearchParams } from 'next/navigation';
import { DocumentDetail } from './DocumentDetail.jsx';

export function DocumentDetailFromQuery() {
  const params = useSearchParams();
  const single = (key) => { const values = params.getAll(key); return values.length === 1 ? values[0].trim() : ''; };
  const documentId = single('documentId'), ownerType = single('ownerType'), ownerId = single('ownerId');
  return <DocumentDetail key={`${ownerType}:${ownerId}:${documentId}`} documentId={documentId} ownerType={ownerType} ownerId={ownerId} />;
}

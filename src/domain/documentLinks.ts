import { fleetDetailHref } from './fleetLinks';
import { driverDetailHref } from './driverLinks';

interface DocumentLink { id: string; ownerType: string; ownerId: string; }

export function documentDetailHref(doc: DocumentLink) {
  const params = new URLSearchParams({ documentId: doc.id });
  if (['company', 'vehicle', 'driver'].includes(doc.ownerType)) params.set('ownerType', doc.ownerType);
  if (doc.ownerId) params.set('ownerId', doc.ownerId);
  return `/documents/detail?${params.toString()}`;
}
export function documentOwnerHref(doc: DocumentLink) {
  if (doc.ownerType === 'vehicle') return fleetDetailHref(doc.ownerId, 'documents');
  if (doc.ownerType === 'driver') return driverDetailHref(doc.ownerId);
  return '/documents';
}

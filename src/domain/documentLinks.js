import { fleetDetailHref } from './fleetLinks.js';
import { driverDetailHref } from './driverLinks.js';

export function documentDetailHref(doc) {
  const params = new URLSearchParams({ documentId: doc.id });
  if (['company', 'vehicle', 'driver'].includes(doc.ownerType)) params.set('ownerType', doc.ownerType);
  if (doc.ownerId) params.set('ownerId', doc.ownerId);
  return `/documents/detail?${params.toString()}`;
}
export function documentOwnerHref(doc) {
  if (doc.ownerType === 'vehicle') return fleetDetailHref(doc.ownerId, 'documents');
  if (doc.ownerType === 'driver') return driverDetailHref(doc.ownerId);
  return '/documents';
}

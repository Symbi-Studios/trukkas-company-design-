// Registration plates contain spaces ("LSD 123 XY"), which `next dev` can't
// reliably match as a raw dynamic route segment under `output: export`
// (it works in `next build`, but not the dev server). Route on a dash-slug
// instead and resolve back to the plate for lookups.
export function plateSlug(plate) {
  return plate.replace(/\s+/g, '-');
}

export function findTruckBySlug(trucks, slug) {
  return trucks.find((t) => plateSlug(t.plate) === slug);
}

export const VEHICLE_CLASSES = [
  { value: 'Head', label: 'Trucks (Head)', icon: 'truck' },
  { value: 'Trailer', label: 'Trailers', icon: 'container' },
  { value: 'Tanker', label: 'Tankers', icon: 'fuel' },
  { value: 'Specialized', label: 'Specialized', icon: 'wrench' },
  { value: 'Other', label: 'Others', icon: 'ellipsis' },
];

export function vehicleStatusTone(status) {
  if (status === 'Active') return 'success';
  if (status === 'On Trip') return 'info';
  if (status === 'In Maintenance') return 'warning';
  return 'danger';
}

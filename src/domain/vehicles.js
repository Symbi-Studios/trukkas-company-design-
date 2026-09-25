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

// Approximate coordinates for the places our fixtures use, so route maps can
// frame a real OpenStreetMap view. A live backend should send coordinates
// (and GPS positions for trips) instead of relying on this lookup.
const PLACES = [
  ['apapa', [6.4474, 3.3614]],
  ['tin can', [6.438, 3.347]],
  ['onne', [4.7236, 7.1515]],
  ['ewekoro', [6.9333, 3.2167]],
  ['ibadan', [7.3775, 3.947]],
  ['kano', [12.0022, 8.592]],
  ['port harcourt', [4.8156, 7.0498]],
  ['aba', [5.1066, 7.3667]],
  ['warri', [5.5167, 5.75]],
  ['sokoto', [13.0059, 5.2476]],
  ['ilorin', [8.4966, 4.5421]],
  ['benin', [6.335, 5.6037]],
  ['kaduna', [10.5105, 7.4165]],
  ['abuja', [9.0765, 7.3986]],
  ['onitsha', [6.1413, 6.8029]],
  ['calabar', [4.9757, 8.3417]],
  ['zaria', [11.0855, 7.7199]],
  ['lagos', [6.5244, 3.3792]],
];

export function coordsFor(location = '') {
  const text = location.toLowerCase();
  return PLACES.find(([key]) => text.includes(key))?.[1] || null;
}

/** Straight-line estimate of where a truck is, from trip progress. */
export function positionAlong(origin, destination, progress = 0) {
  const a = coordsFor(origin);
  const b = coordsFor(destination);
  if (!a || !b) return a || b;
  const t = Math.max(0, Math.min(1, progress / 100));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export function osmEmbedUrl(origin, destination, marker) {
  const a = coordsFor(origin);
  const b = coordsFor(destination) || a;
  if (!a) return null;
  const pad = 0.8;
  const bbox = [
    Math.min(a[1], b[1]) - pad, Math.min(a[0], b[0]) - pad,
    Math.max(a[1], b[1]) + pad, Math.max(a[0], b[0]) + pad,
  ].map((n) => n.toFixed(4)).join(',');
  const pin = marker || b;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${pin[0].toFixed(4)},${pin[1].toFixed(4)}`;
}

export function osmDirectionsUrl(origin, destination) {
  const a = coordsFor(origin);
  const b = coordsFor(destination);
  if (!a || !b) return 'https://www.openstreetmap.org';
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${a[0]},${a[1]};${b[0]},${b[1]}`;
}

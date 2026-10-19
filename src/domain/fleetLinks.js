const sections = ['overview', 'documents', 'maintenance', 'trips', 'costs', 'activity'];
export function fleetDetailHref(id, section = 'overview') {
  const tab = sections.includes(section) ? section : 'overview';
  return `/fleet/detail?vehicleId=${encodeURIComponent(id)}${tab === 'overview' ? '' : `&section=${tab}`}`;
}

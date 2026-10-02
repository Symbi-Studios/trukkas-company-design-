// Workspace-wide search behind the top-bar dropdown: matches the typed text
// against jobs, trips, vehicles, drivers and payouts and returns a few hits per
// group, each with the page it opens.
import { jobTitle } from './jobs.js';
import { shortPlace } from './trips.js';
import { plateSlug } from './vehicles.js';

const route = (job) => (job ? `${shortPlace(job.origin)} → ${shortPlace(job.destination)}` : '');

export function searchWorkspace(query, { jobs = [], trips = [], trucks = [], drivers = [], payouts = [] }, perGroup = 4) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hit = (...values) => values.some((v) => String(v ?? '').toLowerCase().includes(q));
  const jobById = new Map(jobs.map((job) => [job.id, job]));

  const groups = [
    {
      section: 'Jobs',
      items: jobs
        .filter((job) => hit(job.id, jobTitle(job), job.cargoType, job.origin, job.destination))
        .map((job) => ({ key: job.id, icon: 'briefcase', label: jobTitle(job), meta: `${job.id} · ${route(job)}`, tag: job.status === 'Quoted' ? 'Bid Placed' : job.status, to: `/jobs/${job.id}` })),
    },
    {
      section: 'Trips',
      items: trips
        .filter((trip) => hit(trip.id, trip.jobId, trip.truckPlate, trip.driverName, route(jobById.get(trip.jobId))))
        .map((trip) => ({ key: trip.id, icon: 'route', label: trip.id, meta: [route(jobById.get(trip.jobId)), trip.truckPlate, trip.driverName].filter(Boolean).join(' · '), tag: trip.status, to: `/trips/${trip.id}` })),
    },
    {
      section: 'Vehicles',
      items: trucks
        .filter((truck) => hit(truck.plate, truck.makeModel, truck.type, truck.vin))
        .map((truck) => ({ key: truck.plate, icon: 'truck', label: truck.plate, meta: [truck.makeModel, truck.type].filter(Boolean).join(' · '), tag: truck.status, to: `/fleet/${plateSlug(truck.plate)}` })),
    },
    {
      section: 'Drivers',
      items: drivers
        .filter((driver) => hit(driver.name, driver.phone, driver.licenseNumber, driver.truckPlate))
        .map((driver) => ({ key: driver.id, icon: 'user-round', label: driver.name, meta: [driver.licenseNumber, driver.truckPlate].filter(Boolean).join(' · '), tag: driver.status, to: `/drivers/${driver.id}` })),
    },
    {
      section: 'Payouts',
      items: payouts
        .filter((payout) => hit(payout.id, payout.reference, payout.tripId, payout.jobId))
        .map((payout) => ({ key: payout.id, icon: 'banknote', label: payout.id, meta: [payout.tripId, payout.reference].filter(Boolean).join(' · '), tag: payout.status, to: `/payouts/${payout.id}` })),
    },
  ];
  return groups
    .filter((group) => group.items.length > 0)
    .map((group) => ({ section: group.section, total: group.items.length, items: group.items.slice(0, perGroup) }));
}

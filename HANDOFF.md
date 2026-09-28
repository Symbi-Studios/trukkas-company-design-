# Trukkas company dashboard — handoff notes

This app is the **trucking-company-facing** Trukkas dashboard: a fleet manager /
company admin signs in to their own company's account to browse and bid on job
requests, track trips, manage their own fleet/drivers/maintenance/documents, and
view earnings, payouts, ratings, notifications, and support. It replaced an earlier
internal admin console that used to live in this repo — if you find a stray
reference to "admin console", "Trukkas Admin", or platform-wide admin concepts
(verification queues, fee rules, roles/permissions, other companies' data), it's
leftover from that prior app and should be treated as a bug, not intentional scope.

It's real Next.js App Router code you can click through — routing, filtering, and
most write actions actually mutate state — but it is **not** wired to a real
backend yet. See "Mock data contract" below before changing that.

## Running it

```
npm install
npm run dev        # http://localhost:3000
npm run build       # static export (output: 'export') to out/
```

Sign in with the seeded mock account — see `src/mock/fixtures/account.js` for the
email/password (`MOCK_CREDENTIALS`).

## Architecture at a glance

- **Framework**: Next.js 16 App Router, `output: 'export'` (static client deployment
  — no server runtime, no API routes, no middleware). Auth gating is done entirely
  client-side in `src/App.jsx` (`CompanyShell`), which redirects to `/login` when
  `state.auth.account` is empty.
- **Routing pattern**: most top-level nav destinations (`dashboard`, `jobs`,
  `trips`, `fleet`, …) don't have their own `page.jsx`. They're served by the catch-all
  `src/app/[screen]/page.jsx`, which renders `<ScreenRouter screen={screen} />`
  (`src/ScreenRouter.jsx` — an `id -> component` map) and gets its static params
  from `src/staticParams.js` (driven by `src/nav.js`'s `NAV` array). Detail routes
  (`jobs/[jobId]`, `trips/[tripId]`, `fleet/[vehicleId]`, `drivers/[driverId]`, `documents/[documentId]`,
  `payouts/[payoutId]`, `notifications/[notificationId]`, `support/[ticketId]`) each
  get a real literal `page.jsx` that imports one screen component directly and calls
  `generateStaticParams()`/`generateMetadata()`.
- **Adding a new top-level nav item**: add it to `NAV` in `src/nav.js`, add its
  screen component to the `screens` map in `src/ScreenRouter.jsx`, and (only if it
  needs its own detail route) add a route folder + entry in `staticParamsFor`.
- **Vehicle detail sub-pages are real nested routes, not in-page tab state.**
  `fleet/[vehicleId]/{documents,maintenance,trips-history,costs,activity}` are each
  their own route + screen (`VehicleDocuments.jsx`, `VehicleMaintenance.jsx`, etc.),
  sharing chrome (truck summary card, tabs, "Need Help" rail card) via
  `VehicleDetailFrame.jsx`. Its `Tabs` `onChange` navigates to the tab's route rather
  than flipping local state — add a new vehicle tab by adding an entry to `TABS` in
  `VehicleDetailFrame.jsx`, a matching screen, and a route folder.
- **Jobs vs trips.** A *job* is the forwarder's booking (`/jobs` marketplace,
  `/jobs/[jobId]` for bidding and, once won, truck dispatch). A *trip* is one truck +
  driver carrying out that job (`/trips`, `/trips/[tripId]`). One job can have many
  trips: `job.trucksRequired` says how many trucks were booked, and each dispatch
  (`assignTruckToJob`) creates one trip row linked by `trip.jobId`. Trip detail tabs
  are real routes too: `/trips/[tripId]` is Overview and
  `/trips/[tripId]/[section]` covers `timeline|documents|costs|notes|communication`
  (static params from `tripSectionParams()` in `src/staticParams.js`), all rendered
  by `TripDetail.jsx` with a `section` prop.
- **Vehicle routing quirk**: registration plates contain spaces ("LSD 123 XY"),
  which `next build` handles fine as a dynamic segment but `next dev` cannot
  reliably match at runtime under `output: export`. Fleet routes on a dash-slug
  instead (`plateSlug()`/`findTruckBySlug()` in `src/domain/vehicles.js`) — link to
  `/fleet/${plateSlug(truck.plate)}`, never the raw plate.
- **Design system**: `src/ds.js` is the barrel — import components from there, not
  from `src/ds/components/...` directly. Source of truth lives under `src/ds/`
  (`components/`, `tokens/`, `assets/`). `MapPanel` ships chrome only, not a real
  map — don't fake one with hand-drawn SVG. `src/components/RouteMap.jsx` fills it
  with an OpenStreetMap embed framed from approximate city coordinates in
  `src/domain/geo.js`; the truck marker is interpolated from trip progress until
  the API supplies GPS positions.
- **Router shim**: screens import `Link`/`useNavigate`/`useParams` from
  `src/router.js`, a thin wrapper over `next/link`/`next/navigation`. Use it (not
  `next/navigation` directly) so screen code stays consistent.

## Mock data contract

`src/mock/api.js` exports async, id-keyed functions shaped like real network calls
(`placeBid(jobId, amount, message)`, `assignTruckToJob(jobId, plate, driverId)` →
new trip, `updateTripStatus(tripId, status)`, `cancelTrip(tripId)`,
`reportTripIssue(tripId, issue)`, `requestWithdrawal(amount)`, etc). Jobs and trips
are separate collections (`jobs`, `trips`); `budget`/`myBid.amount` are per truck,
and a job flips to Completed once `trucksRequired` of its trips are completed.
Assigning a trip reserves the truck/driver; they go "On Trip" at pickup and are
freed on completion or cancellation. Each reads/
writes an in-memory store (`src/mock/db.js`) and resolves after a short artificial
delay. Screens read live data via `useCollection(domain)` (`src/mock/useCollection.js`,
a `useSyncExternalStore` hook) — that hook has no opinion on where the data comes
from, so swapping the backing store doesn't require touching it.

To wire a real backend for a domain:

1. Verify the real endpoint's schema, pagination, enums, and status transitions
   against the live API spec first — don't guess from the fixture shapes (see
   AGENTS.md, "Backend API reference and integration"). This app currently has no
   confirmed company-facing endpoints wired; `src/store/features/auth/authApi.js`
   is mock-gated for the same reason (no verified `/auth/*` login endpoint yet).
2. Add endpoints under `src/store/features/<domain>/` with `baseApi.injectEndpoints`
   (see `authApi.js` for the shape, even though its own bodies are mock `queryFn`s
   rather than real `query` calls), adapting the response DTO to the screen's
   existing view model at the API boundary.
3. Replace the screen's `useCollection('domain')` call with the generated RTK Query
   hook, keeping the same field names the screen already reads so the JSX doesn't
   need to change.
4. Once every consumer of a mock domain is migrated, remove its `seed(...)` call
   and fixture from `src/mock/api.js` / `src/mock/fixtures/`.

`src/domain/{jobs,trips,drivers,geo,documents,payouts,vehicles}.js` are pure helper functions (status
tone mapping, trip stage helpers, document compliance summaries) with no
mock-vs-real opinion — keep using them after a domain moves to a real API.

### Documents, drivers, payouts and support (contracts)

- **Documents are owned, not free-floating.** Every row in `documents` has
  `ownerType` (`company` | `vehicle` | `driver`) and `ownerId` (company id, plate, or
  driver id). What each owner must provide is defined once in `src/domain/documents.js`
  (`COMPANY_REQUIREMENTS` — CAC certificate, CAC status report, TIN, front person's
  NIN/BVN/ID, proof of address, bank letter; `VEHICLE_REQUIREMENTS`;
  `DRIVER_REQUIREMENTS`) and checked with `complianceFor()`. NIN/BVN are stored
  masked (last 4 digits). Job/trip paperwork is **not** in `documents`; it lives on
  `jobs[].documents` / `trips[].documents` and is shown on the job page.
  The requirement lists are a product assumption — confirm them with Trukkas ops.
- **Driver ↔ truck assignment** goes through `assignDriverToTruck(plate, driverId|null)`,
  which keeps `trucks.driverId` and `drivers.truckPlate` in sync, unassigns the
  driver from any previous truck, and refuses while either side is on an open trip.
- **Adding a vehicle** is the `/fleet/new` wizard → `addTruck(truck, { documents, photos, driverId })`.
- **Payouts** cover one or more completed trips (`items: [{ tripId, jobId, gross }]`);
  `amount` is net of `SERVICE_FEE_RATE` (5%, a prototype assumption). Eligible trips
  are completed trips not in a non-failed payout (`eligibleTrips()`); request with
  `requestPayout(tripIds, 'Bank' | 'Wallet')`. Payout and per-job earnings receipts
  share one view model (`payoutReceipt()` / `jobReceipt()`), rendered on screen by
  `Receipt.jsx` and downloaded as a PDF by `components/receiptPdf.js` (no dependency;
  Helvetica only, so "₦" prints as "NGN").
- **Support attachments**: ticket messages carry `attachments: [{ name, size, type, url }]`.
  Uploads in this prototype stay in the browser as object URLs — a real backend needs
  an upload endpoint, size/type validation server-side, and malware scanning.
- **Mock-created records and static export**: vehicles/trips created at runtime work
  with client-side navigation, but have no pre-rendered page in a static build, so a
  hard refresh on their URL 404s (and the in-memory store re-seeds anyway).

## Screen coverage

Every nav destination in `src/nav.js` has a bespoke screen — there's no
`ScreenPlaceholder` fallback destination left, but the component still exists
(`src/screens/ScreenPlaceholder.jsx`) as an honest stand-in for anything added to
`NAV` without a screen yet.

## Known gaps (not fixed, by design for this pass)

- **No live backend.** Every screen is mock-data-backed; login is mock-gated.
- **No loading/error states beyond the basics.** The mock API never rejects except
  for a handful of deliberate validation errors (e.g. `placeBid` on a non-Pending
  job). A real integration needs to handle latency, failures, empty results, and
  permission errors.
- **No persistence across a hard reload.** The mock store is in-memory only.
  Client-side navigation keeps state; a hard refresh re-seeds from fixtures.
- **No live GPS or cargo photos.** Route maps use approximate coordinates and an
  interpolated marker; job/trip imagery is a tinted category tile
  (`src/components/CargoThumb.jsx`) until uploads exist.
- **Company switcher is single-company for now.** `CompanySwitcher` (in
  `src/App.jsx`) is wired for multiple companies per account, but the seeded
  account only belongs to one (`src/mock/fixtures/account.js`), so the dropdown
  has nothing to switch between yet.
- **No tests.**

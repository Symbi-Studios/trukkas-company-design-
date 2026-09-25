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
- **Routing pattern**: most top-level nav destinations (`dashboard`, `jobs-trips`,
  `fleet`, …) don't have their own `page.jsx`. They're served by the catch-all
  `src/app/[screen]/page.jsx`, which renders `<ScreenRouter screen={screen} />`
  (`src/ScreenRouter.jsx` — an `id -> component` map) and gets its static params
  from `src/staticParams.js` (driven by `src/nav.js`'s `NAV` array). Detail routes
  (`jobs-trips/[jobId]`, `fleet/[vehicleId]`, `drivers/[driverId]`, `documents/[documentId]`,
  `payouts/[payoutId]`, `notifications/[notificationId]`, `support/[ticketId]`) each
  get a real literal `page.jsx` that imports one screen component directly and calls
  `generateStaticParams()`/`generateMetadata()`.
- **Adding a new top-level nav item**: add it to `NAV` in `src/nav.js`, add its
  screen component to the `screens` map in `src/ScreenRouter.jsx`, and (only if it
  needs its own detail route) add a route folder + entry in `staticParamsFor`.
- **Vehicle routing quirk**: registration plates contain spaces ("LSD 123 XY"),
  which `next build` handles fine as a dynamic segment but `next dev` cannot
  reliably match at runtime under `output: export`. Fleet routes on a dash-slug
  instead (`plateSlug()`/`findTruckBySlug()` in `src/domain/vehicles.js`) — link to
  `/fleet/${plateSlug(truck.plate)}`, never the raw plate.
- **Design system**: `src/ds.js` is the barrel — import components from there, not
  from `src/ds/components/...` directly. Source of truth lives under `src/ds/`
  (`components/`, `tokens/`, `assets/`). `MapPanel` ships chrome only, not a real
  map — don't fake one with hand-drawn SVG; either wire a real tile provider or
  show a text summary instead (see `VehicleDetail.jsx`'s trip location handling for
  the latter).
- **Router shim**: screens import `Link`/`useNavigate`/`useParams` from
  `src/router.js`, a thin wrapper over `next/link`/`next/navigation`. Use it (not
  `next/navigation` directly) so screen code stays consistent.

## Mock data contract

`src/mock/api.js` exports async, id-keyed functions shaped like real network calls
(`placeBid(jobId, amount, message)`, `assignTruckToJob(jobId, plate, driverId)`,
`updateTripStatus(jobId, status)`, `requestWithdrawal(amount)`, etc). Each reads/
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

`src/domain/{jobs,documents,payouts,vehicles}.js` are pure helper functions (status
tone mapping, trip stage helpers, document compliance summaries) with no
mock-vs-real opinion — keep using them after a domain moves to a real API.

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
- **No real map.** `VehicleDetail`/`JobDetail` show location as text, not a map —
  see the `MapPanel` note above.
- **Company switcher is single-company for now.** `CompanySwitcher` (in
  `src/App.jsx`) is wired for multiple companies per account, but the seeded
  account only belongs to one (`src/mock/fixtures/account.js`), so the dropdown
  has nothing to switch between yet.
- **No tests.**

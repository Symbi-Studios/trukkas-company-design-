<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Trukkas company dashboard project instructions

## Project structure and runtime

- This repository is a JavaScript/JSX dashboard for **trucking-company clients** (fleet managers / company admins managing their own company's jobs, fleet, drivers, and finances), built with Next.js 16.3.4, React 18, and the App Router, with TypeScript/TSX enabled for gradual adoption. Routes live in `src/app/`; the shared shell is `CompanyShell` in `src/App.jsx`; screen components are in `src/screens/`. This app previously held an internal Trukkas admin console covering other companies' data, platform config, and compliance review — that scope is retired; see HANDOFF.md for what replaced it.
- `tsconfig.json` enables `allowJs` and leaves existing JavaScript unchecked (`checkJs: false`); TypeScript files use strict checking. Keep existing modules in JavaScript unless a task benefits from typed contracts or components, and allow `.tsx` files to import existing `.jsx` modules.
- Shared UI components and design tokens are under `src/ds/`. Reuse those components, tokens, and established screen patterns before adding new dependencies or one-off styles.
- `next.config.mjs` sets `output: 'export'`. Treat the app as a static client deployment: there is no deployed Next.js server runtime for API proxying, server actions, or route handlers. Preserve static export unless a task explicitly calls for an architecture change.
- Use `package.json` as the source of truth for available commands. Current scripts are `npm run dev`, `npm run build`, and `npm run audit:responsive`.
- `HANDOFF.md` has useful mock-data contracts and design gotchas, but some of its opening framework, routing, and command notes are stale. Verify those details against `package.json` and the current source.

## Current data architecture

- `src/mock/api.js` is the async data-action layer. It currently reads and updates the in-memory store in `src/mock/db.js`, seeded from `src/mock/fixtures/`.
- Screens subscribe to collections through `src/mock/useCollection.js`. Pure domain rules live under `src/domain/`.
- Keep the prototype working while integrating incrementally. For an API-backed feature, add endpoints with `baseApi.injectEndpoints(...)` in `src/store/features/<feature>/`, adapt API response DTOs to the screen's existing view model there, and handle loading, empty, error, and permission states in the UI. Components use generated RTK Query hooks; do not scatter raw `fetch` calls or wire-format assumptions across screens.
- API integration must fit the existing UI and user flow. Do not change screens, layouts, copy, or interactions to match an API's schema or behavior unless the user explicitly asks for UI changes; adapt API data at the API boundary instead.
- Retain mock-backed screens and fixtures that have not been migrated. Remove the mock store only as part of an explicitly requested complete cutover after checking all consumers.
- Redux Toolkit configuration lives in `src/store/store.js`, the client provider in `src/store/StoreProvider.jsx`, and shared RTK Query transport and refresh logic in `src/store/api/baseApi.js`. Add each API domain under `src/store/features/` using the same injected-endpoint pattern. Use `builder.query` for reads and `builder.mutation` for writes.
- The shared API transport logs sanitized request and response bodies in development by default. Set `NEXT_PUBLIC_API_LOGGING=false` to disable development logs; production logging is always disabled. Keep secret and personal-data redaction in place when extending the logger.

## Backend API reference and integration

- The live OpenAPI/Swagger reference is [Trukkas API docs](https://trukkas-backend.onrender.com/api/docs#/). It describes a versioned `/api/v1` API, including separate `/api/v1/admin/*` and non-admin `/api/v1/auth/*` routes. This app is a non-admin, company-facing client — confirm the actual company/operator-facing routes (auth, jobs, fleet, trips, payouts, etc.) against the live spec before wiring any of them; do not assume the retired admin routes have non-admin equivalents at matching paths.
- `src/store/features/auth/authApi.js` is currently **mock-gated** (see its own comment) because no company-facing auth endpoint has been verified yet — it does not call the live API. Wire it to a real endpoint only after confirming schema, pagination, error, and CORS details from the current spec and backend behavior; keep the existing `authSlice`/`baseApi` refresh-and-redaction mechanics, only the endpoint bodies need to change.
- Preserve every documented authorization boundary once real endpoints are wired. UI visibility is not security enforcement, so the backend remains authoritative.
- For integrations, verify request/response schemas, IDs, enums and status transitions, filtering and pagination, date/time and currency units, upload behavior, and error/status-code handling against the live spec. Avoid guessing from fixture shapes; map wire data at the API boundary.
- Do not send development or verification writes to production endpoints. Use a confirmed development/staging environment or mocks for write flows, especially approval, payout, payment, account, and deletion actions. Never exercise real user data or credentials as test data.

## Configuration and security

- The current static export means browser code, built assets, and public environment variables are visible to users. A public API base URL may be configured as client-side environment data; never put passwords, signing keys, service credentials, or other secrets in source, fixtures, browser storage, or any `NEXT_PUBLIC_*` variable.
- Check backend CORS settings for the deployed frontend origin. If an integration requires a server-held secret or server-side session, resolve the hosting/runtime architecture explicitly before changing static export or exposing credentials.
- Auth state is in `src/store/features/auth/authSlice.js` and is restored from the guarded `trukkas-company-auth` localStorage entry so a browser refresh keeps the session. Store only `account`, `activeCompanyId`, `accessToken`, and `refreshToken` there; never store passwords, reset tokens, credentials, or other secrets. `baseApi.js` attaches the bearer token, performs a single shared refresh when needed, preserves the current refresh token when the backend returns only a new access token, and clears a terminally expired session from Redux and storage; `StoreProvider.jsx` schedules a refresh before a parseable JWT expiry. Never log tokens, credentials, or personal data. Treat client-side role checks as presentation only; enforce access on the server.
- Avoid automatic retries for non-idempotent writes unless the API documents an idempotency mechanism.

## Editing and validation

- Preserve existing route conventions, responsive behavior, design-system usage, and the mock/API contracts of unaffected screens.
- Before changing Next.js APIs or conventions, read the relevant installed guide under `node_modules/next/dist/docs/`; the managed block above is generated by this installed Next version and must remain intact.
- Do not add tests or claim checks passed unless the current task asks for them. Use only the validation requested by the user or required by the task.

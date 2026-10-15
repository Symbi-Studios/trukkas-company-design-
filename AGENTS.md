<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Trukkas Company project instructions

## MANDATORY: API integration must preserve the existing UI

**An API integration task does not authorize design, structure, static-copy, or interaction changes. Preserve the existing screen unless the user explicitly requests a specific UI change.**

- Preserve each screen's layout, sections, tabs, cards, tables, columns, forms, buttons, menus, icons, spacing, colors, typography, responsive behavior, navigation, and existing interactions.
- Do not add, remove, rename, reorder, redesign, or restructure UI to accommodate an API. Do not add notices, demo labels, banners, badges, controls, or replacement components as part of an integration.
- Adapt backend DTOs at the RTK Query API boundary to the screen's existing view model. Do not spread wire-format assumptions across components.
- If an API omits a required value, returns `null`, or returns a value that cannot be parsed safely, show `—` in that existing value location. Preserve valid `0` and `false`. Do not substitute sample records, mock totals, estimated values, unrelated data, or invented defaults. Do not manufacture rows or counts for unavailable collections.
- If a screen or section has no supporting API, preserve its structure and show `—` in backend-dependent value locations. Do not present fixture values as live data.
- Wire only documented, supported operations to existing actions. Do not fake a successful update or invent an endpoint when an action has no API. Preserve the existing design, report the missing operation, and use the established unavailable-action behavior where one exists.
- Reuse the established loading components, skeletons, and loading/error/empty patterns from integrated screens. Do not introduce a different loader or status presentation.
- Do not add or modify tests during API integration. Do not run tests unless the user explicitly requests them. Report only checks actually performed.
- Before finishing, review the diff for unintended layout, structure, copy, styling, and interaction changes. Remove accidental changes made during the task.
- Report remaining API gaps directly in chat. For each one, include the screen or section, HTTP method, exact existing path and relevant query parameters, and the response fields needed by that existing UI area.
- For missing write operations, include the required request-body fields and expected response data. If no API is documented, say so explicitly and label any proposed method, path, or contract as **proposed**.
- Distinguish undocumented or unconfirmed fields from fields confirmed absent in an actual response. Do not create a Markdown report unless the user asks for one.

## Project structure and runtime

- This repository is a JavaScript/JSX dashboard for trucking-company clients, including fleet managers and company admins managing their own company's jobs, fleet, drivers, and finances.
- The app uses Next.js 16.3.4, React 18, and the App Router. Routes live in `src/app/`; the shared shell is in `src/App.jsx`; screen components are in `src/screens/`.
- This project previously held an internal Trukkas Admin console. That scope is retired. Company-facing screens must not expose other companies' data, platform configuration, or admin-only compliance operations.
- `tsconfig.json` enables `allowJs` and leaves existing JavaScript unchecked (`checkJs: false`). TypeScript files use strict checking. Keep existing modules in JavaScript unless a task benefits from typed contracts or components. `.tsx` files may import existing `.jsx` modules.
- Shared UI components and design tokens are under `src/ds/`. Reuse them and established screen patterns before adding dependencies or one-off styles.
- `next.config.mjs` sets `output: 'export'`. Treat the app as a static client deployment: there is no deployed Next.js server runtime for API proxying, server actions, or route handlers. Preserve static export unless the user explicitly requests an architecture change.
- Use `package.json` as the source of truth for available scripts. Check it before running a command or documenting project commands.
- `HANDOFF.md` contains prototype contracts and design notes. Some of its framework, routing, and command notes may be stale; verify them against `package.json`, the installed Next.js docs, and current source.

## Current data architecture

- `src/mock/api.js` is the async data-action layer. It currently reads and updates the in-memory store in `src/mock/db.js`, seeded from `src/mock/fixtures/`.
- Screens subscribe to collections through `src/mock/useCollection.js`. Pure domain rules live under `src/domain/`.
- Keep the prototype working while integrating incrementally. For an API-backed feature, add endpoints using `baseApi.injectEndpoints(...)` under `src/store/features/<feature>/`.
- Adapt API response DTOs to the screen's existing view model at the API boundary. Handle loading, empty, error, and permission states using existing screen patterns.
- Components should use generated RTK Query hooks. Do not scatter raw `fetch` calls or response-shape assumptions across screens.
- Retain mock-backed screens and fixtures that have not been migrated. Remove the mock store only as part of an explicitly requested complete cutover, after checking all consumers.
- Redux Toolkit configuration lives in `src/store/store.js`; the client provider is `src/store/StoreProvider.jsx`; shared RTK Query transport and refresh logic live in `src/store/api/baseApi.js`.
- Use `builder.query` for reads and `builder.mutation` for writes.
- The shared API transport logs sanitized request and response bodies in development by default. `NEXT_PUBLIC_API_LOGGING=false` disables development logs; production logging is always disabled. Preserve secret and personal-data redaction when extending the logger.

## Backend API reference and integration

- The Trukkas API reference is [Trukkas API docs](https://trukkas-backend.onrender.com/api/docs#/). Confirm the current paths, schemas, permissions, filters, pagination, and response shapes from the live spec and backend behavior before integrating.
- This app is a company-facing client. Do not assume that an admin route has a company-facing equivalent at the same path. Confirm the actual company/operator-facing operations for authentication, jobs, fleet, drivers, trips, payouts, and other company features.
- The current project notes say `src/store/features/auth/authApi.js` is mock-gated because a company-facing authentication endpoint had not been verified. Inspect the current source and live API spec before relying on that note or wiring authentication.
- Use the company's documented authorization boundaries. UI visibility is only presentation; the backend must enforce access and permissions.
- For each integration, verify request and response schemas, IDs, enums and status transitions, filtering and pagination, dates and time zones, currency and measurement units, upload behavior, and error handling. Do not guess from fixture shapes.
- Do not send development or verification writes to production endpoints. Use a confirmed development or staging environment, or mocks, for writes—especially payout, payment, account, and deletion actions. Never use real user data or credentials as test data.
- If an operation or response field is only proposed or undocumented, label it as such. Do not describe an undocumented field as confirmed absent unless an actual response has been checked.

## Configuration and security

- Because the app uses static export, browser code, built assets, and public environment variables are visible to users. A public API base URL may be client-side configuration; never place passwords, signing keys, service credentials, or other secrets in source, fixtures, browser storage, or any `NEXT_PUBLIC_*` variable.
- Check backend CORS settings for the deployed frontend origin. If an integration requires a server-held secret or server-side session, resolve the hosting/runtime architecture before changing static export or exposing credentials.
- Auth state is in `src/store/features/auth/authSlice.js` and uses the guarded `trukkas-company-auth` localStorage entry. Store only the account, active company ID, access token, and refresh token there. Never store passwords, reset tokens, credentials, or other secrets.
- `baseApi.js` attaches the bearer token, performs a single shared refresh when needed, preserves the current refresh token when the backend returns only a new access token, and clears a terminally expired session from Redux and storage. `StoreProvider.jsx` schedules refresh before a parseable JWT expiry.
- Never log tokens, credentials, or personal data. Treat client-side role checks as presentation only; enforce access on the server.
- Avoid automatic retries for non-idempotent writes unless the API documents an idempotency mechanism.

## Editing and validation

- Preserve existing route conventions, responsive behavior, design-system usage, and mock/API contracts for unaffected screens.
- Before changing Next.js APIs or conventions, read the relevant installed guide under `node_modules/next/dist/docs/`. Keep the managed Next.js block above intact.
- Do not add tests or claim checks passed unless the current task asks for them. Follow the testing restriction above for API integration work.
- Report only validation that was actually performed.
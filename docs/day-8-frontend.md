# Day 8 frontend implementation

## Outcome

Day 8 implementation is complete in the existing frontend. The application uses the repository's actual FastAPI routers, schemas, JWT bearer authentication, active organization memberships, and Owner/Admin event-creation rules. Backend models, migrations, credentials, environment secrets, and PostgreSQL data were preserved. No backend source file was changed, and no commit or push was made.

The implementation criteria are satisfied. Final acceptance against a running PostgreSQL-backed account is conditional: successful real-account login and persisted event creation have not yet been verified. The checks below distinguish fixture, isolated-code, and live-service coverage.

## Implemented features

- Responsive application shell with a desktop sidebar, organization header, active routes, mobile navigation, logout, and skip-to-content link. The mobile dialog supports Escape, focus trapping, inert background content, focus restoration, and desktop-resize cleanup.
- Shared buttons, cards, headers, fields, status badges, and loading/error/empty states with consistent Tailwind styling.
- React Router routes and TanStack Query providers, organization-scoped query keys, cancellation, readable API errors, and cache cleanup on session changes.
- Login using React Hook Form and Zod, the real JSON login endpoint, bearer requests, profile verification, reload restoration, expiry handling, and safe return navigation.
- Protected application routes with verification/retry states and active-membership organization selection.
- Dashboard showing the actual selected organization, verified membership role, the first six non-archived events ordered by start date, and existing API service health. No invented totals, financial metrics, or other KPIs.
- Searchable, status-filtered, paginated event management with event name, date, status, location, and supported event details.
- Owner/Admin event creation with backend-aligned field lengths, date ordering, local-date validation, UTC ISO timestamps, optional capacity, request feedback, and organization event-query invalidation after success.
- Responsive layouts and accessible labels, field errors, focus indicators, keyboard navigation, and reduced-motion support.

Inventory, Budget, AI, and Offline Sync were not implemented in Day 8.

## Actual API contracts

All paths below are backend paths; the frontend's default `/backend` transport prefix is removed by Vite's proxy.

| Endpoint | Contract used by the frontend |
| --- | --- |
| `POST /auth/login` | JSON `{email,password}` → `{access_token,token_type:"bearer"}`. |
| `GET /auth/me` | Authenticated profile `{id,name,email,created_at}`. |
| `GET /organizations` | Array `{id,name,created_at}` for the current user's active memberships. |
| `GET /organizations/{organization_id}/members` | Membership array. Match current `user_id` and `status === "active"` to resolve the role. |
| `GET /api/v1/events` | Requires `organization_id`; supports `search` (maximum 100 characters), `status_filter`, `page` ≥ 1, and `page_size` from 1–100. Returns an event array without a total count. |
| `GET /api/v1/events/{event_id}` | Existing, non-archived event, subject to active organization membership. Frontend also checks that its `organization_id` matches the selected workspace. |
| `POST /api/v1/events` | Active Owner/Admin only. Requires `organization_id`, `title`, `start_at`, and `end_at`; accepts optional nullable `description`, `location`, and `capacity`. |
| `GET /health` | `{status,application}` for dashboard service status. |

Event records use `title` as the event name and include `id`, `organization_id`, `description`, `location`, `start_at`, `end_at`, `status`, `archived_at`, `created_at`, and `capacity`. Status values are `planned`, `active`, `completed`, and `cancelled`. Creation starts with the backend's `planned` default.

Creation validates title length 1–150, description up to 1,000, location up to 200, valid timezone-aware dates with end after start, and optional positive integer capacity. The UI also bounds capacity to PostgreSQL's integer range. Empty optional strings become `null`.

Pagination deliberately has no invented total count. A full page can expose a next page that is empty because the API supplies no count or next-page marker; the user can return to the previous page.

## Authentication and organization boundaries

The existing API uses bearer tokens, not cookies. The client omits cookie credentials. Tokens are held in memory and tab-scoped `sessionStorage`; storage-disabled browsers use memory only. A reload restores a non-expired token and verifies it through `/auth/me` before protected content is shown.

The backend controls JWT expiry. The frontend reads `exp` to schedule expiry notices and sign-out, and clears the session on an HTTP 401 belonging to the current token. An older failed request cannot clear a newer session. Server verification remains authoritative. There is no refresh-token endpoint and no server-side logout/revocation endpoint. Logout removes this tab's token and cached data; already issued tokens remain valid server-side until expiry, and other tabs have independent sessions.

Organization preferences are stored per user in the tab and validated against the API's active-membership list. The current role is resolved from the membership endpoint. Only active Owners/Admins see and can submit event creation. The backend still enforces every mutation and organization-isolation rule. Switching organization cancels old event/membership queries and leaves detail/create routes for the scoped event list.

## Local setup and deployment

See [frontend setup](../frontend/README.md) for commands. Use the existing database service, secrets, and backend virtual environment. Start FastAPI from `backend` with:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

From `frontend`, run `npm ci`, then `npm run dev`. Vite forwards `/backend/*` to `http://127.0.0.1:8000/*` with the prefix removed. The same local proxy is configured for `npm run preview`; preview is not production hosting.

Production requires a same-origin reverse proxy for `/backend`, plus SPA route fallback, or a public `VITE_API_BASE_URL` supplied before building. The backend currently allows cross-origin browser requests only from `http://localhost:5173`; an explicit deployed origin must be configured for a cross-origin deployment. No CORS or environment secrets were changed in this implementation.

## Validation record

| Check | Result and boundary |
| --- | --- |
| `npm run build` | Passed. TypeScript and Vite production build; JavaScript bundle approximately 466 kB before gzip. |
| `npm run lint` | Passed with zero errors and zero warnings. |
| `npm test` | 18 regression tests passed. Tests execute production validation, session, and API-client logic with isolated storage/network boundaries. |
| Browser fixture scenarios | 12 scenarios passed: authentication/session restoration/navigation, organization scope, Viewer permissions, event creation, API error/empty states, and responsive checks at 320/390/768/1440 px; no browser runtime errors observed. Fixture responses do not establish live database behavior. |
| Isolated backend code checks | 16 checks passed against existing backend code with isolated dependencies; no production database changes. |
| Live read-only HTTP/API checks | 9 passed: FastAPI `/health`; unauthenticated `/auth/me`, `/organizations`, and `/api/v1/events` return 401 with the bearer challenge; invalid JWT returns 401; existing CORS authorization preflight returns 200; malformed login email returns 422; actual Vite `/backend/health` proxy returns healthy data; actual Vite `/backend/auth/me` proxy preserves authentication rejection. Both temporary servers were stopped after the checks. |
| Live database connectivity | `/health/db` did not respond within a five-second timeout. Successful real-account login, active membership retrieval, and persisted event creation remain unverified. Do not interpret fixture or isolated checks as successful real-database behavior. |

## Exact implementation files

Modified existing files:

- `frontend/README.md`
- `frontend/index.html`
- `frontend/package.json` — added the regression-test script; existing dependencies retained.
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/src/main.tsx`
- `frontend/src/pages/EventsPage.tsx` — existing untracked Day 8 starter page extended.
- `frontend/src/pages/LoginPage.tsx` — existing untracked Day 8 starter page extended.
- `frontend/vite.config.ts`

Added files:

- `docs/day-8-frontend.md`
- `frontend/src/components/layout/AppLayout.tsx`
- `frontend/src/components/ui/index.tsx`
- `frontend/src/components/ui/styles.ts`
- `frontend/src/features/auth/AuthProvider.tsx`
- `frontend/src/features/auth/ProtectedRoute.tsx`
- `frontend/src/features/auth/authContext.ts`
- `frontend/src/features/auth/useAuth.ts`
- `frontend/src/features/events/EventList.tsx`
- `frontend/src/features/events/format.ts`
- `frontend/src/features/events/queries.ts`
- `frontend/src/features/events/schema.ts`
- `frontend/src/features/organizations/OrganizationGate.tsx`
- `frontend/src/features/organizations/OrganizationProvider.tsx`
- `frontend/src/features/organizations/organizationContext.ts`
- `frontend/src/features/organizations/useOrganization.ts`
- `frontend/src/pages/CreateEventPage.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/EventDetailPage.tsx`
- `frontend/src/pages/NotFoundPage.tsx`
- `frontend/src/services/api.ts`
- `frontend/src/services/queryClient.ts`
- `frontend/src/services/session.ts`
- `frontend/src/types/api.ts`
- `frontend/tests/day8.test.mjs`

`frontend/package-lock.json` was already modified before this task and was preserved without further edits. Pre-existing changes in `package.json`, `main.tsx`, `index.css`, `vite.config.ts`, and the starter pages were inspected and extended. No backend file or migration was modified.

## Remaining limitations and Day 9

Finish real-account integration verification against the existing database: login, reload, expiry/logout, multiple organizations, Viewer and Owner/Admin permissions, and event persistence after refresh. This is the remaining acceptance-verification limitation, rather than a fixture test failure.

Recommended Day 9 work:

1. Add participant and registration interfaces against the existing organization-scoped endpoints, including capacity/conflict feedback.
2. Add event task lists and assignment interfaces using existing task RBAC.
3. Run live multi-user, multi-organization RBAC end-to-end checks, including membership changes during an open session.
4. Prepare production SPA routing, HTTPS, API proxy/base URL, and explicit CORS configuration; review the existing bearer-token lifecycle before any authentication redesign.

# FieldOps Pro frontend

React 19, TypeScript, Vite, Tailwind CSS v4, React Router, TanStack Query, React Hook Form, Zod, and Lucide.

## Run locally

Use the existing PostgreSQL database, root `.env`, backend virtual environment, and migrations. Do not replace secrets, seed accounts, reset volumes, or rerun migrations merely to start the frontend.

If the existing database container is stopped, start the existing Compose service from the project root:

```powershell
cd C:\Projects\FieldOps-Pro
docker compose up -d db
```

Start FastAPI in a separate terminal using the installed backend environment:

```powershell
cd C:\Projects\FieldOps-Pro\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Start the frontend:

```powershell
cd C:\Projects\FieldOps-Pro\frontend
npm ci
npm run dev
```

`npm ci` uses the existing package lock. Use `npm install` instead when intentionally updating dependencies. Sign in with an existing account; no credentials are embedded in the frontend. An active organization membership is required to enter an organization workspace.

The default API base is `/backend`. Vite forwards `/backend/*` to `http://127.0.0.1:8000/*`, preserving the backend's actual paths. Open the URL Vite prints; the normal development URL is `http://localhost:5173`.

## Routes and permissions

- `/login`: sign in, validation, expired-session notice, and safe return navigation.
- `/dashboard`: selected organization, current membership role, a six-event schedule preview, and `/health` service status.
- `/events`: scoped event list with search, status filtering, pagination, and loading/empty/error handling.
- `/events/new`: validated event creation for active Owners and Admins.
- `/events/:eventId`: event details, checked against the selected organization.

Application routes require a verified `/auth/me` profile. Organizations come from active memberships returned by the API. The current role is resolved from `/organizations/{id}/members`; the backend remains responsible for authorization on every request.

## API and session behavior

The frontend uses the existing JWT bearer security design:

| Operation | Existing backend endpoint |
| --- | --- |
| Sign in with JSON `{ email, password }` | `POST /auth/login` |
| Verify current profile | `GET /auth/me` |
| List accessible organizations | `GET /organizations` |
| Resolve active membership and role | `GET /organizations/{organization_id}/members` |
| Search/list events | `GET /api/v1/events?organization_id=...&page=...&page_size=...` |
| View event | `GET /api/v1/events/{event_id}` |
| Create event | `POST /api/v1/events` |
| Check service | `GET /health` |

Requests send `Authorization: Bearer <token>` and omit cookies. Tokens live in memory and tab-scoped `sessionStorage`, survive reloads until expiry, and are removed on logout or a current-session HTTP 401. Storage-disabled browsers use an in-memory session. Browser storage is accessible to JavaScript; preventing XSS remains essential.

JWT expiry comes from the backend token's `exp` claim. Client decoding schedules sign-out; `/auth/me` and server-side JWT verification establish trust. There is no refresh-token or server logout endpoint. Signing out clears the current tab's token and query cache; it does not revoke an already issued token at the server or sign out other tabs. Expired sessions require a new sign-in.

Organization selection is saved per user in the tab and rechecked against the API. Query keys contain organization scope. Session changes cancel pending queries and clear caches; organization switching cancels pending event and membership queries.

## Validation

```powershell
npm run build
npm run lint
npm test
```

The build runs TypeScript checking and produces `dist/`. `npm test` runs 18 regression tests against production validation, session, and API-client logic with isolated browser/network boundaries. See [Day 8 implementation and validation](../docs/day-8-frontend.md) for the complete validation record and limitations.

`npm run preview` serves the local production build and has a local `/backend` proxy. It is a preview server, not production hosting.

## Deployment

For the default `/backend` base, configure the production web server to forward `/backend/*` to FastAPI with the prefix removed, and serve the frontend entry point for client-side routes.

Alternatively, set `VITE_API_BASE_URL` to the public API base before building. Vite embeds this public value in the frontend bundle; it must never contain a secret. The backend currently permits browser CORS only from `http://localhost:5173`. A cross-origin deployment therefore requires an explicit backend CORS origin configuration. The default same-origin proxy does not require a backend CORS change.

Use HTTPS in production. Keep the existing `.env` and secrets private. No backend code, database data, or migrations were changed for Day 8.

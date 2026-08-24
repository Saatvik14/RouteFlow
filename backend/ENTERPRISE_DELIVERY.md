# Enterprise delivery implementation

## Tenancy and roles

Every enterprise record is scoped through an `organization_id`. Membership roles are `owner`, `admin`, `dispatcher`, `driver` and `viewer`. Business mutation endpoints require owner/admin/dispatcher membership; reporting and dispatch reads also permit viewers. Driver execution checks both the active membership and the assigned driver account.

Platform administrator privileges are separate from organization membership and protect the legacy global user-management endpoints.

## State machines

Routes use:

```text
draft -> assigned -> accepted -> in_progress -> completed
                   -> draft (driver rejection)
draft|assigned|accepted|in_progress -> cancelled
in_progress -> failed
```

Assignment writes lock the route row and increment `assignment_version`. Clients can submit `expectedVersion` to reject stale concurrent changes. Start and completion are idempotent.

Stops use `pending`, `arrived`, `delivered`, `failed`, `skipped` and `reschedule_required`. Delivery submission uses a client `submissionKey`, stores a server completion timestamp and prevents a second outcome from overwriting the first.

## Enterprise API

All paths below are prefixed by `/api/enterprise`.

| Method and path | Purpose |
| --- | --- |
| `GET /invitations/accept/:token` | Public invitation preview with masked email |
| `POST /invitations/accept/:token/new` | Create password and accept as a new user |
| `POST /invitations/accept/:token/existing` | Accept with the matching signed-in account |
| `GET/POST /invitations` | List or create tenant invitations |
| `POST /invitations/:id/resend` | Revoke the old secret and issue a new invitation |
| `POST /invitations/:id/revoke` | Revoke a pending invitation |
| `GET /team` | Drivers, assignments and non-driver business members |
| `PATCH/DELETE /team/drivers/:id` | Update permissions/status or safely remove a driver |
| `GET /team/drivers/:id/history` | Tenant-scoped driver route history |
| `GET /assignments/mine` | Signed-in driver's assigned routes |
| `POST /routes/:id/assign` | Assign or reassign with version protection |
| `POST /routes/:id/accept` | Accept assignment |
| `POST /routes/:id/reject` | Reject assignment |
| `POST /routes/:id/start` | Start an accepted route |
| `POST /routes/:id/complete` | Finish after every stop is resolved |
| `POST /routes/:id/cancel` | Business cancellation |
| `POST /routes/:id/change-requests` | Driver request to dispatch |
| `POST /stops/:id/arrive` | Record arrival |
| `POST /stops/:id/complete` | Multipart delivered/failed/skipped outcome and proofs |
| `GET /proofs/:id/content` | Authorized protected proof content |
| `POST /routes/:id/location` | Throttled active-route driver location |
| `GET /dashboard` | Filtered operational dispatch projection |
| `GET /routes/:id/detail` | Stops, proof metadata, assignment history and audit events |
| `GET /routes/:id/progress` | Pollable live progress projection |
| `GET /reports/daily` | Date/driver/route filtered report |
| `GET /reports/daily.csv` | Spreadsheet-safe CSV export |

## Proof handling

Delivery accepts JPEG, PNG or WebP photographs and a signature SVG. The SVG is delivered with a sandbox content security policy. Proof metadata includes type, digest, size, uploader, tenant, route and stop. Content is never exposed through a public object URL; the download endpoint repeats route authorization.

## Location handling

Location updates are accepted only from the active assigned driver while the route is `in_progress`. The server throttles inserts, records device and server timestamps, and exposes the last server receipt time. Dashboard projections label locations stale after the configured threshold instead of presenting stale coordinates as current.

The mobile implementation uses foreground tracking and pauses when the app backgrounds. A production deployment that requires continuous background tracking should add a separately reviewed Expo background-location task and the corresponding store disclosures.

## Deployment order

1. Back up the database.
2. Apply `database/migrations/apply_enterprise_delivery_schema.psql` in staging. It runs the six clearly scoped migrations in order.
3. Verify backfilled organizations, memberships, drivers and normalized states.
4. Configure Gmail, JWT, CORS and frontend URL values.
5. Deploy the backend.
6. Build/deploy the frontend with `EXPO_PUBLIC_API_BASE_URL` pointing at that backend.
7. Exercise one invitation, assignment, proof and report flow before opening access broadly.

# RouteFloww backend

Express/PostgreSQL API for RouteFloww authentication, route planning and enterprise delivery operations.

## Runtime architecture

- Express 5 controllers and routers in `api/src`
- PostgreSQL through `pg`; transactions use `withTransaction`
- JWT access and refresh tokens
- Gmail API invitation email delivery
- Route optimisation through the existing optimisation integration
- Protected proof files in PostgreSQL by default, or a private Supabase Storage bucket
- Foreground location updates stored in PostgreSQL and read by an efficient polling API

The enterprise routes are mounted at `/api/enterprise`. Legacy route, order, driver and manifest routes remain available but now require authentication and tenant-aware access checks.

## Setup

1. Install Node.js and PostgreSQL.
2. Run `npm install` in this directory.
3. Copy `.env.example` to `.env` and replace every placeholder secret.
4. Apply the existing table SQL for a new database, then apply the enterprise migration:

   ```bash
   psql "$DATABASE_URL" -f database/migrations/apply_enterprise_delivery_schema.psql
   ```

5. Start with `npm run dev` or `npm start`.

The ordered migrations are additive and backfill organizations, memberships, route tenant IDs, assignment history, normalized route states and normalized stop states. Their table-by-table responsibilities are documented in [database/migrations/README.md](./database/migrations/README.md). Back up production data and run the complete set in a staging copy before production rollout.

## Required environment

At minimum configure `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `APP_BASE_URL` and `CORS_ORIGINS`. Configure the Gmail variables before sending invitations. `APP_BASE_URL` must be the user-visible frontend origin so invitation links open `/invite?token=...` correctly.

Invitation links default to 48 hours through `INVITATION_EXPIRES_HOURS`. No invitation secret or driver password is included in logs or stored in plaintext.

If `PROOF_STORAGE_BUCKET` is blank, protected proof bytes are stored in PostgreSQL. If set, create a private Supabase bucket and configure the server-only service key; never make the bucket public.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start with nodemon |
| `npm start` | Start the API |
| `npm test` | Run backend policy, lifecycle, invitation, reporting and security tests |
| `npm run check` | Parse the API entrypoint and run tests |

See [ENTERPRISE_DELIVERY.md](./ENTERPRISE_DELIVERY.md) for roles, state machines and API endpoints.

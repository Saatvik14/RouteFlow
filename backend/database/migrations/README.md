# Enterprise schema migrations

The enterprise delivery schema is split by table responsibility and must be applied in filename order.

| Order | Migration | Schema responsibility |
| --- | --- | --- |
| 1 | `20260823_001_create_organizations_and_organization_memberships.sql` | Creates `organizations` and `organization_memberships`; extends `drivers` with tenant, account and permission fields |
| 2 | `20260823_002_create_driver_invitations.sql` | Creates `driver_invitations`, its constraints and pending-invitation index |
| 3 | `20260823_003_extend_routes_and_create_assignment_audit_tables.sql` | Extends `routes`; creates `route_assignments`, `route_audit_events` and `route_change_requests` |
| 4 | `20260823_004_extend_orders_and_create_proof_of_delivery_files.sql` | Extends `orders`; creates `proof_of_delivery_files` |
| 5 | `20260823_005_create_route_locations.sql` | Creates `route_locations` and its latest-location index |
| 6 | `20260823_006_backfill_independent_driver_workspaces.sql` | Backfills private owner workspaces for independent drivers so existing route, order and driver tables remain usable after tenant scoping |

Apply the complete set with:

```powershell
psql "$env:DATABASE_URL" -f "database/migrations/apply_enterprise_delivery_schema.psql"
```

The runner enables `ON_ERROR_STOP` and each migration has its own transaction. If a migration fails, later files are not applied. Fix the reported migration and rerun the runner; all schema creation and indexes use idempotent guards.

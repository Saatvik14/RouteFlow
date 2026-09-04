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
| 7 | `20260824_007_create_ai_assignment_recommendations.sql` | Adds driver assignment profiles and expiring, dispatcher-confirmed recommendation drafts |
| 8 | `20260825_008_add_address_to_organizations.sql` | Adds the optional operating address used during business onboarding |
| 9 | `20260826_009_add_role_aware_authentication.sql` | Adds independent-driver vehicle type and hashed fleet-driver access-code credentials |
| 10 | `20260901_010_create_driver_marketplace.sql` | Adds public route listing fields, independent-driver bids, award decisions, budgets, and marketplace indexes |
| 11 | `20260904_011_add_delivery_otp_proof.sql` | Adds recipient email and expiring, attempt-limited delivery OTP verification fields |

Apply the complete set with:

```powershell
psql "$env:DATABASE_URL" -f "database/migrations/apply_enterprise_delivery_schema.psql"
```

The runner enables `ON_ERROR_STOP` and each migration has its own transaction. If a migration fails, later files are not applied. Fix the reported migration and rerun the runner; all schema creation and indexes use idempotent guards.

# RouteFloww - Admin Guide & Database Migration Reference

This reference document contains all SQL database migration queries, user role descriptions, and production Render / local development **cURL commands** for managing users.

---

## 1. Database Migration SQL Queries

### A. Migrate Existing Users to `INDEPENDENT_DRIVER`
Run this SQL query in your PostgreSQL database (e.g. Supabase / Render DB) to assign all existing users the `INDEPENDENT_DRIVER` role:

```sql
UPDATE users 
SET role = 'INDEPENDENT_DRIVER' 
WHERE role IS NULL OR role IN ('user', 'DRIVER', '');
```

### B. Create `drivers` Table
```sql
CREATE TABLE IF NOT EXISTS drivers (
    driver_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_driver_user FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

### C. Add `driver_id` Column to `routes` Table
```sql
ALTER TABLE routes 
ADD COLUMN IF NOT EXISTS driver_id INT REFERENCES drivers(driver_id) ON DELETE SET NULL;
```

---

## 2. Admin cURL Commands

- **Production Render URL**: `https://routeflow-rlu5.onrender.com`
- **Local Dev URL**: `http://localhost:5000`

---

### A. Delete User API

#### Delete User by Email (Production Render)
```bash
curl -X DELETE "https://routeflow-rlu5.onrender.com/users/admin/delete-user?email=user@example.com"
```

#### Delete User by Email (Local Dev)
```bash
curl -X DELETE "http://localhost:5000/users/admin/delete-user?email=user@example.com"
```

#### Delete User by ID (Production Render)
```bash
curl -X DELETE "https://routeflow-rlu5.onrender.com/users/admin/delete-user?user_id=12"
```

#### Delete User by ID (Local Dev)
```bash
curl -X DELETE "http://localhost:5000/users/admin/delete-user?user_id=12"
```

---

### B. Change User Role API

#### Change Role to `BUSINESS_OWNER` (Production Render)
```bash
curl -X PUT "https://routeflow-rlu5.onrender.com/users/admin/change-role" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "role": "BUSINESS_OWNER"
  }'
```

#### Change Role to `BUSINESS_OWNER` (Local Dev)
```bash
curl -X PUT "http://localhost:5000/users/admin/change-role" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "role": "BUSINESS_OWNER"
  }'
```

#### Change Role to `FLEET_DRIVER` (Production Render)
```bash
curl -X PUT "https://routeflow-rlu5.onrender.com/users/admin/change-role" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver@example.com",
    "role": "FLEET_DRIVER"
  }'
```

#### Change Role to `FLEET_DRIVER` (Local Dev)
```bash
curl -X PUT "http://localhost:5000/users/admin/change-role" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver@example.com",
    "role": "FLEET_DRIVER"
  }'
```

#### Change Role to `INDEPENDENT_DRIVER` (Production Render)
```bash
curl -X PUT "https://routeflow-rlu5.onrender.com/users/admin/change-role" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "role": "INDEPENDENT_DRIVER"
  }'
```

#### Change Role to `INDEPENDENT_DRIVER` (Local Dev)
```bash
curl -X PUT "http://localhost:5000/users/admin/change-role" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "role": "INDEPENDENT_DRIVER"
  }'
```

---

## 3. Role Summary Cheat-Sheet

| Role | Capabilities | Restrictions |
| :--- | :--- | :--- |
| `INDEPENDENT_DRIVER` | Create routes, navigate live GPS, mark orders delivered/failed. | Cannot assign fleet drivers. |
| `FLEET_DRIVER` | View assigned routes, navigate live GPS, mark orders delivered/failed. | Cannot create new routes. |
| `BUSINESS_OWNER` | Create routes, assign drivers with mandatory email, and manage routes from Delivery Operations. | Cannot start live turn-by-turn navigation; cannot mark orders delivered/failed. |

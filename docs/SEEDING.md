# Data Seeding Guide

> **Phase E Documentation**: Safe Demo Data & Reset Strategy

---

## 1. Overview

This document describes how to safely seed demo data for testing, demos, and onboarding WITHOUT corrupting production data.

### Core Principles

1. **Seeds NEVER run automatically in production**
2. **All demo data is clearly labelled** (`is_demo = true`)
3. **Seeds are idempotent** (safe to run multiple times)
4. **Demo data can be reset independently** from real users
5. **Production database has NO demo data**

---

## 2. Demo Data Categories

### 2.1 Demo Users

| Role | Email | Purpose |
|------|-------|---------|
| Demo Driver | `demo-driver@carpoolnetwork.test` | Showcase driver features |
| Demo Passenger | `demo-passenger@carpoolnetwork.test` | Showcase passenger features |
| Demo Admin | `demo-admin@carpoolnetwork.test` | Admin panel demos (staging only) |

### 2.2 Demo Vehicles

| Owner | Vehicle | Details |
|-------|---------|---------|
| Demo Driver | Demo Car | 2023 Toyota Corolla, 5 seats |

### 2.3 Demo Rides

| Type | Status | Notes |
|------|--------|-------|
| Future Commute | `active` | Departing tomorrow, bookable |
| In Progress | `in-progress` | Currently happening |
| Completed | `completed` | Historical ride with review |

### 2.4 Demo Bookings

| Passenger | Ride | Status |
|-----------|------|--------|
| Demo Passenger | Future Commute | `confirmed` |

---

## 3. Seed Scripts

### 3.1 Location: `scripts/seed-demo-data.sql`

```sql
-- ============================================================================
-- DEMO DATA SEED SCRIPT
-- ============================================================================
-- PURPOSE: Create demo users, vehicles, rides, and bookings for staging/demos
-- SAFETY: NEVER run in production. All records marked with is_demo = true.
-- IDEMPOTENT: Safe to run multiple times (uses ON CONFLICT DO NOTHING)
-- ============================================================================

-- Guard: Abort if running against production URL
DO $$
BEGIN
  IF current_setting('app.environment', true) = 'production' THEN
    RAISE EXCEPTION 'ABORT: Cannot run seed script in production environment';
  END IF;
END $$;

-- ============================================================================
-- 1. Demo Users (profiles)
-- ============================================================================

-- Note: Auth users must be created via Supabase Auth API or Dashboard
-- This script creates corresponding profile records

INSERT INTO profiles (id, email, full_name, bio, is_demo, email_verified, created_at)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'demo-driver@carpoolnetwork.test',
    'Demo Driver',
    'I''m a demo driver showcasing the platform features.',
    true,
    true,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'demo-passenger@carpoolnetwork.test',
    'Demo Passenger',
    'I''m a demo passenger looking for rides.',
    true,
    true,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'demo-admin@carpoolnetwork.test',
    'Demo Admin',
    'Demo admin account for staging.',
    true,
    true,
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  is_demo = true;

-- ============================================================================
-- 2. Demo Vehicles
-- ============================================================================

INSERT INTO vehicles (id, owner_id, make, model, year, color, license_plate, capacity, is_demo, is_active)
VALUES
  (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000001',
    'Toyota',
    'Corolla',
    2023,
    'Silver',
    'DEMO 001',
    5,
    true,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  is_demo = true;

-- ============================================================================
-- 3. Demo Rides
-- ============================================================================

INSERT INTO rides (id, driver_id, vehicle_id, origin, destination, departure_time, 
                   total_seats, available_seats, status, is_demo, origin_lat, origin_lng, 
                   dest_lat, dest_lng, created_at)
VALUES
  -- Future ride (bookable)
  (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000101',
    'London Bridge Station',
    'Canary Wharf',
    now() + interval '1 day',
    4,
    3,
    'active',
    true,
    51.5055, -0.0865,
    51.5054, -0.0235,
    now()
  ),
  -- Completed ride (for history)
  (
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000101',
    'King''s Cross Station',
    'Westminster',
    now() - interval '7 days',
    4,
    0,
    'completed',
    true,
    51.5308, -0.1238,
    51.4995, -0.1248,
    now() - interval '8 days'
  )
ON CONFLICT (id) DO UPDATE SET
  is_demo = true,
  departure_time = EXCLUDED.departure_time;

-- ============================================================================
-- 4. Demo Bookings
-- ============================================================================

INSERT INTO ride_bookings (id, ride_id, passenger_id, seats_requested, status, is_demo, created_at)
VALUES
  -- Confirmed booking on future ride
  (
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000002',
    1,
    'confirmed',
    true,
    now()
  ),
  -- Completed booking
  (
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000002',
    1,
    'completed',
    true,
    now() - interval '8 days'
  )
ON CONFLICT (id) DO UPDATE SET
  is_demo = true;

-- ============================================================================
-- 5. Demo Reviews
-- ============================================================================

INSERT INTO reviews (id, ride_id, reviewer_id, reviewee_id, rating, comment, is_demo, created_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    5,
    'Great driver! Very punctual and friendly. Demo review.',
    true,
    now() - interval '6 days'
  )
ON CONFLICT (id) DO UPDATE SET
  is_demo = true;

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'Demo seed complete' AS status,
       (SELECT COUNT(*) FROM profiles WHERE is_demo = true) AS demo_users,
       (SELECT COUNT(*) FROM vehicles WHERE is_demo = true) AS demo_vehicles,
       (SELECT COUNT(*) FROM rides WHERE is_demo = true) AS demo_rides,
       (SELECT COUNT(*) FROM ride_bookings WHERE is_demo = true) AS demo_bookings;
```

---

## 4. Reset Demo Data

### 4.1 Reset Script: `scripts/reset-demo-data.sql`

```sql
-- ============================================================================
-- DEMO DATA RESET SCRIPT
-- ============================================================================
-- PURPOSE: Remove all demo data while preserving real users
-- SAFETY: Only deletes records where is_demo = true
-- ============================================================================

-- Guard: Confirm this is not accidental
DO $$
BEGIN
  IF current_setting('app.environment', true) = 'production' THEN
    RAISE EXCEPTION 'ABORT: Cannot reset demo data in production';
  END IF;
END $$;

-- Delete in dependency order
DELETE FROM reviews WHERE is_demo = true;
DELETE FROM ride_bookings WHERE is_demo = true;
DELETE FROM rides WHERE is_demo = true;
DELETE FROM vehicles WHERE is_demo = true;
DELETE FROM notifications WHERE user_id IN (SELECT id FROM profiles WHERE is_demo = true);
DELETE FROM profiles WHERE is_demo = true;

-- Verification
SELECT 'Demo reset complete' AS status,
       (SELECT COUNT(*) FROM profiles WHERE is_demo = true) AS remaining_demo_users;
```

---

## 5. Running Seeds

### 5.1 Staging Environment

```bash
# Via Supabase Dashboard
# 1. Go to SQL Editor
# 2. Paste seed script
# 3. Execute

# Via CLI (if linked to staging)
supabase db reset --db-url "postgresql://..." 
```

### 5.2 Local Development

```bash
# Run seed script
psql $DATABASE_URL -f scripts/seed-demo-data.sql

# Or via npm script (if configured)
npm run db:seed
```

### 5.3 Production

⛔ **NEVER run seed scripts in production**

Production database should ONLY contain:
- Real user accounts
- Real rides and bookings
- System configuration (feature_flags, etc.)

---

## 6. Database Schema Requirements

For this seeding system to work, these columns must exist:

### profiles table
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_is_demo ON profiles(is_demo) WHERE is_demo = true;
```

### vehicles table
```sql
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_vehicles_is_demo ON vehicles(is_demo) WHERE is_demo = true;
```

### rides table
```sql
ALTER TABLE rides ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_rides_is_demo ON rides(is_demo) WHERE is_demo = true;
```

### ride_bookings table
```sql
ALTER TABLE ride_bookings ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_bookings_is_demo ON ride_bookings(is_demo) WHERE is_demo = true;
```

### reviews table
```sql
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_reviews_is_demo ON reviews(is_demo) WHERE is_demo = true;
```

---

## 7. Safety Verification Queries

### Check for Demo Data in Production

Run this BEFORE any production deployment:

```sql
-- Should return 0 for all counts in production
SELECT 
  'profiles' AS table_name, COUNT(*) AS demo_count FROM profiles WHERE is_demo = true
UNION ALL
SELECT 'vehicles', COUNT(*) FROM vehicles WHERE is_demo = true
UNION ALL
SELECT 'rides', COUNT(*) FROM rides WHERE is_demo = true
UNION ALL
SELECT 'ride_bookings', COUNT(*) FROM ride_bookings WHERE is_demo = true
UNION ALL
SELECT 'reviews', COUNT(*) FROM reviews WHERE is_demo = true;
```

### Identify Demo Users by Email Pattern

```sql
-- Demo emails should match test pattern
SELECT email, is_demo 
FROM profiles 
WHERE email LIKE '%@carpoolnetwork.test'
   OR email LIKE 'demo-%'
   OR email LIKE 'test-%';
```

---

## 8. E2E Test Accounts

Separate from demo data, E2E tests use dedicated accounts:

| Purpose | Email | Notes |
|---------|-------|-------|
| E2E Driver | `e2e-driver@test.carpoolnetwork.co.uk` | Real email, receives auth emails |
| E2E Passenger | `e2e-passenger@test.carpoolnetwork.co.uk` | Real email, receives auth emails |

⚠️ E2E accounts are NOT demo accounts - they may create real test data.

---

## 9. Automation Guard Rails

### CI/CD Protection

```yaml
# Example GitHub Actions guard
- name: Block seed in production
  run: |
    if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
      echo "ERROR: Cannot run seeds against production"
      exit 1
    fi
```

### Database Function Guard

```sql
CREATE OR REPLACE FUNCTION guard_production()
RETURNS void AS $$
BEGIN
  IF current_database() LIKE '%prod%' OR 
     current_setting('app.environment', true) = 'production' THEN
    RAISE EXCEPTION 'Operation not allowed in production';
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

*Document Version: Phase E - January 2026*

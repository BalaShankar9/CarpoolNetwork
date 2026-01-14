# CarpoolNetwork

## Supabase OTP prerequisites
- To allow OTP signups: turn OFF "Disable signups" in Supabase Auth settings and enable Phone provider + SMS provider (and Email provider for email OTP).
- To disable signups (private beta): keep signups disabled and set `VITE_AUTH_ALLOW_OTP_SIGNUPS=false`. OTP will work only for existing users created/admin-invited.

## Admin: create OTP users (private beta)
Server-side only (never in the browser). Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

```bash
node scripts/create-user.mjs --email user@example.com --password TempPass123!
node scripts/create-user.mjs --phone +447700900000
```

## Messaging RPC notes
- If you see `PGRST202` for `get_conversations_overview`, apply the latest Supabase migrations and refresh the API schema cache in the Supabase dashboard.

---

## Analytics Architecture

### Overview
The admin analytics dashboard provides real-time KPIs, charts, and drilldown views for platform metrics. All analytics queries use **secure server-side aggregation** to ensure no personal user data is exposed.

### Routes
| Route | Description |
|-------|-------------|
| `/admin/analytics/summary` | Main dashboard with KPI cards and trend charts |
| `/admin/analytics/users` | User growth, segmentation, and retention metrics |
| `/admin/analytics/rides` | Ride trends, types, peak hours, and booking funnel |
| `/admin/analytics/geo` | Geographic distribution and top routes |
| `/admin/analytics/ops` | Operational health, system events, and errors |

### Metrics Definitions

#### KPI Cards
| Metric | Definition |
|--------|------------|
| **Active Users** | Unique users who posted or booked a ride in the selected period |
| **New Users** | Users who registered during the selected period |
| **Rides Posted** | Total rides created by drivers |
| **Bookings Created** | Total booking requests made by passengers |
| **Completion Rate** | % of rides that reached completed status |
| **Cancellation Rate** | % of rides cancelled before completion |
| **Fill Rate** | Average % of available seats that were booked |
| **Messages Sent** | Total chat messages exchanged |

#### Delta Calculation
Deltas compare the current period to the previous period of equal length:
```
delta = ((current - previous) / previous) * 100
```
- Positive delta → green indicator (↑)
- Negative delta → red indicator (↓)
- Zero delta → gray indicator (–)

### Security Model

#### Admin-Only Access
- All analytics routes are protected by `AdminRoute` component
- Checks `profile.is_admin === true` OR `admin_roles` table membership
- Non-admin users are redirected to `/unauthorized`

#### Secure RPCs
Analytics data is fetched via PostgreSQL RPC functions with `SECURITY DEFINER`:

| RPC Function | Description |
|--------------|-------------|
| `admin_kpi_summary` | Returns aggregated KPI values and deltas |
| `admin_timeseries` | Returns daily metric counts for charts |
| `admin_top_routes` | Returns popular routes with ride counts |
| `admin_geo_distribution` | Returns area-level activity breakdown |
| `admin_ops_health` | Returns system event counts and status |
| `admin_user_segments` | Returns user role distribution |

Each RPC:
1. Calls `is_admin_user()` to verify admin status
2. Returns **aggregate counts only** - no PII (names, emails, phone numbers)
3. Raises exception if called by non-admin

#### Migration Required
Apply the migration to create RPCs:
```bash
supabase migration up --include 20260113120000_admin_analytics_rpcs.sql
```

### Frontend Components

#### Chart Components (`/src/components/admin/analytics/`)
- `KpiCard.tsx` - KPI card with value, delta, and optional sparkline
- `AnalyticsCharts.tsx` - Chart wrappers (Line, Bar, Pie, HeatMap) using Recharts
- `DataTable.tsx` - Sortable, paginated data table with CSV export
- `AnalyticsFilters.tsx` - Global filter bar (date range, community, segment)
- `exportUtils.ts` - CSV and PDF export utilities

#### Analytics Service (`/src/services/adminAnalyticsService.ts`)
- Tries secure RPC first, falls back to direct queries
- In-memory cache with 60-second TTL
- Type-safe with `AnalyticsFilters` and response types

### Caching Strategy
```typescript
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
```
- Cache key includes filters hash
- `clearAdminAnalyticsCache()` to force refresh
- Refresh button clears cache and reloads

### Export Formats

#### CSV Export
- Downloads as `filename-YYYY-MM-DD.csv`
- Headers from column definitions or object keys
- Properly escapes quotes and commas

#### PDF Export
- Opens print dialog with formatted HTML
- Includes report title, date range, and sections
- Suitable for printing or saving as PDF

### Testing

#### Unit Tests
```bash
npm run test -- tests/adminAnalyticsService.spec.ts
```
Tests cover:
- RPC call construction
- Delta calculations
- Filter serialization
- Cache behavior
- Error handling

#### E2E Tests
```bash
npx playwright test e2e/admin-analytics.spec.ts
```
Tests cover:
- Admin access to all analytics routes
- Non-admin blocked from analytics routes
- Charts render correctly
- Date range filter updates data
- Export functionality
- Mobile responsiveness

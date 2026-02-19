# E2E Testing with Playwright

## Setup

### 1. Install Dependencies
```bash
npm install
npx playwright install chromium --with-deps
```

Note: The `--with-deps` flag installs system dependencies required by Chromium.

### 2. Create Test Accounts

Before running E2E tests, you need to create test accounts in Supabase:

1. Go to your Supabase dashboard > Authentication > Users
2. Create the following users:

| Email | Password | Role |
|-------|----------|------|
| e2e-driver@test.carpoolnetwork.co.uk | TestDriver123! | Driver |
| e2e-passenger@test.carpoolnetwork.co.uk | TestPassenger123! | Passenger |
| admin@carpoolnetwork.co.uk | AdminTest123! | Admin |

3. These emails are already added to the beta_allowlist table

### 3. Configure Environment

Copy `.env.e2e.example` to `.env.e2e` and update credentials if using different values:

```bash
cp .env.e2e.example .env.e2e
```

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run with UI
```bash
npm run test:e2e:ui
```

### Run in debug mode
```bash
npm run test:e2e:debug
```

### View test report
```bash
npm run test:e2e:report
```

### Run specific test file
```bash
npx playwright test e2e/auth.spec.ts
```

## Test Structure

```
e2e/
  fixtures.ts       # Test utilities, helpers, and fixtures
  auth.spec.ts      # Authentication tests (login/signup/logout)
  rides.spec.ts     # Ride posting and searching tests
  booking.spec.ts   # Booking flow tests
  messaging.spec.ts # Messaging tests
  notifications.spec.ts # Notification tests
  public-pages.spec.ts # Public marketing/policy page smoke
  atlas-assistant.spec.ts # AI assistant widget (mocked) tests
  role-route-crawl.spec.ts # Role-based route crawl + coverage cross-check
```

## Test Users

The tests use three types of users:

- **Driver**: Posts rides and confirms bookings
- **Passenger**: Searches rides and requests bookings
- **Admin**: Manages beta allowlist

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| E2E_BASE_URL | Base URL for tests | http://localhost:5173 |
| E2E_DRIVER_EMAIL | Driver test account email | e2e-driver@test.carpoolnetwork.co.uk |
| E2E_DRIVER_PASSWORD | Driver test account password | TestDriver123! |
| E2E_PASSENGER_EMAIL | Passenger test account email | e2e-passenger@test.carpoolnetwork.co.uk |
| E2E_PASSENGER_PASSWORD | Passenger test account password | TestPassenger123! |
| E2E_ADMIN_EMAIL | Admin test account email | admin@carpoolnetwork.co.uk |
| E2E_ADMIN_PASSWORD | Admin test account password | AdminTest123! |

## Capacitor Compatibility

Tests are designed to work with both web and Capacitor builds:
- Uses standard web selectors that work in WebView
- Avoids native-only APIs
- Uses flexible element selectors with fallbacks

## CI/CD Integration

For CI environments, set `CI=true` to:
- Disable dev server reuse
- Enable retries (2 attempts)
- Generate artifacts on failure

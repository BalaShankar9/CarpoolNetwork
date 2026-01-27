# SEO Audit Runbook

## Overview

The SEO Audit tool is an internal Playwright-based crawler that performs comprehensive SEO analysis of the CarpoolNetwork application. It produces Screaming Frog-like reports in CSV, HTML, and JSON formats.

## Quick Start

```bash
# Crawl production (public pages only)
npm run audit:seo

# Crawl localhost
npm run audit:seo:local

# Crawl with authentication
AUDIT_EMAIL=test@example.com AUDIT_PASSWORD=yourpassword npm run audit:seo:auth
```

## Prerequisites

- Node.js 18+
- Playwright (installed automatically)
- For authenticated crawling: a dedicated test account

## Directory Structure

```
tools/seo-audit/
├── package.json           # Tool dependencies
├── tsconfig.json          # TypeScript config
├── sites.json             # Site configuration
├── .gitignore             # Ignore generated files
├── src/
│   ├── index.ts           # CLI entry point
│   ├── crawler.ts         # Playwright crawler
│   ├── types.ts           # TypeScript types
│   └── reporters/
│       ├── csv.ts         # CSV report generator
│       ├── html.ts        # HTML report generator
│       └── json.ts        # JSON report generator
└── reports/               # Generated reports
```

## Commands

### Basic Crawling

```bash
# Crawl all enabled sites in sites.json
npm run audit:seo

# Crawl localhost only
npm run audit:seo:local
# or
npm run audit:seo -- --local

# Crawl staging only
npm run audit:seo -- --staging

# Crawl production only
npm run audit:seo -- --production
```

### Authenticated Crawling

To crawl protected pages, set environment variables and use the `--auth` flag:

```bash
# Set credentials (Linux/macOS)
export AUDIT_EMAIL="your-test-account@example.com"
export AUDIT_PASSWORD="your-password"

# Run with auth
npm run audit:seo -- --auth

# Or inline (not recommended for production)
AUDIT_EMAIL=test@example.com AUDIT_PASSWORD=password npm run audit:seo -- --auth
```

### Admin Crawling

To include admin routes (requires admin account):

```bash
AUDIT_EMAIL=admin@example.com AUDIT_PASSWORD=password npm run audit:seo -- --auth --admin
```

### Advanced Options

```bash
# Limit to 50 pages
npm run audit:seo -- --max=50

# Adjust concurrency (default: 3)
npm run audit:seo -- --concurrency=5

# Adjust delay between batches (default: 500ms)
npm run audit:seo -- --delay=1000

# Combine options
npm run audit:seo -- --local --auth --max=100 --concurrency=2
```

## Configuration

### sites.json

Edit `tools/seo-audit/sites.json` to configure sites and options:

```json
{
  "sites": [
    {
      "name": "Production",
      "baseUrl": "https://carpoolnetwork.co.uk",
      "enabled": true,
      "crawlProtected": false,
      "crawlAdmin": false
    },
    {
      "name": "Local Development",
      "baseUrl": "http://localhost:5173",
      "enabled": false,
      "crawlProtected": true,
      "crawlAdmin": false
    }
  ],
  "options": {
    "concurrency": 3,
    "delayBetweenRequests": 500,
    "maxPages": 0,
    "timeout": 30000,
    "userAgent": "CarpoolNetwork-SEO-Audit/1.0 (internal)"
  },
  "seedPaths": ["/", "/how-it-works", "..."],
  "excludePatterns": ["/api/", "*.pdf", "..."],
  "protectedSeedPaths": ["/find-rides", "/my-rides", "..."],
  "adminSeedPaths": ["/admin", "/admin/users", "..."]
}
```

### Enabling Sites

To enable a site:
1. Edit `sites.json` and set `"enabled": true`
2. Or use CLI flags: `--local`, `--staging`, `--production`

### Adding New Subdomains

Add new sites to the `sites` array:

```json
{
  "name": "Admin Portal",
  "baseUrl": "https://admin.carpoolnetwork.co.uk",
  "enabled": true,
  "crawlProtected": true,
  "crawlAdmin": true
}
```

## Reports

Reports are saved to `tools/seo-audit/reports/` with timestamps:

- `seo-audit-YYYY-MM-DD-HHMM-pages.csv` - All pages data
- `seo-audit-YYYY-MM-DD-HHMM-issues.csv` - All issues found
- `seo-audit-YYYY-MM-DD-HHMM.html` - Interactive HTML report
- `seo-audit-YYYY-MM-DD-HHMM.json` - Raw JSON data

### HTML Report Features

The HTML report includes:
- Summary statistics dashboard
- Filterable issues table (by severity, category, URL)
- Sortable pages table
- Tabs for switching between Issues and Pages views

### CSV Report Fields

**Pages CSV:**
- URL, Final URL, Status Code
- Title, Title Length
- Meta Description, Meta Desc Length
- Canonical, Robots
- H1 Count, H1 Text
- OG Title, OG Description, OG Image
- Twitter Card
- Internal Links, External Links, Broken Links
- JS Errors, Load Time (ms)
- Redirects, Site, Crawled At, Error

**Issues CSV:**
- Severity (critical/warning/info)
- Category
- URL
- Message
- Recommendation

## Interpreting Results

### Severity Levels

| Severity | Description | Action |
|----------|-------------|--------|
| Critical | Major SEO problems that will impact rankings | Fix immediately |
| Warning | Issues that may impact SEO | Fix in next sprint |
| Info | Minor improvements | Consider for backlog |

### Common Issues

| Issue | Impact | Solution |
|-------|--------|----------|
| Missing Title | High - Page won't rank well | Add `<Seo title="..." />` component |
| Missing Meta Description | Medium - Lower CTR in search results | Add description prop to Seo |
| Missing H1 | Medium - Unclear page structure | Add single H1 element |
| Multiple H1s | Low - Confusing structure | Consolidate to single H1 |
| Missing Canonical | Medium - Duplicate content risk | Add canonical prop to Seo |
| Missing OG Tags | Low - Poor social sharing | Add og:title, og:description |
| Slow Load Time | High - User experience + ranking | Optimize bundle, images |
| JS Errors | High - Broken functionality | Fix console errors |
| 4xx/5xx Status | Critical - Broken pages | Fix server/routing issues |

### Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | None needed |
| 301/302 | Redirect | Ensure redirects are intentional |
| 404 | Not Found | Fix broken links or add page |
| 500 | Server Error | Debug server-side issue |

## Route Registry

The crawler uses `src/lib/routeRegistry.ts` to seed URLs. This ensures all routes are crawled even if not linked.

### Updating Routes

When adding new routes to the app:

1. Add to appropriate array in `src/lib/routeRegistry.ts`:
   - `publicRoutes` - SEO-indexable public pages
   - `cityRoutes` - Dynamic city pages
   - `authRoutes` - Authentication pages
   - `protectedRoutes` - Logged-in user pages
   - `adminRoutes` - Admin dashboard pages

2. Update `tools/seo-audit/sites.json` seed paths if needed

### Example: Adding a New Public Page

```typescript
// src/lib/routeRegistry.ts
export const publicRoutes: RouteEntry[] = [
  // ... existing routes
  {
    path: '/about',
    name: 'About Us',
    access: 'public',
    seoIndexable: true,
    priority: 'high'
  },
];
```

Then add to `tools/seo-audit/sites.json`:
```json
"seedPaths": [
  "/",
  "/about",  // new route
  // ...
]
```

## Crawling Multiple Subdomains

To crawl multiple subdomains in one run:

1. Enable multiple sites in `sites.json`:
```json
"sites": [
  { "name": "Main", "baseUrl": "https://carpoolnetwork.co.uk", "enabled": true },
  { "name": "WWW", "baseUrl": "https://www.carpoolnetwork.co.uk", "enabled": true },
  { "name": "Staging", "baseUrl": "https://staging.carpoolnetwork.co.uk", "enabled": true }
]
```

2. Run the crawler:
```bash
npm run audit:seo
```

The crawler will:
- Crawl seed paths on each enabled site
- Follow internal links within and across listed subdomains
- Deduplicate URLs
- Generate a combined report

## Best Practices

### For Regular Audits

1. **Weekly**: Run on production public pages
   ```bash
   npm run audit:seo -- --production
   ```

2. **Before Releases**: Run full audit including auth
   ```bash
   npm run audit:seo -- --staging --auth
   ```

3. **After Major Changes**: Run with higher concurrency
   ```bash
   npm run audit:seo -- --production --max=500 --concurrency=5
   ```

### Test Account Setup

1. Create a dedicated test account (not your personal account)
2. Use a strong password
3. Store credentials securely (not in code)
4. Consider using environment variables from a secrets manager

### Rate Limiting

The default settings (3 concurrent, 500ms delay) are conservative. For production:
- Don't exceed 5 concurrent requests
- Maintain at least 250ms delay
- Run during off-peak hours for large crawls

## Troubleshooting

### "No sites enabled"
Enable at least one site in `sites.json` or use `--local`, `--staging`, or `--production` flag.

### "Authentication failed"
1. Verify credentials are correct
2. Check that the test account exists and is not locked
3. Ensure the signin page is accessible

### "Timeout exceeded"
1. Increase timeout in `sites.json`: `"timeout": 60000`
2. Check if the site is accessible
3. Reduce concurrency: `--concurrency=1`

### "Browser launch failed"
1. Ensure Playwright browsers are installed:
   ```bash
   cd tools/seo-audit && npx playwright install chromium
   ```
2. On CI, you may need additional dependencies:
   ```bash
   npx playwright install-deps
   ```

### Empty Reports
1. Check that seed URLs are accessible
2. Verify the base URL is correct
3. Look for console errors during crawl

## CI/CD Integration

Example GitHub Action:

```yaml
name: SEO Audit
on:
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday 6am
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Playwright
        run: |
          cd tools/seo-audit
          npm install
          npx playwright install chromium
          npx playwright install-deps

      - name: Run SEO Audit
        env:
          AUDIT_EMAIL: ${{ secrets.AUDIT_EMAIL }}
          AUDIT_PASSWORD: ${{ secrets.AUDIT_PASSWORD }}
        run: npm run audit:seo -- --production --auth

      - name: Upload Reports
        uses: actions/upload-artifact@v4
        with:
          name: seo-reports
          path: tools/seo-audit/reports/
```

## Security Notes

- **Never commit credentials** to the repository
- Use environment variables or secrets management
- The test account should have minimal necessary permissions
- Admin crawling should only be done in staging/development
- Reports may contain sensitive URL patterns - handle accordingly

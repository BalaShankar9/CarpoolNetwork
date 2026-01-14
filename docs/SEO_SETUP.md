# SEO Setup Guide

This document outlines the SEO implementation for CarpoolNetwork and provides a checklist for Search Console submission.

## Overview

The SEO baseline includes:
- `robots.txt` - Crawler instructions
- `sitemap.xml` - Page index for search engines
- `<Seo />` component - Reusable meta tag management
- Canonical host enforcement via Netlify
- Public marketing pages with structured data

## File Structure

```
public/
  ├── robots.txt          # Crawler rules
  └── sitemap.xml         # Sitemap for search engines

src/
  ├── components/shared/
  │   └── Seo.tsx         # Reusable SEO component
  └── pages/public/
      ├── LandingPage.tsx # Homepage (/)
      ├── HowItWorks.tsx  # How it works (/how-it-works)
      ├── SafetyInfo.tsx  # Safety information (/safety-info)
      ├── Communities.tsx # Communities directory (/communities)
      └── CityPage.tsx    # City pages (/cities/:city)
```

## Indexed Public Pages

These pages are configured to be indexed by search engines:

| URL | Page | Priority |
|-----|------|----------|
| `/` | Homepage/Landing | 1.0 |
| `/how-it-works` | How It Works | 0.8 |
| `/safety-info` | Safety Information | 0.7 |
| `/communities` | Communities Directory | 0.8 |
| `/cities/cardiff` | Cardiff City Page | 0.7 |
| `/cities/sheffield` | Sheffield City Page | 0.7 |
| `/terms` | Terms of Service | 0.3 |
| `/privacy` | Privacy Policy | 0.3 |

## Private Pages (NOINDEX)

The following routes are blocked in `robots.txt` and should use `noIndex` in the `<Seo />` component:

- `/signin`, `/signup` - Auth pages
- `/profile`, `/settings`, `/preferences` - User settings
- `/messages` - Private messaging
- `/admin/*` - Admin dashboard
- `/rides/*`, `/bookings/*` - Ride details
- `/onboarding/*` - Profile setup

## Using the Seo Component

### Basic Usage (Public Page)
```tsx
import Seo from '@/components/shared/Seo';

export default function MyPublicPage() {
  return (
    <>
      <Seo
        title="Page Title"
        description="Page description for search results (150-160 chars)"
        canonical="/my-page"
      />
      {/* Page content */}
    </>
  );
}
```

### Private Page (NOINDEX)
```tsx
import { PrivatePageSeo } from '@/components/shared/Seo';

export default function MyPrivatePage() {
  return (
    <>
      <PrivatePageSeo title="Private Dashboard" />
      {/* Page content */}
    </>
  );
}
```

### With Custom JSON-LD
```tsx
<Seo
  title="Cardiff Carpooling"
  description="Find carpool partners in Cardiff"
  canonical="/cities/cardiff"
  jsonLd={{
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: 'Cardiff',
    description: 'Carpooling community in Cardiff, Wales'
  }}
/>
```

## Netlify Configuration

The `netlify.toml` includes:

1. **Canonical Host Redirect**
   - `www.carpoolnetwork.co.uk` → `carpoolnetwork.co.uk` (301)

2. **Static File Serving**
   - `/robots.txt` and `/sitemap.xml` served directly

3. **Security Headers**
   - HSTS, X-Frame-Options, X-Content-Type-Options
   - Referrer-Policy, Permissions-Policy

4. **Cache Headers**
   - Assets: 1 year (immutable)
   - SEO files: 24 hours

---

## Search Console Submission Checklist

### Pre-Submission Verification

- [ ] **Deploy to production** - Push changes to Netlify
- [ ] **Verify robots.txt** - Visit `https://carpoolnetwork.co.uk/robots.txt`
- [ ] **Verify sitemap.xml** - Visit `https://carpoolnetwork.co.uk/sitemap.xml`
- [ ] **Verify canonical redirect** - `www.carpoolnetwork.co.uk` should 301 to `carpoolnetwork.co.uk`

### Google Search Console Setup

1. **Add Property**
   - [ ] Go to [Google Search Console](https://search.google.com/search-console)
   - [ ] Add property: `https://carpoolnetwork.co.uk`
   - [ ] Choose "URL prefix" method

2. **Verify Ownership**
   - [ ] Use DNS verification (recommended) OR
   - [ ] Use HTML file verification OR
   - [ ] Use HTML meta tag verification

3. **Submit Sitemap**
   - [ ] Navigate to Sitemaps in left menu
   - [ ] Enter: `sitemap.xml`
   - [ ] Click Submit
   - [ ] Wait for "Success" status

4. **Request Indexing**
   - [ ] Use URL Inspection tool
   - [ ] Enter: `https://carpoolnetwork.co.uk/`
   - [ ] Click "Request Indexing"
   - [ ] Repeat for key pages:
     - `/how-it-works`
     - `/communities`
     - `/safety-info`

### Bing Webmaster Tools (Optional)

1. [ ] Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. [ ] Import from Google Search Console (easiest)
3. [ ] Submit sitemap if not auto-imported

---

## Post-Launch Monitoring

### Weekly Tasks
- [ ] Check Search Console for crawl errors
- [ ] Review coverage report for indexing issues
- [ ] Monitor mobile usability report

### Monthly Tasks
- [ ] Review search performance (clicks, impressions)
- [ ] Check Core Web Vitals
- [ ] Update sitemap `lastmod` dates if content changes

### When Adding New Pages
1. Add route to `App.tsx`
2. Add URL to `sitemap.xml`
3. Use `<Seo />` component with appropriate meta
4. Submit new URL in Search Console

---

## Structured Data

The following JSON-LD schemas are implemented:

### Organization (All Pages)
```json
{
  "@type": "Organization",
  "name": "CarpoolNetwork",
  "url": "https://carpoolnetwork.co.uk",
  "logo": "https://carpoolnetwork.co.uk/logo.png"
}
```

### WebSite with SearchAction (Homepage)
```json
{
  "@type": "WebSite",
  "name": "CarpoolNetwork",
  "url": "https://carpoolnetwork.co.uk",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://carpoolnetwork.co.uk/find-rides?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

### HowTo (How It Works Page)
Schema for step-by-step instructions on using the platform.

### FAQPage (Safety Info Page)
Schema for frequently asked safety questions.

### ItemList (Communities Page)
Schema listing available carpooling communities.

### Place (City Pages)
Schema for city-specific pages with location data.

---

## Troubleshooting

### Sitemap Not Found
- Verify file is in `/public/sitemap.xml`
- Check Netlify deploy logs
- Test URL directly: `curl https://carpoolnetwork.co.uk/sitemap.xml`

### Pages Not Being Indexed
1. Check `robots.txt` isn't blocking the page
2. Verify page returns 200 status
3. Ensure `<Seo noIndex />` isn't set
4. Request indexing in Search Console

### Canonical Issues
- Each page should have exactly one canonical URL
- Check for trailing slash consistency
- Verify canonical matches sitemap URL

---

## Quick Reference

| Task | Command/Location |
|------|------------------|
| Test robots.txt | `curl https://carpoolnetwork.co.uk/robots.txt` |
| Test sitemap.xml | `curl https://carpoolnetwork.co.uk/sitemap.xml` |
| Validate structured data | [Schema.org Validator](https://validator.schema.org/) |
| Test mobile-friendliness | [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly) |
| Check Core Web Vitals | [PageSpeed Insights](https://pagespeed.web.dev/) |

---

**Last Updated:** January 2025

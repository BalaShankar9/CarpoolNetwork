/**
 * SEO Component
 * 
 * Reusable component for managing page-level SEO meta tags.
 * Uses react-helmet-async for SSR-safe meta tag management.
 * 
 * Features:
 * - Title and description meta tags
 * - Canonical URL
 * - OpenGraph tags for social sharing
 * - Twitter Card tags
 * - JSON-LD structured data (Organization + WebSite)
 * - Configurable robots directive (INDEX/NOINDEX)
 */

import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'CarpoolNetwork';
const SITE_URL = 'https://carpoolnetwork.co.uk';
const DEFAULT_DESCRIPTION = 'Share rides, save money, and reduce your carbon footprint. Join the UK\'s trusted carpooling community for commuters and travelers.';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;
const TWITTER_HANDLE = '@carpoolnetwork';

interface SeoProps {
  /** Page title - will be appended with site name */
  title?: string;
  /** Meta description - max 160 characters recommended */
  description?: string;
  /** Canonical URL path (e.g., '/how-it-works') */
  canonical?: string;
  /** OpenGraph image URL */
  image?: string;
  /** Whether search engines should index this page */
  noIndex?: boolean;
  /** Page type for OpenGraph */
  type?: 'website' | 'article';
  /** Additional JSON-LD structured data */
  jsonLd?: Record<string, unknown>;
}

// Organization schema - consistent across all pages
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'CarpoolNetwork',
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  description: DEFAULT_DESCRIPTION,
  sameAs: [
    'https://twitter.com/carpoolnetwork',
    'https://www.facebook.com/carpoolnetwork',
    'https://www.linkedin.com/company/carpoolnetwork',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'support@carpoolnetwork.co.uk',
  },
};

// WebSite schema with search action
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'CarpoolNetwork',
  url: SITE_URL,
  description: DEFAULT_DESCRIPTION,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/find-rides?from={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  image = DEFAULT_IMAGE,
  noIndex = false,
  type = 'website',
  jsonLd,
}: SeoProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Share Rides, Save Money`;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : undefined;
  const robotsContent = noIndex ? 'noindex, nofollow' : 'index, follow';

  // Combine all JSON-LD schemas
  const combinedJsonLd = [organizationSchema, websiteSchema];
  if (jsonLd) {
    combinedJsonLd.push(jsonLd as typeof organizationSchema);
  }

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robotsContent} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* OpenGraph Tags */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:locale" content="en_GB" />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(combinedJsonLd)}
      </script>
    </Helmet>
  );
}

/**
 * Default SEO for private/app routes - ensures NOINDEX
 */
export function PrivatePageSeo({ title }: { title?: string }) {
  return (
    <Seo
      title={title}
      noIndex={true}
      description="CarpoolNetwork - Your trusted carpooling platform."
    />
  );
}

/**
 * SEO Audit Types
 */

export interface SiteConfig {
  name: string;
  baseUrl: string;
  enabled: boolean;
  crawlProtected: boolean;
  crawlAdmin: boolean;
}

export interface CrawlOptions {
  concurrency: number;
  delayBetweenRequests: number;
  maxPages: number; // 0 = unlimited
  timeout: number;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  followExternalLinks: boolean;
  respectRobotsTxt: boolean;
  screenshotOnError: boolean;
}

export interface SitesConfig {
  sites: SiteConfig[];
  options: CrawlOptions;
  seedPaths: string[];
  excludePatterns: string[];
  protectedSeedPaths: string[];
  adminSeedPaths: string[];
}

export interface PageMetadata {
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  h1Count: number;
  h1Text: string[];
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogUrl: string | null;
  twitterCard: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  jsonLd: string[];
  viewport: string | null;
  charset: string | null;
  lang: string | null;
}

export interface LinkInfo {
  href: string;
  text: string;
  isInternal: boolean;
  isExternal: boolean;
  isBroken: boolean;
  statusCode?: number;
}

export interface ConsoleMessage {
  type: 'error' | 'warning' | 'log' | 'info';
  text: string;
}

export interface PageResult {
  url: string;
  normalizedUrl: string;
  finalUrl: string;
  statusCode: number;
  redirectChain: string[];
  metadata: PageMetadata;
  internalLinks: LinkInfo[];
  externalLinks: LinkInfo[];
  brokenLinks: LinkInfo[];
  consoleErrors: ConsoleMessage[];
  loadTimeMs: number;
  crawledAt: string;
  site: string;
  error?: string;
}

export interface CrawlStats {
  totalPages: number;
  successfulPages: number;
  failedPages: number;
  redirectedPages: number;
  pagesWithErrors: number;
  pagesWithBrokenLinks: number;
  pagesWithMissingTitle: number;
  pagesWithMissingDescription: number;
  pagesWithMissingH1: number;
  pagesWithMultipleH1: number;
  pagesWithNoIndex: number;
  avgLoadTimeMs: number;
  totalCrawlTimeMs: number;
}

export interface CrawlReport {
  generatedAt: string;
  sites: string[];
  stats: CrawlStats;
  pages: PageResult[];
  brokenLinksReport: {
    sourceUrl: string;
    brokenUrl: string;
    linkText: string;
  }[];
  issues: SEOIssue[];
}

export interface SEOIssue {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  url: string;
  message: string;
  recommendation: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface CrawlerState {
  visited: Set<string>;
  queue: string[];
  results: PageResult[];
  isAuthenticated: boolean;
}

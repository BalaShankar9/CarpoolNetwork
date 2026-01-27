/**
 * SEO Audit Crawler
 *
 * Playwright-based crawler that handles SPA navigation,
 * authentication, and comprehensive SEO data collection.
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import {
  SiteConfig,
  CrawlOptions,
  PageResult,
  PageMetadata,
  LinkInfo,
  ConsoleMessage,
  AuthCredentials,
  CrawlerState,
  CrawlReport,
  CrawlStats,
  SEOIssue,
} from './types.js';

export class SEOCrawler {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private options: CrawlOptions;
  private state: CrawlerState;
  private sites: SiteConfig[];
  private seedPaths: string[];
  private excludePatterns: RegExp[];
  private credentials: AuthCredentials | null = null;
  private onProgress?: (current: number, total: number, url: string) => void;

  constructor(
    sites: SiteConfig[],
    options: CrawlOptions,
    seedPaths: string[],
    excludePatterns: string[]
  ) {
    this.sites = sites.filter(s => s.enabled);
    this.options = options;
    this.seedPaths = seedPaths;
    this.excludePatterns = excludePatterns.map(p => this.patternToRegex(p));
    this.state = {
      visited: new Set(),
      queue: [],
      results: [],
      isAuthenticated: false,
    };
  }

  setProgressCallback(callback: (current: number, total: number, url: string) => void): void {
    this.onProgress = callback;
  }

  setCredentials(email: string, password: string): void {
    this.credentials = { email, password };
  }

  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(escaped, 'i');
  }

  private normalizeUrl(url: string, baseUrl: string): string {
    try {
      const parsed = new URL(url, baseUrl);
      // Remove trailing slash, hash, and normalize
      let normalized = parsed.origin + parsed.pathname.replace(/\/$/, '');
      // Keep query params for uniqueness but sort them
      if (parsed.search) {
        const params = new URLSearchParams(parsed.search);
        params.sort();
        normalized += '?' + params.toString();
      }
      return normalized || parsed.origin;
    } catch {
      return url;
    }
  }

  private isInternalUrl(url: string, baseUrls: string[]): boolean {
    try {
      const parsed = new URL(url);
      return baseUrls.some(base => {
        const baseHost = new URL(base).hostname;
        return parsed.hostname === baseHost || parsed.hostname.endsWith('.' + baseHost);
      });
    } catch {
      return false;
    }
  }

  private shouldExclude(url: string): boolean {
    return this.excludePatterns.some(pattern => pattern.test(url));
  }

  async initialize(): Promise<void> {
    console.log('Launching browser...');
    this.browser = await chromium.launch({
      headless: true,
    });
    this.context = await this.browser.newContext({
      userAgent: this.options.userAgent,
      viewport: this.options.viewport,
    });
  }

  async authenticate(site: SiteConfig): Promise<boolean> {
    if (!this.credentials || !this.context) {
      return false;
    }

    console.log(`Authenticating on ${site.name}...`);
    const page = await this.context.newPage();

    try {
      await page.goto(`${site.baseUrl}/signin`, {
        waitUntil: 'networkidle',
        timeout: this.options.timeout,
      });

      // Wait for the sign-in form to be ready
      await page.waitForSelector('input[type="email"], input[name="email"]', {
        timeout: 10000,
      });

      // Fill in credentials
      await page.fill('input[type="email"], input[name="email"]', this.credentials.email);
      await page.fill('input[type="password"], input[name="password"]', this.credentials.password);

      // Click submit button
      await page.click('button[type="submit"]');

      // Wait for navigation or auth state change
      await page.waitForURL(url => !url.includes('/signin'), {
        timeout: 30000,
      });

      // Verify we're logged in by checking for auth indicators
      await page.waitForTimeout(2000);

      const isLoggedIn = await page.evaluate(() => {
        // Check for common auth indicators
        return (
          document.querySelector('[data-testid="user-menu"]') !== null ||
          document.querySelector('.user-avatar') !== null ||
          !window.location.pathname.includes('/signin')
        );
      });

      if (isLoggedIn) {
        console.log('Authentication successful!');
        this.state.isAuthenticated = true;
      } else {
        console.log('Authentication may have failed - proceeding anyway');
      }

      return isLoggedIn;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    } finally {
      await page.close();
    }
  }

  async crawlPage(url: string, site: SiteConfig): Promise<PageResult> {
    if (!this.context) {
      throw new Error('Crawler not initialized');
    }

    const page = await this.context.newPage();
    const consoleMessages: ConsoleMessage[] = [];
    const redirectChain: string[] = [];

    // Capture console messages
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        consoleMessages.push({
          type: type as 'error' | 'warning',
          text: msg.text(),
        });
      }
    });

    // Track redirects
    page.on('response', response => {
      if (response.status() >= 300 && response.status() < 400) {
        redirectChain.push(response.url());
      }
    });

    const startTime = Date.now();
    let statusCode = 0;
    let finalUrl = url;
    let error: string | undefined;

    try {
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.options.timeout,
      });

      statusCode = response?.status() || 0;
      finalUrl = page.url();

      // Wait for SPA hydration
      await page.waitForTimeout(1000);

      // Wait for React to settle
      await page.evaluate(() => {
        return new Promise<void>(resolve => {
          if (document.readyState === 'complete') {
            setTimeout(resolve, 500);
          } else {
            window.addEventListener('load', () => setTimeout(resolve, 500));
          }
        });
      });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      statusCode = 0;
    }

    const loadTimeMs = Date.now() - startTime;

    // Extract metadata
    const metadata = await this.extractMetadata(page);

    // Extract links
    const { internalLinks, externalLinks } = await this.extractLinks(
      page,
      site.baseUrl,
      this.sites.map(s => s.baseUrl)
    );

    await page.close();

    return {
      url,
      normalizedUrl: this.normalizeUrl(url, site.baseUrl),
      finalUrl,
      statusCode,
      redirectChain,
      metadata,
      internalLinks,
      externalLinks,
      brokenLinks: [], // Will be populated during link verification
      consoleErrors: consoleMessages.filter(m => m.type === 'error'),
      loadTimeMs,
      crawledAt: new Date().toISOString(),
      site: site.name,
      error,
    };
  }

  private async extractMetadata(page: Page): Promise<PageMetadata> {
    return page.evaluate(() => {
      const getMetaContent = (selector: string): string | null => {
        const el = document.querySelector(selector);
        return el?.getAttribute('content') || null;
      };

      const h1Elements = document.querySelectorAll('h1');
      const h1Text = Array.from(h1Elements).map(el => el.textContent?.trim() || '');

      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      const jsonLd = Array.from(jsonLdScripts).map(el => el.textContent || '');

      return {
        title: document.title || null,
        metaDescription: getMetaContent('meta[name="description"]'),
        canonical:
          document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
        robotsMeta: getMetaContent('meta[name="robots"]'),
        h1Count: h1Elements.length,
        h1Text,
        ogTitle: getMetaContent('meta[property="og:title"]'),
        ogDescription: getMetaContent('meta[property="og:description"]'),
        ogImage: getMetaContent('meta[property="og:image"]'),
        ogUrl: getMetaContent('meta[property="og:url"]'),
        twitterCard: getMetaContent('meta[name="twitter:card"]'),
        twitterTitle: getMetaContent('meta[name="twitter:title"]'),
        twitterDescription: getMetaContent('meta[name="twitter:description"]'),
        jsonLd,
        viewport: getMetaContent('meta[name="viewport"]'),
        charset: document.characterSet || null,
        lang: document.documentElement.lang || null,
      };
    });
  }

  private async extractLinks(
    page: Page,
    currentBase: string,
    allBases: string[]
  ): Promise<{ internalLinks: LinkInfo[]; externalLinks: LinkInfo[] }> {
    const links = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a[href]');
      return Array.from(anchors).map(a => ({
        href: a.getAttribute('href') || '',
        text: a.textContent?.trim().slice(0, 100) || '',
      }));
    });

    const internalLinks: LinkInfo[] = [];
    const externalLinks: LinkInfo[] = [];

    for (const link of links) {
      try {
        const absoluteUrl = new URL(link.href, currentBase).href;

        if (this.shouldExclude(absoluteUrl)) {
          continue;
        }

        const isInternal = this.isInternalUrl(absoluteUrl, allBases);

        const linkInfo: LinkInfo = {
          href: absoluteUrl,
          text: link.text,
          isInternal,
          isExternal: !isInternal,
          isBroken: false,
        };

        if (isInternal) {
          internalLinks.push(linkInfo);
        } else {
          externalLinks.push(linkInfo);
        }
      } catch {
        // Invalid URL, skip
      }
    }

    return { internalLinks, externalLinks };
  }

  async crawl(
    protectedPaths: string[] = [],
    adminPaths: string[] = []
  ): Promise<CrawlReport> {
    const startTime = Date.now();
    await this.initialize();

    if (!this.context) {
      throw new Error('Failed to initialize browser context');
    }

    const baseUrls = this.sites.map(s => s.baseUrl);

    // Build initial queue for each enabled site
    for (const site of this.sites) {
      // Add seed paths
      for (const path of this.seedPaths) {
        const url = `${site.baseUrl}${path}`;
        if (!this.state.visited.has(this.normalizeUrl(url, site.baseUrl))) {
          this.state.queue.push(url);
        }
      }

      // Authenticate if credentials provided and site allows protected crawling
      if (this.credentials && site.crawlProtected) {
        await this.authenticate(site);

        if (this.state.isAuthenticated) {
          // Add protected paths
          for (const path of protectedPaths) {
            const url = `${site.baseUrl}${path}`;
            if (!this.state.visited.has(this.normalizeUrl(url, site.baseUrl))) {
              this.state.queue.push(url);
            }
          }

          // Add admin paths if enabled
          if (site.crawlAdmin) {
            for (const path of adminPaths) {
              const url = `${site.baseUrl}${path}`;
              if (!this.state.visited.has(this.normalizeUrl(url, site.baseUrl))) {
                this.state.queue.push(url);
              }
            }
          }
        }
      }
    }

    // Deduplicate queue
    this.state.queue = [...new Set(this.state.queue)];

    console.log(`Starting crawl with ${this.state.queue.length} seed URLs...`);

    let processedCount = 0;
    const totalEstimate = this.state.queue.length;

    // Process queue with concurrency limit
    while (this.state.queue.length > 0) {
      // Check max pages limit
      if (this.options.maxPages > 0 && this.state.results.length >= this.options.maxPages) {
        console.log(`Reached max pages limit (${this.options.maxPages})`);
        break;
      }

      // Get batch of URLs to process
      const batchSize = Math.min(this.options.concurrency, this.state.queue.length);
      const batch = this.state.queue.splice(0, batchSize);

      // Process batch concurrently
      const promises = batch.map(async url => {
        const normalizedUrl = this.normalizeUrl(url, baseUrls[0]);

        if (this.state.visited.has(normalizedUrl)) {
          return null;
        }

        this.state.visited.add(normalizedUrl);

        // Find which site this URL belongs to
        const site = this.sites.find(s => url.startsWith(s.baseUrl));
        if (!site) {
          return null;
        }

        try {
          const result = await this.crawlPage(url, site);
          processedCount++;

          if (this.onProgress) {
            this.onProgress(processedCount, Math.max(totalEstimate, this.state.queue.length + processedCount), url);
          }

          // Add discovered internal links to queue
          for (const link of result.internalLinks) {
            const linkNormalized = this.normalizeUrl(link.href, site.baseUrl);
            if (
              !this.state.visited.has(linkNormalized) &&
              !this.state.queue.includes(link.href) &&
              !this.shouldExclude(link.href)
            ) {
              // Only add if within allowed domains
              if (this.isInternalUrl(link.href, baseUrls)) {
                this.state.queue.push(link.href);
              }
            }
          }

          return result;
        } catch (error) {
          console.error(`Error crawling ${url}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);
      this.state.results.push(...results.filter((r): r is PageResult => r !== null));

      // Delay between batches
      if (this.options.delayBetweenRequests > 0 && this.state.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.options.delayBetweenRequests));
      }
    }

    await this.close();

    const totalCrawlTimeMs = Date.now() - startTime;

    return this.generateReport(totalCrawlTimeMs);
  }

  private generateReport(totalCrawlTimeMs: number): CrawlReport {
    const pages = this.state.results;

    // Calculate stats
    const stats: CrawlStats = {
      totalPages: pages.length,
      successfulPages: pages.filter(p => p.statusCode >= 200 && p.statusCode < 300).length,
      failedPages: pages.filter(p => p.statusCode >= 400 || p.statusCode === 0).length,
      redirectedPages: pages.filter(p => p.redirectChain.length > 0).length,
      pagesWithErrors: pages.filter(p => p.consoleErrors.length > 0).length,
      pagesWithBrokenLinks: pages.filter(p => p.brokenLinks.length > 0).length,
      pagesWithMissingTitle: pages.filter(p => !p.metadata.title).length,
      pagesWithMissingDescription: pages.filter(p => !p.metadata.metaDescription).length,
      pagesWithMissingH1: pages.filter(p => p.metadata.h1Count === 0).length,
      pagesWithMultipleH1: pages.filter(p => p.metadata.h1Count > 1).length,
      pagesWithNoIndex: pages.filter(p =>
        p.metadata.robotsMeta?.toLowerCase().includes('noindex')
      ).length,
      avgLoadTimeMs: pages.length > 0
        ? Math.round(pages.reduce((sum, p) => sum + p.loadTimeMs, 0) / pages.length)
        : 0,
      totalCrawlTimeMs,
    };

    // Generate broken links report
    const brokenLinksReport: CrawlReport['brokenLinksReport'] = [];
    for (const page of pages) {
      for (const link of page.brokenLinks) {
        brokenLinksReport.push({
          sourceUrl: page.url,
          brokenUrl: link.href,
          linkText: link.text,
        });
      }
    }

    // Generate SEO issues
    const issues = this.analyzeIssues(pages);

    return {
      generatedAt: new Date().toISOString(),
      sites: this.sites.map(s => s.name),
      stats,
      pages,
      brokenLinksReport,
      issues,
    };
  }

  private analyzeIssues(pages: PageResult[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    for (const page of pages) {
      // Critical issues
      if (page.statusCode >= 400 || page.statusCode === 0) {
        issues.push({
          severity: 'critical',
          category: 'HTTP Status',
          url: page.url,
          message: `Page returned status ${page.statusCode}${page.error ? `: ${page.error}` : ''}`,
          recommendation: 'Fix the server error or remove broken links to this page',
        });
      }

      if (!page.metadata.title) {
        issues.push({
          severity: 'critical',
          category: 'Title',
          url: page.url,
          message: 'Page is missing a title tag',
          recommendation: 'Add a unique, descriptive title tag (50-60 characters)',
        });
      } else if (page.metadata.title.length > 60) {
        issues.push({
          severity: 'warning',
          category: 'Title',
          url: page.url,
          message: `Title is too long (${page.metadata.title.length} characters)`,
          recommendation: 'Shorten the title to 50-60 characters',
        });
      }

      if (!page.metadata.metaDescription) {
        issues.push({
          severity: 'critical',
          category: 'Meta Description',
          url: page.url,
          message: 'Page is missing a meta description',
          recommendation: 'Add a compelling meta description (150-160 characters)',
        });
      } else if (page.metadata.metaDescription.length > 160) {
        issues.push({
          severity: 'warning',
          category: 'Meta Description',
          url: page.url,
          message: `Meta description is too long (${page.metadata.metaDescription.length} characters)`,
          recommendation: 'Shorten the meta description to 150-160 characters',
        });
      }

      if (page.metadata.h1Count === 0) {
        issues.push({
          severity: 'warning',
          category: 'H1',
          url: page.url,
          message: 'Page is missing an H1 tag',
          recommendation: 'Add a single H1 tag that describes the page content',
        });
      } else if (page.metadata.h1Count > 1) {
        issues.push({
          severity: 'warning',
          category: 'H1',
          url: page.url,
          message: `Page has multiple H1 tags (${page.metadata.h1Count})`,
          recommendation: 'Use only one H1 tag per page',
        });
      }

      if (!page.metadata.canonical) {
        issues.push({
          severity: 'warning',
          category: 'Canonical',
          url: page.url,
          message: 'Page is missing a canonical URL',
          recommendation: 'Add a canonical link element to prevent duplicate content issues',
        });
      }

      if (!page.metadata.ogTitle || !page.metadata.ogDescription) {
        issues.push({
          severity: 'info',
          category: 'Open Graph',
          url: page.url,
          message: 'Page is missing Open Graph tags',
          recommendation: 'Add og:title and og:description for better social sharing',
        });
      }

      if (page.consoleErrors.length > 0) {
        issues.push({
          severity: 'warning',
          category: 'JavaScript',
          url: page.url,
          message: `Page has ${page.consoleErrors.length} JavaScript error(s)`,
          recommendation: 'Fix JavaScript errors to improve user experience and SEO',
        });
      }

      if (page.loadTimeMs > 3000) {
        issues.push({
          severity: 'warning',
          category: 'Performance',
          url: page.url,
          message: `Page load time is slow (${(page.loadTimeMs / 1000).toFixed(2)}s)`,
          recommendation: 'Optimize page performance - aim for under 3 seconds',
        });
      }

      if (!page.metadata.viewport) {
        issues.push({
          severity: 'warning',
          category: 'Mobile',
          url: page.url,
          message: 'Page is missing viewport meta tag',
          recommendation: 'Add viewport meta tag for mobile responsiveness',
        });
      }

      if (!page.metadata.lang) {
        issues.push({
          severity: 'info',
          category: 'Accessibility',
          url: page.url,
          message: 'Page is missing lang attribute',
          recommendation: 'Add lang attribute to the HTML element',
        });
      }
    }

    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return issues;
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}

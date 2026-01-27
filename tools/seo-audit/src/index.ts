#!/usr/bin/env node
/**
 * SEO Audit Tool - Main Entry Point
 *
 * Usage:
 *   npm run audit:seo                    # Crawl all enabled sites
 *   npm run audit:seo -- --local         # Crawl localhost only
 *   npm run audit:seo -- --max 50        # Limit to 50 pages
 *   npm run audit:seo -- --auth          # Crawl with authentication
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { SEOCrawler } from './crawler.js';
import { generateCSVReports } from './reporters/csv.js';
import { generateHTMLReport } from './reporters/html.js';
import { generateJSONReport } from './reporters/json.js';
import { SitesConfig } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
function parseArgs(): {
  local: boolean;
  staging: boolean;
  production: boolean;
  auth: boolean;
  admin: boolean;
  maxPages: number;
  concurrency: number;
  delay: number;
  help: boolean;
} {
  const args = process.argv.slice(2);
  return {
    local: args.includes('--local') || args.includes('-l'),
    staging: args.includes('--staging') || args.includes('-s'),
    production: args.includes('--production') || args.includes('-p'),
    auth: args.includes('--auth') || args.includes('-a'),
    admin: args.includes('--admin'),
    maxPages: parseInt(args.find(a => a.startsWith('--max='))?.split('=')[1] || '0'),
    concurrency: parseInt(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] || '0'),
    delay: parseInt(args.find(a => a.startsWith('--delay='))?.split('=')[1] || '0'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

function printHelp(): void {
  console.log(`
SEO Audit Crawler - CarpoolNetwork

Usage: npm run audit:seo [options]

Options:
  --local, -l        Crawl localhost only (enables local dev site)
  --staging, -s      Crawl staging site only
  --production, -p   Crawl production site only
  --auth, -a         Authenticate before crawling (requires AUDIT_EMAIL and AUDIT_PASSWORD env vars)
  --admin            Include admin routes (requires auth and admin account)
  --max=N            Limit crawl to N pages (default: unlimited)
  --concurrency=N    Number of concurrent pages (default: 3)
  --delay=N          Delay between batches in ms (default: 500)
  --help, -h         Show this help message

Environment Variables:
  AUDIT_EMAIL        Email for authenticated crawling
  AUDIT_PASSWORD     Password for authenticated crawling

Examples:
  npm run audit:seo                      # Crawl all enabled sites
  npm run audit:seo -- --local           # Crawl localhost only
  npm run audit:seo -- --local --auth    # Crawl localhost with auth
  npm run audit:seo -- --max=100         # Limit to 100 pages
  npm run audit:seo -- --production      # Crawl production only

Reports are saved to: tools/seo-audit/reports/
`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log('\n========================================');
  console.log('   CarpoolNetwork SEO Audit Crawler');
  console.log('========================================\n');

  // Load configuration
  const configPath = join(__dirname, '..', 'sites.json');
  let config: SitesConfig;

  try {
    const configContent = readFileSync(configPath, 'utf-8');
    config = JSON.parse(configContent);
  } catch (error) {
    console.error('Failed to load sites.json:', error);
    process.exit(1);
  }

  // Apply CLI overrides to site enablement
  if (args.local || args.staging || args.production) {
    config.sites = config.sites.map(site => ({
      ...site,
      enabled: (args.local && site.baseUrl.includes('localhost')) ||
               (args.staging && site.baseUrl.includes('staging')) ||
               (args.production && !site.baseUrl.includes('localhost') && !site.baseUrl.includes('staging')),
    }));
  }

  // Apply CLI overrides to options
  if (args.maxPages > 0) {
    config.options.maxPages = args.maxPages;
  }
  if (args.concurrency > 0) {
    config.options.concurrency = args.concurrency;
  }
  if (args.delay > 0) {
    config.options.delayBetweenRequests = args.delay;
  }

  // Enable protected/admin crawling based on flags
  if (args.auth) {
    config.sites = config.sites.map(site => ({
      ...site,
      crawlProtected: site.enabled,
      crawlAdmin: args.admin && site.enabled,
    }));
  }

  const enabledSites = config.sites.filter(s => s.enabled);
  if (enabledSites.length === 0) {
    console.error('No sites enabled. Check your configuration or use --local, --staging, or --production flags.');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log(`  Sites: ${enabledSites.map(s => s.name).join(', ')}`);
  console.log(`  Max Pages: ${config.options.maxPages || 'Unlimited'}`);
  console.log(`  Concurrency: ${config.options.concurrency}`);
  console.log(`  Delay: ${config.options.delayBetweenRequests}ms`);
  console.log(`  Auth: ${args.auth ? 'Enabled' : 'Disabled'}`);
  console.log(`  Admin: ${args.admin ? 'Enabled' : 'Disabled'}`);
  console.log('');

  // Initialize crawler
  const crawler = new SEOCrawler(
    config.sites,
    config.options,
    config.seedPaths,
    config.excludePatterns
  );

  // Set up authentication if requested
  if (args.auth) {
    const email = process.env.AUDIT_EMAIL;
    const password = process.env.AUDIT_PASSWORD;

    if (!email || !password) {
      console.error('Authentication requested but AUDIT_EMAIL or AUDIT_PASSWORD not set.');
      console.error('Set these environment variables or remove the --auth flag.');
      process.exit(1);
    }

    crawler.setCredentials(email, password);
    console.log(`Authentication configured for: ${email}`);
    console.log('');
  }

  // Progress callback
  let lastProgress = 0;
  crawler.setProgressCallback((current, total, url) => {
    const percent = Math.round((current / total) * 100);
    if (percent !== lastProgress || current === total) {
      lastProgress = percent;
      const truncatedUrl = url.length > 60 ? url.slice(0, 57) + '...' : url;
      process.stdout.write(`\rProgress: ${current}/${total} (${percent}%) - ${truncatedUrl.padEnd(60)}`);
    }
  });

  console.log('Starting crawl...\n');
  const startTime = Date.now();

  try {
    // Run the crawl
    const report = await crawler.crawl(
      args.auth ? config.protectedSeedPaths : [],
      args.admin ? config.adminSeedPaths : []
    );

    console.log('\n\n');
    console.log('Crawl completed!');
    console.log('');

    // Print summary
    console.log('Summary:');
    console.log(`  Total Pages: ${report.stats.totalPages}`);
    console.log(`  Successful: ${report.stats.successfulPages}`);
    console.log(`  Failed: ${report.stats.failedPages}`);
    console.log(`  Redirected: ${report.stats.redirectedPages}`);
    console.log(`  Avg Load Time: ${report.stats.avgLoadTimeMs}ms`);
    console.log(`  Total Time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log('');

    console.log('Issues Found:');
    console.log(`  Critical: ${report.issues.filter(i => i.severity === 'critical').length}`);
    console.log(`  Warning: ${report.issues.filter(i => i.severity === 'warning').length}`);
    console.log(`  Info: ${report.issues.filter(i => i.severity === 'info').length}`);
    console.log('');

    // Ensure reports directory exists
    const reportsDir = join(__dirname, '..', 'reports');
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }

    // Generate timestamp for filenames
    const timestamp = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toISOString().split('T')[1].slice(0, 5).replace(':', '');

    // Save reports
    const csvReports = generateCSVReports(report);
    const htmlReport = generateHTMLReport(report);
    const jsonReport = generateJSONReport(report);

    const baseName = `seo-audit-${timestamp}-${timeStr}`;

    writeFileSync(join(reportsDir, `${baseName}-pages.csv`), csvReports.pages);
    writeFileSync(join(reportsDir, `${baseName}-issues.csv`), csvReports.issues);
    writeFileSync(join(reportsDir, `${baseName}.html`), htmlReport);
    writeFileSync(join(reportsDir, `${baseName}.json`), jsonReport);

    console.log('Reports saved:');
    console.log(`  reports/${baseName}-pages.csv`);
    console.log(`  reports/${baseName}-issues.csv`);
    console.log(`  reports/${baseName}.html`);
    console.log(`  reports/${baseName}.json`);
    console.log('');

    // Exit with error code if critical issues found
    const criticalCount = report.issues.filter(i => i.severity === 'critical').length;
    if (criticalCount > 0) {
      console.log(`Warning: ${criticalCount} critical issue(s) found!`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n\nCrawl failed:', error);
    process.exit(1);
  }
}

main();

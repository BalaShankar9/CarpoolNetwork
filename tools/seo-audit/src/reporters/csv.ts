/**
 * CSV Report Generator
 */

import { CrawlReport, PageResult } from '../types.js';

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generatePagesCSV(pages: PageResult[]): string {
  const headers = [
    'URL',
    'Final URL',
    'Status Code',
    'Title',
    'Title Length',
    'Meta Description',
    'Meta Desc Length',
    'Canonical',
    'Robots',
    'H1 Count',
    'H1 Text',
    'OG Title',
    'OG Description',
    'OG Image',
    'Twitter Card',
    'Internal Links',
    'External Links',
    'Broken Links',
    'JS Errors',
    'Load Time (ms)',
    'Redirects',
    'Site',
    'Crawled At',
    'Error',
  ];

  const rows = pages.map(page => [
    escapeCSV(page.url),
    escapeCSV(page.finalUrl),
    escapeCSV(page.statusCode),
    escapeCSV(page.metadata.title),
    escapeCSV(page.metadata.title?.length),
    escapeCSV(page.metadata.metaDescription),
    escapeCSV(page.metadata.metaDescription?.length),
    escapeCSV(page.metadata.canonical),
    escapeCSV(page.metadata.robotsMeta),
    escapeCSV(page.metadata.h1Count),
    escapeCSV(page.metadata.h1Text.join(' | ')),
    escapeCSV(page.metadata.ogTitle),
    escapeCSV(page.metadata.ogDescription),
    escapeCSV(page.metadata.ogImage),
    escapeCSV(page.metadata.twitterCard),
    escapeCSV(page.internalLinks.length),
    escapeCSV(page.externalLinks.length),
    escapeCSV(page.brokenLinks.length),
    escapeCSV(page.consoleErrors.length),
    escapeCSV(page.loadTimeMs),
    escapeCSV(page.redirectChain.length),
    escapeCSV(page.site),
    escapeCSV(page.crawledAt),
    escapeCSV(page.error),
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function generateIssuesCSV(report: CrawlReport): string {
  const headers = ['Severity', 'Category', 'URL', 'Message', 'Recommendation'];

  const rows = report.issues.map(issue => [
    escapeCSV(issue.severity),
    escapeCSV(issue.category),
    escapeCSV(issue.url),
    escapeCSV(issue.message),
    escapeCSV(issue.recommendation),
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function generateBrokenLinksCSV(report: CrawlReport): string {
  const headers = ['Source URL', 'Broken URL', 'Link Text'];

  const rows = report.brokenLinksReport.map(link => [
    escapeCSV(link.sourceUrl),
    escapeCSV(link.brokenUrl),
    escapeCSV(link.linkText),
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

export function generateCSVReports(report: CrawlReport): {
  pages: string;
  issues: string;
  brokenLinks: string;
} {
  return {
    pages: generatePagesCSV(report.pages),
    issues: generateIssuesCSV(report),
    brokenLinks: generateBrokenLinksCSV(report),
  };
}

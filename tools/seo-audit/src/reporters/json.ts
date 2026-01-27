/**
 * JSON Report Generator
 */

import { CrawlReport } from '../types.js';

export function generateJSONReport(report: CrawlReport): string {
  return JSON.stringify(report, null, 2);
}

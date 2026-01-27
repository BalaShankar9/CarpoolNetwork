/**
 * HTML Report Generator
 *
 * Generates a sortable, filterable HTML report with modern styling.
 */

import { CrawlReport, CrawlStats, SEOIssue, PageResult } from '../types.js';

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function generateStatsSection(stats: CrawlStats): string {
  return `
    <section class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.totalPages}</div>
        <div class="stat-label">Total Pages</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value">${stats.successfulPages}</div>
        <div class="stat-label">Successful</div>
      </div>
      <div class="stat-card error">
        <div class="stat-value">${stats.failedPages}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-value">${stats.redirectedPages}</div>
        <div class="stat-label">Redirected</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatDuration(stats.avgLoadTimeMs)}</div>
        <div class="stat-label">Avg Load Time</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatDuration(stats.totalCrawlTimeMs)}</div>
        <div class="stat-label">Total Crawl Time</div>
      </div>
    </section>

    <section class="issues-summary">
      <h2>SEO Issues Summary</h2>
      <div class="issues-grid">
        <div class="issue-stat critical">
          <span class="count">${stats.pagesWithMissingTitle}</span>
          <span class="label">Missing Title</span>
        </div>
        <div class="issue-stat critical">
          <span class="count">${stats.pagesWithMissingDescription}</span>
          <span class="label">Missing Description</span>
        </div>
        <div class="issue-stat warning">
          <span class="count">${stats.pagesWithMissingH1}</span>
          <span class="label">Missing H1</span>
        </div>
        <div class="issue-stat warning">
          <span class="count">${stats.pagesWithMultipleH1}</span>
          <span class="label">Multiple H1s</span>
        </div>
        <div class="issue-stat info">
          <span class="count">${stats.pagesWithNoIndex}</span>
          <span class="label">NoIndex</span>
        </div>
        <div class="issue-stat warning">
          <span class="count">${stats.pagesWithErrors}</span>
          <span class="label">JS Errors</span>
        </div>
      </div>
    </section>
  `;
}

function generateIssuesTable(issues: SEOIssue[]): string {
  const rows = issues.map(issue => `
    <tr class="severity-${issue.severity}">
      <td><span class="badge ${issue.severity}">${issue.severity}</span></td>
      <td>${escapeHtml(issue.category)}</td>
      <td><a href="${escapeHtml(issue.url)}" target="_blank" class="url-link">${escapeHtml(issue.url)}</a></td>
      <td>${escapeHtml(issue.message)}</td>
      <td>${escapeHtml(issue.recommendation)}</td>
    </tr>
  `).join('');

  return `
    <section class="table-section">
      <h2>All Issues (${issues.length})</h2>
      <div class="filter-controls">
        <select id="severity-filter">
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <select id="category-filter">
          <option value="">All Categories</option>
          ${[...new Set(issues.map(i => i.category))].map(cat =>
            `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`
          ).join('')}
        </select>
        <input type="text" id="url-search" placeholder="Search URLs...">
      </div>
      <div class="table-wrapper">
        <table id="issues-table" class="sortable">
          <thead>
            <tr>
              <th data-sort="severity">Severity</th>
              <th data-sort="category">Category</th>
              <th data-sort="url">URL</th>
              <th>Message</th>
              <th>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function generatePagesTable(pages: PageResult[]): string {
  const rows = pages.map(page => {
    const statusClass = page.statusCode >= 200 && page.statusCode < 300 ? 'success' :
                       page.statusCode >= 300 && page.statusCode < 400 ? 'redirect' :
                       'error';
    return `
      <tr>
        <td><a href="${escapeHtml(page.url)}" target="_blank" class="url-link">${escapeHtml(page.url)}</a></td>
        <td><span class="badge ${statusClass}">${page.statusCode || 'ERR'}</span></td>
        <td class="${page.metadata.title ? '' : 'missing'}">${escapeHtml(page.metadata.title) || '<em>Missing</em>'}</td>
        <td class="${page.metadata.metaDescription ? '' : 'missing'}">${escapeHtml(page.metadata.metaDescription?.slice(0, 80)) || '<em>Missing</em>'}${(page.metadata.metaDescription?.length || 0) > 80 ? '...' : ''}</td>
        <td>${page.metadata.h1Count}</td>
        <td>${page.metadata.canonical ? 'Yes' : 'No'}</td>
        <td>${page.internalLinks.length}</td>
        <td>${page.loadTimeMs}ms</td>
        <td>${page.consoleErrors.length}</td>
        <td>${escapeHtml(page.site)}</td>
      </tr>
    `;
  }).join('');

  return `
    <section class="table-section">
      <h2>All Pages (${pages.length})</h2>
      <div class="filter-controls">
        <select id="status-filter">
          <option value="">All Status Codes</option>
          <option value="2xx">2xx (Success)</option>
          <option value="3xx">3xx (Redirect)</option>
          <option value="4xx">4xx (Client Error)</option>
          <option value="5xx">5xx (Server Error)</option>
        </select>
        <input type="text" id="page-search" placeholder="Search pages...">
      </div>
      <div class="table-wrapper">
        <table id="pages-table" class="sortable">
          <thead>
            <tr>
              <th data-sort="url">URL</th>
              <th data-sort="status">Status</th>
              <th data-sort="title">Title</th>
              <th>Description</th>
              <th data-sort="h1">H1s</th>
              <th>Canonical</th>
              <th data-sort="links">Links</th>
              <th data-sort="load">Load Time</th>
              <th data-sort="errors">JS Errors</th>
              <th>Site</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

export function generateHTMLReport(report: CrawlReport): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Audit Report - ${new Date(report.generatedAt).toLocaleDateString()}</title>
  <style>
    :root {
      --primary: #2563eb;
      --success: #16a34a;
      --warning: #ca8a04;
      --error: #dc2626;
      --info: #0891b2;
      --gray-50: #f9fafb;
      --gray-100: #f3f4f6;
      --gray-200: #e5e7eb;
      --gray-300: #d1d5db;
      --gray-600: #4b5563;
      --gray-800: #1f2937;
      --gray-900: #111827;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--gray-50);
      color: var(--gray-800);
      line-height: 1.6;
    }

    header {
      background: linear-gradient(135deg, var(--gray-900), var(--gray-800));
      color: white;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    header h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    header .meta {
      opacity: 0.8;
      font-size: 0.9rem;
    }

    .container {
      max-width: 1600px;
      margin: 0 auto;
      padding: 0 1rem 2rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-left: 4px solid var(--primary);
    }

    .stat-card.success { border-left-color: var(--success); }
    .stat-card.warning { border-left-color: var(--warning); }
    .stat-card.error { border-left-color: var(--error); }

    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: var(--gray-900);
    }

    .stat-label {
      color: var(--gray-600);
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .issues-summary {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .issues-summary h2 {
      margin-bottom: 1rem;
      color: var(--gray-900);
    }

    .issues-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .issue-stat {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
    }

    .issue-stat.critical { background: #fef2f2; color: var(--error); }
    .issue-stat.warning { background: #fefce8; color: var(--warning); }
    .issue-stat.info { background: #ecfeff; color: var(--info); }

    .issue-stat .count {
      font-weight: bold;
      font-size: 1.1rem;
    }

    .table-section {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .table-section h2 {
      margin-bottom: 1rem;
      color: var(--gray-900);
    }

    .filter-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .filter-controls select,
    .filter-controls input {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--gray-300);
      border-radius: 6px;
      font-size: 0.875rem;
      min-width: 150px;
    }

    .filter-controls input {
      min-width: 250px;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--gray-200);
    }

    th {
      background: var(--gray-100);
      font-weight: 600;
      color: var(--gray-700);
      position: sticky;
      top: 0;
      cursor: pointer;
      user-select: none;
    }

    th:hover {
      background: var(--gray-200);
    }

    th[data-sort]::after {
      content: ' \u2195';
      opacity: 0.3;
    }

    th.asc::after {
      content: ' \u2191';
      opacity: 1;
    }

    th.desc::after {
      content: ' \u2193';
      opacity: 1;
    }

    tbody tr:hover {
      background: var(--gray-50);
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge.critical { background: #fef2f2; color: var(--error); }
    .badge.warning { background: #fefce8; color: var(--warning); }
    .badge.info { background: #ecfeff; color: var(--info); }
    .badge.success { background: #f0fdf4; color: var(--success); }
    .badge.redirect { background: #fefce8; color: var(--warning); }
    .badge.error { background: #fef2f2; color: var(--error); }

    .url-link {
      color: var(--primary);
      text-decoration: none;
      word-break: break-all;
    }

    .url-link:hover {
      text-decoration: underline;
    }

    .missing {
      color: var(--error);
      font-style: italic;
    }

    .hidden {
      display: none !important;
    }

    @media (max-width: 768px) {
      header {
        padding: 1rem;
      }

      header h1 {
        font-size: 1.5rem;
      }

      .container {
        padding: 0 0.5rem 1rem;
      }

      .table-section {
        padding: 1rem;
      }
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 2px solid var(--gray-200);
    }

    .tab-btn {
      padding: 0.75rem 1.5rem;
      background: none;
      border: none;
      font-size: 1rem;
      cursor: pointer;
      color: var(--gray-600);
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      color: var(--primary);
    }

    .tab-btn.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
      font-weight: 600;
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }
  </style>
</head>
<body>
  <header>
    <h1>SEO Audit Report</h1>
    <div class="meta">
      Generated: ${new Date(report.generatedAt).toLocaleString()} |
      Sites: ${report.sites.join(', ')}
    </div>
  </header>

  <div class="container">
    ${generateStatsSection(report.stats)}

    <div class="tabs">
      <button class="tab-btn active" data-tab="issues">Issues (${report.issues.length})</button>
      <button class="tab-btn" data-tab="pages">Pages (${report.pages.length})</button>
    </div>

    <div id="issues-tab" class="tab-content active">
      ${generateIssuesTable(report.issues)}
    </div>

    <div id="pages-tab" class="tab-content">
      ${generatePagesTable(report.pages)}
    </div>
  </div>

  <script>
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab + '-tab').classList.add('active');
      });
    });

    // Table sorting
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const table = th.closest('table');
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const idx = Array.from(th.parentNode.children).indexOf(th);
        const asc = !th.classList.contains('asc');

        // Reset other headers
        th.parentNode.querySelectorAll('th').forEach(h => h.classList.remove('asc', 'desc'));
        th.classList.add(asc ? 'asc' : 'desc');

        rows.sort((a, b) => {
          const aVal = a.children[idx].textContent.trim();
          const bVal = b.children[idx].textContent.trim();
          const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ''));
          const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ''));

          if (!isNaN(aNum) && !isNaN(bNum)) {
            return asc ? aNum - bNum : bNum - aNum;
          }
          return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });

        rows.forEach(row => tbody.appendChild(row));
      });
    });

    // Issues filtering
    const severityFilter = document.getElementById('severity-filter');
    const categoryFilter = document.getElementById('category-filter');
    const urlSearch = document.getElementById('url-search');

    function filterIssues() {
      const severity = severityFilter?.value || '';
      const category = categoryFilter?.value || '';
      const search = urlSearch?.value.toLowerCase() || '';

      document.querySelectorAll('#issues-table tbody tr').forEach(row => {
        const rowSeverity = row.querySelector('.badge')?.textContent.toLowerCase() || '';
        const rowCategory = row.children[1]?.textContent || '';
        const rowUrl = row.children[2]?.textContent.toLowerCase() || '';

        const show = (!severity || rowSeverity === severity) &&
                    (!category || rowCategory === category) &&
                    (!search || rowUrl.includes(search));

        row.classList.toggle('hidden', !show);
      });
    }

    severityFilter?.addEventListener('change', filterIssues);
    categoryFilter?.addEventListener('change', filterIssues);
    urlSearch?.addEventListener('input', filterIssues);

    // Pages filtering
    const statusFilter = document.getElementById('status-filter');
    const pageSearch = document.getElementById('page-search');

    function filterPages() {
      const status = statusFilter?.value || '';
      const search = pageSearch?.value.toLowerCase() || '';

      document.querySelectorAll('#pages-table tbody tr').forEach(row => {
        const rowStatus = row.children[1]?.textContent.trim() || '';
        const rowUrl = row.children[0]?.textContent.toLowerCase() || '';

        let statusMatch = true;
        if (status) {
          const code = parseInt(rowStatus) || 0;
          statusMatch = status === '2xx' ? code >= 200 && code < 300 :
                       status === '3xx' ? code >= 300 && code < 400 :
                       status === '4xx' ? code >= 400 && code < 500 :
                       status === '5xx' ? code >= 500 : true;
        }

        const show = statusMatch && (!search || rowUrl.includes(search));
        row.classList.toggle('hidden', !show);
      });
    }

    statusFilter?.addEventListener('change', filterPages);
    pageSearch?.addEventListener('input', filterPages);
  </script>
</body>
</html>`;
}

/**
 * Analytics Export Utilities
 * 
 * Functions for exporting analytics data to CSV and PDF formats.
 */

import type { AnalyticsFilters, KpiSummary, TopRoute, GeoDistribution } from '../../../types/analytics';

/**
 * Convert data to CSV format and trigger download
 */
export function exportToCSV<T extends object>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Cast data for key access
  const typedData = data as Record<string, unknown>[];

  // Determine headers from columns or data keys
  const headers = columns 
    ? columns.map(c => c.label)
    : Object.keys(typedData[0]);
  
  const keys = columns 
    ? columns.map(c => String(c.key))
    : Object.keys(typedData[0]);

  // Build CSV content
  const csvRows = [
    headers.join(','),
    ...typedData.map(row => 
      keys.map(key => {
        const value = row[key];
        // Escape quotes and wrap in quotes if contains comma or newline
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    ),
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  window.URL.revokeObjectURL(url);
}

/**
 * Export KPI summary data
 */
export function exportKpiSummary(kpis: KpiSummary, filters: AnalyticsFilters): void {
  const data = [
    { metric: 'Active Users', value: kpis.activeUsers, delta: `${kpis.activeUsersDelta}%` },
    { metric: 'New Users', value: kpis.newUsers, delta: `${kpis.newUsersDelta}%` },
    { metric: 'Rides Posted', value: kpis.ridesPosted, delta: `${kpis.ridesPostedDelta}%` },
    { metric: 'Bookings Created', value: kpis.bookingsCreated, delta: `${kpis.bookingsCreatedDelta}%` },
    { metric: 'Completion Rate', value: `${kpis.completionRate}%`, delta: `${kpis.completionRateDelta}%` },
    { metric: 'Cancellation Rate', value: `${kpis.cancellationRate}%`, delta: `${kpis.cancellationRateDelta}%` },
    { metric: 'Fill Rate', value: `${kpis.fillRate}%`, delta: `${kpis.fillRateDelta}%` },
    { metric: 'Messages Sent', value: kpis.messagesSent, delta: `${kpis.messagesSentDelta}%` },
  ];

  exportToCSV(data, `kpi-summary-${filters.startDate}-to-${filters.endDate}`);
}

/**
 * Export top routes data
 */
export function exportTopRoutes(routes: TopRoute[], filters: AnalyticsFilters): void {
  const data = routes.map(r => ({
    origin: r.origin,
    destination: r.destination,
    rides: r.rideCount,
    bookings: r.bookingCount,
    avgFillRate: `${r.avgFillRate}%`,
  }));

  exportToCSV(data, `top-routes-${filters.startDate}-to-${filters.endDate}`);
}

/**
 * Export geo distribution data
 */
export function exportGeoDistribution(distribution: GeoDistribution[], filters: AnalyticsFilters): void {
  const data = distribution.map(d => ({
    area: d.area,
    rides: d.rides,
    bookings: d.bookings,
    users: d.users,
  }));

  exportToCSV(data, `geo-distribution-${filters.startDate}-to-${filters.endDate}`);
}

/**
 * Export time series data
 */
export function exportTimeSeries(
  data: { date: string; value: number }[],
  metricName: string,
  filters: AnalyticsFilters
): void {
  exportToCSV(
    data.map(d => ({ date: d.date, [metricName]: d.value })),
    `${metricName}-timeseries-${filters.startDate}-to-${filters.endDate}`
  );
}

/**
 * Generate a simple PDF report (print-to-PDF approach)
 * Opens a new window with print-optimized layout
 */
export function generatePDFReport(
  title: string,
  filters: AnalyticsFilters,
  sections: { title: string; content: string }[]
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate PDF reports');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 8px;
          color: #111827;
        }
        .meta {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 32px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 16px;
        }
        .section {
          margin-bottom: 32px;
        }
        .section h2 {
          font-size: 18px;
          color: #374151;
          margin-bottom: 12px;
        }
        .section-content {
          background: #f9fafb;
          padding: 16px;
          border-radius: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          text-align: left;
          padding: 8px 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        th {
          font-weight: 600;
          color: #6b7280;
          font-size: 12px;
          text-transform: uppercase;
        }
        @media print {
          body { padding: 20px; }
          .section { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="meta">
        <p>Period: ${filters.startDate} to ${filters.endDate}</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
        ${filters.segment && filters.segment !== 'all' ? `<p>Segment: ${filters.segment}</p>` : ''}
        ${filters.rideType ? `<p>Ride Type: ${filters.rideType}</p>` : ''}
      </div>
      ${sections.map(s => `
        <div class="section">
          <h2>${s.title}</h2>
          <div class="section-content">
            ${s.content}
          </div>
        </div>
      `).join('')}
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load then trigger print
  printWindow.onload = () => {
    printWindow.print();
  };
}

/**
 * Format KPI data as HTML table for PDF
 */
export function formatKpisAsHTML(kpis: KpiSummary): string {
  return `
    <table>
      <tr><th>Metric</th><th>Value</th><th>Change</th></tr>
      <tr><td>Active Users</td><td>${kpis.activeUsers.toLocaleString()}</td><td>${kpis.activeUsersDelta}%</td></tr>
      <tr><td>New Users</td><td>${kpis.newUsers.toLocaleString()}</td><td>${kpis.newUsersDelta}%</td></tr>
      <tr><td>Rides Posted</td><td>${kpis.ridesPosted.toLocaleString()}</td><td>${kpis.ridesPostedDelta}%</td></tr>
      <tr><td>Bookings</td><td>${kpis.bookingsCreated.toLocaleString()}</td><td>${kpis.bookingsCreatedDelta}%</td></tr>
      <tr><td>Completion Rate</td><td>${kpis.completionRate}%</td><td>${kpis.completionRateDelta}%</td></tr>
      <tr><td>Cancellation Rate</td><td>${kpis.cancellationRate}%</td><td>${kpis.cancellationRateDelta}%</td></tr>
      <tr><td>Fill Rate</td><td>${kpis.fillRate}%</td><td>${kpis.fillRateDelta}%</td></tr>
      <tr><td>Messages Sent</td><td>${kpis.messagesSent.toLocaleString()}</td><td>${kpis.messagesSentDelta}%</td></tr>
    </table>
  `;
}

/**
 * Format top routes as HTML table for PDF
 */
export function formatRoutesAsHTML(routes: TopRoute[]): string {
  if (routes.length === 0) return '<p>No route data available</p>';
  
  return `
    <table>
      <tr><th>Origin</th><th>Destination</th><th>Rides</th><th>Bookings</th><th>Fill Rate</th></tr>
      ${routes.map(r => `
        <tr>
          <td>${r.origin}</td>
          <td>${r.destination}</td>
          <td>${r.rideCount}</td>
          <td>${r.bookingCount}</td>
          <td>${r.avgFillRate}%</td>
        </tr>
      `).join('')}
    </table>
  `;
}

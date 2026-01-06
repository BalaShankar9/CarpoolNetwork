import { useState, useEffect } from 'react';
import { ClipboardList, Search, Filter, Calendar, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import AdminLayout, { AdminSection, AdminEmptyState } from '../../components/admin/AdminLayout';
import PermissionGuard from '../../components/admin/PermissionGuard';
import Pagination from '../../components/shared/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { getAuditLogs, getUniqueActions, getActionLabel, AuditLogRecord } from '../../services/auditService';
import { ROLE_DISPLAY_NAMES, ROLE_COLORS, AdminRole } from '../../types/admin';

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const pagination = usePagination({ initialPageSize: 50 });

  useEffect(() => {
    loadActions();
  }, []);

  useEffect(() => {
    loadAuditLog();
  }, [pagination.currentPage, actionFilter, dateRange]);

  const loadActions = async () => {
    const actions = await getUniqueActions();
    setAvailableActions(actions);
  };

  const loadAuditLog = async () => {
    setLoading(true);
    const { from } = pagination.getRange();

    const { data, count, error } = await getAuditLogs({
      action: actionFilter || undefined,
      startDate: dateRange.start ? new Date(dateRange.start) : undefined,
      endDate: dateRange.end ? new Date(dateRange.end + 'T23:59:59') : undefined,
      limit: pagination.pageSize,
      offset: from,
    });

    if (!error) {
      setEntries(data);
      pagination.setTotalItems(count);
    }
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return `Today at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days < 7) {
      return `${days} days ago`;
    }

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('delete') || action.includes('removed') || action.includes('suspended')) {
      return 'bg-red-100 text-red-700';
    }
    if (action.includes('create') || action.includes('approved') || action.includes('resolved')) {
      return 'bg-green-100 text-green-700';
    }
    if (action.includes('edit') || action.includes('changed') || action.includes('update')) {
      return 'bg-yellow-100 text-yellow-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  const clearFilters = () => {
    setActionFilter('');
    setDateRange({ start: '', end: '' });
    pagination.setPage(1);
  };

  const hasFilters = actionFilter || dateRange.start || dateRange.end;

  return (
    <PermissionGuard minRole="super_admin" redirectTo="/admin" showAccessDenied>
      <AdminLayout
        title="Audit Log"
        subtitle="Track all admin actions and changes"
      >
        <div className="space-y-6">
          {/* Filters */}
          <AdminSection>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Action Filter */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Action Type
                </label>
                <select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    pagination.setPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Actions</option>
                  {availableActions.map(action => (
                    <option key={action} value={action}>
                      {getActionLabel(action)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  From Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, start: e.target.value }));
                    pagination.setPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  To Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => {
                    setDateRange(prev => ({ ...prev, end: e.target.value }));
                    pagination.setPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Clear Filters */}
              {hasFilters && (
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </AdminSection>

          {/* Audit Entries */}
          <AdminSection title={`Audit Entries (${pagination.totalItems})`}>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : entries.length === 0 ? (
              <AdminEmptyState
                icon={<ClipboardList className="w-6 h-6" />}
                title="No audit entries found"
                description={hasFilters ? 'Try adjusting your filters' : 'Admin actions will appear here'}
              />
            ) : (
              <div className="divide-y divide-gray-200">
                {entries.map(entry => (
                  <div key={entry.id} className="py-4">
                    <div className="flex items-start gap-4">
                      {/* Admin Avatar */}
                      <img
                        src={entry.admin?.avatar_url || '/default-avatar.png'}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover bg-gray-200 shrink-0"
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {entry.admin?.full_name || 'Unknown Admin'}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${ROLE_COLORS[entry.admin_role as AdminRole]}`}>
                            {ROLE_DISPLAY_NAMES[entry.admin_role as AdminRole] || entry.admin_role}
                          </span>
                        </div>

                        {/* Action */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-sm font-medium rounded ${getActionBadgeColor(entry.action)}`}>
                            {getActionLabel(entry.action)}
                          </span>
                          {entry.target_type && (
                            <span className="text-sm text-gray-500">
                              on {entry.target_type}
                              {entry.target_id && (
                                <code className="ml-1 px-1 py-0.5 bg-gray-100 rounded text-xs">
                                  {entry.target_id.slice(0, 8)}...
                                </code>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Expandable Details */}
                        {entry.details && Object.keys(entry.details).length > 0 && (
                          <div>
                            <button
                              onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                            >
                              {expandedEntry === entry.id ? (
                                <>
                                  <ChevronUp className="w-4 h-4" />
                                  Hide details
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4" />
                                  Show details
                                </>
                              )}
                            </button>
                            {expandedEntry === entry.id && (
                              <pre className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 overflow-x-auto">
                                {JSON.stringify(entry.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}

                        {/* Timestamp */}
                        <p className="text-sm text-gray-500 mt-2">
                          {formatDate(entry.created_at)}
                        </p>
                      </div>

                      {/* Quick Actions */}
                      {entry.target_id && entry.target_type === 'user' && (
                        <a
                          href={`/admin/users?id=${entry.target_id}`}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View target"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.totalItems}
                  pageSize={pagination.pageSize}
                  onPageChange={(page) => pagination.setPage(page)}
                  onPageSizeChange={(size) => pagination.setPageSize(size)}
                />
              </div>
            )}
          </AdminSection>

          {/* Export Section */}
          <AdminSection title="Export">
            <div className="flex items-center justify-between">
              <p className="text-gray-600">
                Export audit logs for compliance and reporting purposes.
              </p>
              <button
                onClick={() => {
                  // Create CSV export
                  const headers = ['Timestamp', 'Admin', 'Role', 'Action', 'Target Type', 'Target ID', 'Details'];
                  const rows = entries.map(e => [
                    e.created_at,
                    e.admin?.full_name || 'Unknown',
                    e.admin_role,
                    e.action,
                    e.target_type || '',
                    e.target_id || '',
                    JSON.stringify(e.details),
                  ]);

                  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Export to CSV
              </button>
            </div>
          </AdminSection>
        </div>
      </AdminLayout>
    </PermissionGuard>
  );
}

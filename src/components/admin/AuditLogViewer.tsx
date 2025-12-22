import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Shield,
  Clock,
  User,
  FileText,
  Filter,
  Download,
  Search,
  RefreshCw,
  Eye,
  Calendar
} from 'lucide-react';

interface AuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  resource_type: string;
  resource_id: string;
  changes: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

interface DataAccessLog {
  id: string;
  user_id: string;
  resource_type: string;
  resource_id: string;
  access_reason: string;
  ip_address: string;
  created_at: string;
}

export function AuditLogViewer() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dataAccessLogs, setDataAccessLogs] = useState<DataAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'admin' | 'access'>('admin');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filterAction, setFilterAction] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, [viewMode, dateRange, filterAction]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      if (viewMode === 'admin') {
        let query = supabase
          .from('admin_audit_log')
          .select('*')
          .gte('created_at', `${dateRange.start}T00:00:00`)
          .lte('created_at', `${dateRange.end}T23:59:59`)
          .order('created_at', { ascending: false })
          .limit(100);

        if (filterAction !== 'all') {
          query = query.eq('action_type', filterAction);
        }

        const { data } = await query;
        if (data) setAuditLogs(data);
      } else {
        const { data } = await supabase
          .from('data_access_log')
          .select('*')
          .gte('created_at', `${dateRange.start}T00:00:00`)
          .lte('created_at', `${dateRange.end}T23:59:59`)
          .order('created_at', { ascending: false })
          .limit(100);

        if (data) setDataAccessLogs(data);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    const logs = viewMode === 'admin' ? auditLogs : dataAccessLogs;
    const csvContent = [
      viewMode === 'admin'
        ? ['Timestamp', 'Admin ID', 'Action', 'Resource Type', 'Resource ID', 'IP Address'].join(',')
        : ['Timestamp', 'User ID', 'Resource Type', 'Resource ID', 'Reason', 'IP Address'].join(','),
      ...logs.map(log =>
        viewMode === 'admin'
          ? [
              new Date(log.created_at).toISOString(),
              (log as AuditLog).admin_id,
              (log as AuditLog).action_type,
              log.resource_type,
              log.resource_id || '',
              log.ip_address || ''
            ].join(',')
          : [
              new Date(log.created_at).toISOString(),
              (log as DataAccessLog).user_id,
              log.resource_type,
              log.resource_id || '',
              (log as DataAccessLog).access_reason || '',
              log.ip_address || ''
            ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${viewMode}-logs-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
  };

  const filteredLogs = viewMode === 'admin'
    ? auditLogs.filter(log =>
        log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource_type.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : dataAccessLogs.filter(log =>
        log.resource_type.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('remove')) return 'text-red-600 bg-red-50';
    if (action.includes('create') || action.includes('add')) return 'text-green-600 bg-green-50';
    if (action.includes('update') || action.includes('modify')) return 'text-blue-600 bg-blue-50';
    return 'text-gray-600 bg-gray-50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Log Viewer</h2>
          <p className="text-gray-600">Complete audit trail of all administrative actions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportLogs}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-6 h-6" />
            <span className="text-sm opacity-90">Admin Actions</span>
          </div>
          <p className="text-3xl font-bold">{auditLogs.length}</p>
          <p className="text-sm opacity-75 mt-1">In selected period</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-6 h-6" />
            <span className="text-sm opacity-90">Data Access</span>
          </div>
          <p className="text-3xl font-bold">{dataAccessLogs.length}</p>
          <p className="text-sm opacity-75 mt-1">Access logs recorded</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('admin')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'admin'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              Admin Actions
            </button>
            <button
              onClick={() => setViewMode('access')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'access'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Eye className="w-4 h-4 inline mr-2" />
              Data Access
            </button>
          </div>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <span className="text-gray-600">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {viewMode === 'admin' && (
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
            </select>
          )}
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                {viewMode === 'admin' ? (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getActionColor((log as AuditLog).action_type)}`}>
                          {(log as AuditLog).action_type}
                        </span>
                        <span className="text-sm text-gray-600">{log.resource_type}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Admin ID:</span> {(log as AuditLog).admin_id.substring(0, 8)}...
                        </div>
                        <div>
                          <span className="font-medium">IP:</span> {log.ip_address || 'N/A'}
                        </div>
                        {log.resource_id && (
                          <div className="col-span-2">
                            <span className="font-medium">Resource ID:</span> {log.resource_id.substring(0, 8)}...
                          </div>
                        )}
                        {(log as AuditLog).changes && Object.keys((log as AuditLog).changes).length > 0 && (
                          <div className="col-span-2">
                            <span className="font-medium">Changes:</span>
                            <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                              {JSON.stringify((log as AuditLog).changes, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-600">
                          {log.resource_type}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">User ID:</span> {(log as DataAccessLog).user_id.substring(0, 8)}...
                        </div>
                        <div>
                          <span className="font-medium">IP:</span> {log.ip_address || 'N/A'}
                        </div>
                        {(log as DataAccessLog).access_reason && (
                          <div className="col-span-2">
                            <span className="font-medium">Reason:</span> {(log as DataAccessLog).access_reason}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No logs found for the selected criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
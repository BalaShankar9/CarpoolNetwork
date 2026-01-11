import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Layers,
  Users,
  Car,
  Calendar,
  Bell,
  Download,
  Upload,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Play,
  Pause,
  RefreshCw,
  FileText,
  Send,
  Shield,
  Eye,
  Package,
  Zap,
  Ban,
} from 'lucide-react';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';

interface BulkOperation {
  id: string;
  operation_type: string;
  operation_name: string;
  description: string;
  status: string;
  target_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface OperationPreview {
  targetIds: string[];
  action: string;
  parameters: any;
  estimatedCount: number;
}

export default function BulkOperations() {
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'new' | 'history'>('new');
  const [operationType, setOperationType] = useState<'users' | 'rides' | 'bookings' | 'notifications'>('users');
  const [selectedAction, setSelectedAction] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [executing, setExecuting] = useState(false);

  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('info');

  useEffect(() => {
    loadOperationHistory();
  }, []);

  const loadOperationHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bulk_operations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data && !error) {
        setOperations(data);
      }
    } catch (error) {
      console.error('Error loading operations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPreviewData = async () => {
    setLoading(true);
    try {
      let query;

      switch (operationType) {
        case 'users':
          query = supabase
            .from('profiles')
            .select('id, full_name, email, status, created_at')
            .limit(100);
          break;

        case 'rides':
          query = supabase
            .from('rides')
            .select('id, origin, destination, status, departure_time, driver_id')
            .limit(100);
          break;

        case 'bookings':
          query = supabase
            .from('ride_bookings')
            .select('id, ride_id, passenger_id, status, seats_requested')
            .limit(100);
          break;

        default:
          return;
      }

      if (searchQuery) {
        if (operationType === 'users') {
          query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
        } else if (operationType === 'rides') {
          query = query.or(`origin.ilike.%${searchQuery}%,destination.ilike.%${searchQuery}%`);
        }
      }

      const { data, error } = await query;

      if (data && !error) {
        setPreviewData(data);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTab === 'new') {
      loadPreviewData();
    }
  }, [operationType, searchQuery, selectedTab]);

  const handleSelectAll = () => {
    if (selectedItems.length === previewData.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(previewData.map(item => item.id));
    }
  };

  const handleToggleItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePreview = () => {
    if (selectedItems.length === 0) {
      toast.warning('Please select at least one item');
      return;
    }

    if (!selectedAction) {
      toast.warning('Please select an action');
      return;
    }

    if (operationType === 'notifications' && (!notificationTitle || !notificationMessage)) {
      toast.warning('Please enter notification title and message');
      return;
    }

    setShowPreview(true);
  };

  const [showExecuteConfirm, setShowExecuteConfirm] = useState(false);

  const handleExecute = async () => {
    setShowExecuteConfirm(true);
  };

  const confirmExecute = async () => {
    setShowExecuteConfirm(false);
    setExecuting(true);
    try {
      let operationName = '';
      let description = '';

      switch (operationType) {
        case 'users':
          operationName = `Bulk User ${selectedAction}`;
          description = `${selectedAction} action on ${selectedItems.length} users`;
          break;
        case 'rides':
          operationName = `Bulk Ride ${selectedAction}`;
          description = `${selectedAction} action on ${selectedItems.length} rides`;
          break;
        case 'bookings':
          operationName = `Bulk Booking ${selectedAction}`;
          description = `${selectedAction} action on ${selectedItems.length} bookings`;
          break;
        case 'notifications':
          operationName = 'Bulk Notification';
          description = `Send notification to ${selectedItems.length} users`;
          break;
      }

      const { data: operationData, error: createError } = await supabase
        .rpc('create_bulk_operation', {
          p_operation_type: operationType,
          p_operation_name: operationName,
          p_description: description,
          p_target_ids: selectedItems,
          p_parameters: {}
        });

      if (createError) throw createError;

      const operationId = operationData;

      let executeError;
      switch (operationType) {
        case 'users':
          ({ error: executeError } = await supabase.rpc('execute_bulk_user_action', {
            p_operation_id: operationId,
            p_action: selectedAction,
            p_parameters: {}
          }));
          break;

        case 'rides':
          ({ error: executeError } = await supabase.rpc('execute_bulk_ride_action', {
            p_operation_id: operationId,
            p_action: selectedAction,
            p_parameters: {}
          }));
          break;

        case 'bookings':
          ({ error: executeError } = await supabase.rpc('execute_bulk_booking_action', {
            p_operation_id: operationId,
            p_action: selectedAction,
            p_parameters: {}
          }));
          break;

        case 'notifications':
          ({ error: executeError } = await supabase.rpc('send_bulk_notifications', {
            p_operation_id: operationId,
            p_title: notificationTitle,
            p_message: notificationMessage,
            p_notification_type: notificationType
          }));
          break;
      }

      if (executeError) throw executeError;

      toast.success('Bulk operation completed successfully!');
      setShowPreview(false);
      setSelectedItems([]);
      setSelectedAction('');
      setNotificationTitle('');
      setNotificationMessage('');
      loadOperationHistory();
    } catch (error: any) {
      console.error('Error executing operation:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const handleExport = () => {
    const csv = [
      'Type,Action,Status,Target Count,Success,Failed,Created,Completed',
      ...operations.map(op =>
        `${op.operation_type},${op.operation_name},${op.status},${op.target_count},${op.success_count},${op.failed_count},${op.created_at},${op.completed_at || 'N/A'}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-operations-${new Date().toISOString()}.csv`;
    a.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'partially_completed': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'running': return <Clock className="w-4 h-4 animate-spin" />;
      case 'partially_completed': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getUserActions = () => [
    { value: 'activate', label: 'Activate Users', icon: <CheckCircle className="w-4 h-4" /> },
    { value: 'deactivate', label: 'Deactivate Users', icon: <XCircle className="w-4 h-4" /> },
    { value: 'suspend', label: 'Suspend Users', icon: <Ban className="w-4 h-4" /> },
    { value: 'verify', label: 'Verify Users', icon: <Shield className="w-4 h-4" /> },
    { value: 'unverify', label: 'Unverify Users', icon: <Shield className="w-4 h-4" /> },
    { value: 'reset_trust_score', label: 'Reset Trust Score', icon: <RefreshCw className="w-4 h-4" /> },
  ];

  const getRideActions = () => [
    { value: 'cancel', label: 'Cancel Rides', icon: <XCircle className="w-4 h-4" /> },
    { value: 'complete', label: 'Complete Rides', icon: <CheckCircle className="w-4 h-4" /> },
    { value: 'flag_review', label: 'Flag for Review', icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  const getBookingActions = () => [
    { value: 'cancel', label: 'Cancel Bookings', icon: <XCircle className="w-4 h-4" /> },
    { value: 'confirm', label: 'Confirm Bookings', icon: <CheckCircle className="w-4 h-4" /> },
    { value: 'complete', label: 'Complete Bookings', icon: <CheckCircle className="w-4 h-4" /> },
  ];

  if (loading && operations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <AdminLayout
      title="Bulk Operations"
      subtitle="Efficient mass management of users, rides, and data"
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <Download className="w-5 h-5" />
            Export History
          </button>
          <button
            onClick={loadOperationHistory}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      }
    >

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setSelectedTab('new')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${selectedTab === 'new'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
        >
          <span className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            New Operation
          </span>
        </button>
        <button
          onClick={() => setSelectedTab('history')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${selectedTab === 'history'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
        >
          <span className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Operation History ({operations.length})
          </span>
        </button>
      </div>

      {selectedTab === 'new' ? (
        <div className="space-y-6">
          <div className="grid md:grid-cols-4 gap-4">
            <button
              onClick={() => setOperationType('users')}
              className={`p-6 rounded-xl border-2 transition-all ${operationType === 'users'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <Users className={`w-8 h-8 mb-3 ${operationType === 'users' ? 'text-blue-600' : 'text-gray-600'}`} />
              <h3 className="font-semibold text-gray-900">User Operations</h3>
              <p className="text-sm text-gray-600 mt-1">Manage users in bulk</p>
            </button>

            <button
              onClick={() => setOperationType('rides')}
              className={`p-6 rounded-xl border-2 transition-all ${operationType === 'rides'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <Car className={`w-8 h-8 mb-3 ${operationType === 'rides' ? 'text-blue-600' : 'text-gray-600'}`} />
              <h3 className="font-semibold text-gray-900">Ride Operations</h3>
              <p className="text-sm text-gray-600 mt-1">Manage rides in bulk</p>
            </button>

            <button
              onClick={() => setOperationType('bookings')}
              className={`p-6 rounded-xl border-2 transition-all ${operationType === 'bookings'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <Calendar className={`w-8 h-8 mb-3 ${operationType === 'bookings' ? 'text-blue-600' : 'text-gray-600'}`} />
              <h3 className="font-semibold text-gray-900">Booking Operations</h3>
              <p className="text-sm text-gray-600 mt-1">Manage bookings in bulk</p>
            </button>

            <button
              onClick={() => setOperationType('notifications')}
              className={`p-6 rounded-xl border-2 transition-all ${operationType === 'notifications'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <Bell className={`w-8 h-8 mb-3 ${operationType === 'notifications' ? 'text-blue-600' : 'text-gray-600'}`} />
              <h3 className="font-semibold text-gray-900">Send Notifications</h3>
              <p className="text-sm text-gray-600 mt-1">Message multiple users</p>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Configure Operation</h2>
              <span className="text-sm text-gray-600">
                {selectedItems.length} of {previewData.length} selected
              </span>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Action
                </label>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose an action...</option>
                  {operationType === 'users' && getUserActions().map(action => (
                    <option key={action.value} value={action.value}>{action.label}</option>
                  ))}
                  {operationType === 'rides' && getRideActions().map(action => (
                    <option key={action.value} value={action.value}>{action.label}</option>
                  ))}
                  {operationType === 'bookings' && getBookingActions().map(action => (
                    <option key={action.value} value={action.value}>{action.label}</option>
                  ))}
                </select>
              </div>

              {operationType === 'notifications' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notification Title
                    </label>
                    <input
                      type="text"
                      value={notificationTitle}
                      onChange={(e) => setNotificationTitle(e.target.value)}
                      placeholder="Enter notification title"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notification Message
                    </label>
                    <textarea
                      value={notificationMessage}
                      onChange={(e) => setNotificationMessage(e.target.value)}
                      placeholder="Enter notification message"
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notification Type
                    </label>
                    <select
                      value={notificationType}
                      onChange={(e) => setNotificationType(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="info">Info</option>
                      <option value="success">Success</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                </>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${operationType}...`}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedItems.length === previewData.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm text-gray-600">
                Showing {previewData.length} items
              </span>
            </div>

            <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
              {previewData.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No items found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {previewData.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleToggleItem(item.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        {operationType === 'users' && (
                          <>
                            <p className="font-medium text-gray-900">{item.full_name}</p>
                            <p className="text-sm text-gray-600">{item.email}</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${item.status === 'active' ? 'bg-green-100 text-green-800' :
                              item.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                              {item.status}
                            </span>
                          </>
                        )}
                        {operationType === 'rides' && (
                          <>
                            <p className="font-medium text-gray-900">
                              {item.origin} {'->'} {item.destination}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(item.departure_time).toLocaleString()}
                            </p>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${item.status === 'active' ? 'bg-green-100 text-green-800' :
                              item.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                              {item.status}
                            </span>
                          </>
                        )}
                        {operationType === 'bookings' && (
                          <>
                            <p className="font-medium text-gray-900">
                              Booking #{item.id.slice(0, 8)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {item.seats_requested} seat(s)
                            </p>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${item.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                              {item.status}
                            </span>
                          </>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedItems([]);
                  setSelectedAction('');
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Clear Selection
              </button>
              <button
                onClick={handlePreview}
                disabled={selectedItems.length === 0 || !selectedAction}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye className="w-5 h-5" />
                Preview & Execute
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Operation History
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {operations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No operations found</p>
              </div>
            ) : (
              operations.map((operation) => (
                <div key={operation.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{operation.operation_name}</h3>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(operation.status)}`}>
                          {getStatusIcon(operation.status)}
                          {operation.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{operation.description}</p>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-gray-600">
                          Total: <span className="font-medium text-gray-900">{operation.target_count}</span>
                        </span>
                        <span className="text-green-600">
                          Success: <span className="font-medium">{operation.success_count}</span>
                        </span>
                        <span className="text-red-600">
                          Failed: <span className="font-medium">{operation.failed_count}</span>
                        </span>
                        <span className="text-gray-600">
                          Progress: <span className="font-medium text-gray-900">
                            {operation.target_count > 0
                              ? Math.round((operation.processed_count / operation.target_count) * 100)
                              : 0}%
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <p>{new Date(operation.created_at).toLocaleString()}</p>
                      {operation.completed_at && (
                        <p className="text-xs mt-1">
                          Completed: {new Date(operation.completed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Confirm Bulk Operation</h2>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-yellow-900">Warning</h3>
                    <p className="text-sm text-yellow-800 mt-1">
                      This operation will affect {selectedItems.length} items and cannot be easily undone.
                      Please review carefully before proceeding.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Operation Type:</span>
                  <span className="font-medium text-gray-900">{operationType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Action:</span>
                  <span className="font-medium text-gray-900">{selectedAction}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Target Items:</span>
                  <span className="font-medium text-gray-900">{selectedItems.length}</span>
                </div>
                {operationType === 'notifications' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Title:</span>
                      <span className="font-medium text-gray-900">{notificationTitle}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <p className="text-sm text-gray-600 mb-1">Message:</p>
                      <p className="text-sm text-gray-900">{notificationMessage}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowPreview(false)}
                disabled={executing}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExecute}
                disabled={executing}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {executing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Execute Operation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execute Confirmation Modal */}
      <ConfirmModal
        isOpen={showExecuteConfirm}
        onClose={() => setShowExecuteConfirm(false)}
        onConfirm={confirmExecute}
        title="Execute Bulk Operation"
        message={`Are you sure you want to execute this operation on ${selectedItems.length} items? This action may not be reversible.`}
        confirmText="Execute"
        cancelText="Cancel"
        variant="warning"
        loading={executing}
      />
    </AdminLayout>
  );
}

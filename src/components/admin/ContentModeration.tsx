import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Flag,
  MessageSquare,
  User,
  Image as ImageIcon,
  RefreshCw
} from 'lucide-react';

interface ModerationItem {
  id: string;
  content_type: string;
  content_id: string;
  reported_by: string;
  reason: string;
  severity: string;
  status: string;
  created_at: string;
}

interface ContentFilter {
  id: string;
  filter_name: string;
  filter_type: string;
  action: string;
  active: boolean;
  hit_count: number;
}

export function ContentModeration() {
  const [moderationQueue, setModerationQueue] = useState<ModerationItem[]>([]);
  const [contentFilters, setContentFilters] = useState<ContentFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [newFilter, setNewFilter] = useState({
    name: '',
    type: 'profanity',
    action: 'flag'
  });

  useEffect(() => {
    fetchModerationData();
  }, [filterType]);

  const fetchModerationData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('content_moderation_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filterType !== 'all') {
        query = query.eq('status', filterType);
      }

      const { data: queueData } = await query;

      const { data: filtersData } = await supabase
        .from('automated_content_filters')
        .select('*')
        .order('hit_count', { ascending: false });

      if (queueData) setModerationQueue(queueData);
      if (filtersData) setContentFilters(filtersData);
    } catch (error) {
      console.error('Error fetching moderation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerationAction = async (id: string, action: 'approved' | 'rejected' | 'escalated') => {
    try {
      const { error } = await supabase
        .from('content_moderation_queue')
        .update({
          status: action,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', id);

      if (!error) {
        fetchModerationData();
      }
    } catch (error) {
      console.error('Error updating moderation item:', error);
    }
  };

  const toggleFilter = async (id: string, currentState: boolean) => {
    await supabase
      .from('automated_content_filters')
      .update({ active: !currentState })
      .eq('id', id);

    fetchModerationData();
  };

  const createFilter = async () => {
    if (!newFilter.name) return;

    await supabase
      .from('automated_content_filters')
      .insert({
        filter_name: newFilter.name,
        filter_type: newFilter.type,
        action: newFilter.action,
        active: true,
        patterns: []
      });

    setNewFilter({ name: '', type: 'profanity', action: 'flag' });
    fetchModerationData();
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'profile':
        return <User className="w-5 h-5" />;
      case 'review':
        return <MessageSquare className="w-5 h-5" />;
      case 'photo':
        return <ImageIcon className="w-5 h-5" />;
      case 'message':
        return <MessageSquare className="w-5 h-5" />;
      default:
        return <Flag className="w-5 h-5" />;
    }
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
          <h2 className="text-2xl font-bold text-gray-900">Content Moderation</h2>
          <p className="text-gray-600">Review and manage reported content</p>
        </div>
        <button
          onClick={fetchModerationData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Flag className="w-6 h-6" />
            <span className="text-sm opacity-90">Pending Review</span>
          </div>
          <p className="text-3xl font-bold">{moderationQueue.filter(i => i.status === 'pending').length}</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-6 h-6" />
            <span className="text-sm opacity-90">Under Review</span>
          </div>
          <p className="text-3xl font-bold">{moderationQueue.filter(i => i.status === 'reviewing').length}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-6 h-6" />
            <span className="text-sm opacity-90">Approved</span>
          </div>
          <p className="text-3xl font-bold">{moderationQueue.filter(i => i.status === 'approved').length}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-6 h-6" />
            <span className="text-sm opacity-90">Active Filters</span>
          </div>
          <p className="text-3xl font-bold">{contentFilters.filter(f => f.active).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Moderation Queue</h3>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Items</option>
            <option value="pending">Pending</option>
            <option value="reviewing">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="space-y-3">
          {moderationQueue.length > 0 ? (
            moderationQueue.map((item) => (
              <div key={item.id} className={`p-4 rounded-lg border ${getSeverityColor(item.severity)}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-white rounded-lg">
                      {getContentIcon(item.content_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold capitalize">{item.content_type}</span>
                        <span className="px-2 py-1 text-xs rounded-full bg-white">{item.severity}</span>
                        <span className="px-2 py-1 text-xs rounded-full bg-white">{item.status}</span>
                      </div>
                      <p className="text-sm mb-2">Reason: {item.reason}</p>
                      <p className="text-xs opacity-75">{new Date(item.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                {(item.status === 'pending' || item.status === 'reviewing') && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleModerationAction(item.id, 'approved')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleModerationAction(item.id, 'rejected')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleModerationAction(item.id, 'escalated')}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 text-sm"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Escalate
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">No items in moderation queue</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Automated Filters</h3>
          <div className="space-y-2">
            {contentFilters.map((filter) => (
              <div key={filter.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{filter.filter_name}</p>
                  <p className="text-sm text-gray-600">
                    Type: {filter.filter_type} | Action: {filter.action} | Hits: {filter.hit_count}
                  </p>
                </div>
                <button
                  onClick={() => toggleFilter(filter.id, filter.active)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filter.active
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.active ? 'Active' : 'Inactive'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Filter</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter Name</label>
              <input
                type="text"
                value={newFilter.name}
                onChange={(e) => setNewFilter({ ...newFilter, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Profanity Filter"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter Type</label>
              <select
                value={newFilter.type}
                onChange={(e) => setNewFilter({ ...newFilter, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="profanity">Profanity</option>
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="illegal">Illegal Content</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
              <select
                value={newFilter.action}
                onChange={(e) => setNewFilter({ ...newFilter, action: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="flag">Flag for Review</option>
                <option value="block">Block Content</option>
                <option value="auto_remove">Auto Remove</option>
                <option value="shadow_ban">Shadow Ban</option>
              </select>
            </div>
            <button
              onClick={createFilter}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
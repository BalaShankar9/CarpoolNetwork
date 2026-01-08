import { useState, useEffect } from 'react';
import {
    Megaphone,
    Plus,
    RefreshCw,
    Filter,
    Eye,
    EyeOff,
    Trash2,
    Edit,
    Calendar,
    Users,
    Send,
} from 'lucide-react';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import AnnouncementCard from '../../components/admin/AnnouncementCard';
import AnnouncementModal from '../../components/admin/AnnouncementModal';

interface Announcement {
    id: string;
    title: string;
    body: string;
    type: string;
    priority: string;
    target_audience: string;
    display_type: string;
    starts_at?: string;
    ends_at?: string;
    is_active: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
    view_count: number;
    dismiss_count: number;
}

export default function AnnouncementsManagement() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'scheduled' | 'expired'>('all');
    const [showModal, setShowModal] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

    useEffect(() => {
        loadAnnouncements();
    }, [filter]);

    const loadAnnouncements = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('admin_get_announcements', {
                p_filter: filter,
                p_limit: 50,
            });

            if (error) throw error;
            setAnnouncements(data || []);
        } catch (err) {
            console.error('Failed to load announcements:', err);
            toast.error('Failed to load announcements');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingAnnouncement(null);
        setShowModal(true);
    };

    const handleEdit = (announcement: Announcement) => {
        setEditingAnnouncement(announcement);
        setShowModal(true);
    };

    const handleSave = async (data: any) => {
        try {
            if (editingAnnouncement) {
                // Update existing
                const { error } = await supabase.rpc('admin_update_announcement', {
                    p_announcement_id: editingAnnouncement.id,
                    p_title: data.title,
                    p_body: data.body,
                    p_type: data.type,
                    p_priority: data.priority,
                    p_target_audience: data.target_audience,
                    p_display_type: data.display_type,
                    p_starts_at: data.starts_at,
                    p_ends_at: data.ends_at,
                });

                if (error) throw error;
                toast.success('Announcement updated successfully');
            } else {
                // Create new
                const { error } = await supabase.rpc('admin_create_announcement', {
                    p_title: data.title,
                    p_body: data.body,
                    p_type: data.type,
                    p_priority: data.priority,
                    p_target_audience: data.target_audience,
                    p_display_type: data.display_type,
                    p_starts_at: data.starts_at,
                    p_ends_at: data.ends_at,
                });

                if (error) throw error;
                toast.success('Announcement created successfully');
            }

            setShowModal(false);
            loadAnnouncements();
        } catch (err: any) {
            toast.error(err.message || 'Failed to save announcement');
        }
    };

    const handleToggleActive = async (announcement: Announcement) => {
        try {
            const { error } = await supabase.rpc('admin_update_announcement', {
                p_announcement_id: announcement.id,
                p_is_active: !announcement.is_active,
            });

            if (error) throw error;
            toast.success(
                announcement.is_active ? 'Announcement deactivated' : 'Announcement activated'
            );
            loadAnnouncements();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update announcement');
        }
    };

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [broadcastConfirmId, setBroadcastConfirmId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [broadcasting, setBroadcasting] = useState(false);

    const handleDelete = async (id: string) => {
        setDeleteConfirmId(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        setDeleting(true);
        try {
            const { error } = await supabase.rpc('admin_delete_announcement', {
                p_announcement_id: deleteConfirmId,
            });

            if (error) throw error;
            toast.success('Announcement deleted');
            setAnnouncements(announcements.filter((a) => a.id !== deleteConfirmId));
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete announcement');
        } finally {
            setDeleting(false);
            setDeleteConfirmId(null);
        }
    };

    const handleBroadcast = async (id: string) => {
        setBroadcastConfirmId(id);
    };

    const confirmBroadcast = async () => {
        if (!broadcastConfirmId) return;
        setBroadcasting(true);
        try {
            const { data, error } = await supabase.rpc('admin_broadcast_announcement', {
                p_announcement_id: broadcastConfirmId,
            });

            if (error) throw error;
            toast.success(`Broadcast sent to ${data?.sent_count || 0} users`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to broadcast announcement');
        } finally {
            setBroadcasting(false);
            setBroadcastConfirmId(null);
        }
    };

    const getStatusCounts = () => {
        const now = new Date();
        return {
            all: announcements.length,
            active: announcements.filter((a) => a.is_active && (!a.ends_at || new Date(a.ends_at) > now))
                .length,
            scheduled: announcements.filter((a) => a.starts_at && new Date(a.starts_at) > now).length,
            expired: announcements.filter((a) => a.ends_at && new Date(a.ends_at) < now).length,
        };
    };

    const counts = getStatusCounts();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
                    <p className="text-gray-600 mt-1">Create and manage system announcements</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Create Announcement
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                    onClick={() => setFilter('all')}
                    className={`bg-white rounded-xl shadow-sm border p-4 text-left transition-colors ${filter === 'all' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100'
                        }`}
                >
                    <p className="text-sm text-gray-500">All</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{counts.all}</p>
                </button>

                <button
                    onClick={() => setFilter('active')}
                    className={`bg-white rounded-xl shadow-sm border p-4 text-left transition-colors ${filter === 'active' ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-100'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Active</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{counts.active}</p>
                        </div>
                        <Eye className="w-5 h-5 text-green-500" />
                    </div>
                </button>

                <button
                    onClick={() => setFilter('scheduled')}
                    className={`bg-white rounded-xl shadow-sm border p-4 text-left transition-colors ${filter === 'scheduled' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Scheduled</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">{counts.scheduled}</p>
                        </div>
                        <Calendar className="w-5 h-5 text-blue-500" />
                    </div>
                </button>

                <button
                    onClick={() => setFilter('expired')}
                    className={`bg-white rounded-xl shadow-sm border p-4 text-left transition-colors ${filter === 'expired' ? 'border-gray-500 ring-1 ring-gray-500' : 'border-gray-100'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Expired</p>
                            <p className="text-2xl font-bold text-gray-400 mt-1">{counts.expired}</p>
                        </div>
                        <EyeOff className="w-5 h-5 text-gray-400" />
                    </div>
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                    Showing {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
                </div>
                <button
                    onClick={loadAnnouncements}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Announcements List */}
            {loading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-gray-500 mt-3">Loading announcements...</p>
                </div>
            ) : announcements.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No announcements found</p>
                    <p className="text-sm text-gray-400 mt-1">Create your first announcement above</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {announcements.map((announcement) => (
                        <AnnouncementCard
                            key={announcement.id}
                            announcement={{
                                ...announcement,
                                announcement_type: announcement.type,
                                starts_at: announcement.starts_at || new Date().toISOString(),
                            }}
                            onEdit={() => handleEdit(announcement)}
                            onToggleActive={() => handleToggleActive(announcement)}
                            onBroadcast={() => handleBroadcast(announcement.id)}
                            onDelete={() => handleDelete(announcement.id)}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            <AnnouncementModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSave={handleSave}
                announcement={editingAnnouncement}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={confirmDelete}
                title="Delete Announcement"
                message="Are you sure you want to delete this announcement? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                loading={deleting}
            />

            {/* Broadcast Confirmation Modal */}
            <ConfirmModal
                isOpen={!!broadcastConfirmId}
                onClose={() => setBroadcastConfirmId(null)}
                onConfirm={confirmBroadcast}
                title="Broadcast Announcement"
                message="Are you sure you want to broadcast this announcement to all eligible users?"
                confirmText="Broadcast"
                cancelText="Cancel"
                variant="info"
                loading={broadcasting}
            />
        </div>
    );
}

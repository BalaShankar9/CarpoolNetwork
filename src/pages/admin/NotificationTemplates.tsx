import { useState, useEffect } from 'react';
import {
    FileText,
    Plus,
    RefreshCw,
    Search,
    Edit,
    Trash2,
    Copy,
    Send,
    Eye,
    EyeOff,
    Code,
    Tag,
} from 'lucide-react';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import TemplateEditor from '../../components/admin/TemplateEditor';
import SendNotificationModal from '../../components/admin/SendNotificationModal';

interface Template {
    id: string;
    name: string;
    slug: string;
    subject: string;
    body: string;
    variables: string[];
    type: string;
    is_active: boolean;
    description?: string;
    created_at: string;
    updated_at: string;
    use_count: number;
}

const TYPE_COLORS: Record<string, string> = {
    transactional: 'bg-blue-100 text-blue-700',
    promotional: 'bg-pink-100 text-pink-700',
    reminder: 'bg-yellow-100 text-yellow-700',
    alert: 'bg-red-100 text-red-700',
    system: 'bg-gray-100 text-gray-700',
};

export default function NotificationTemplates() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [showEditor, setShowEditor] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [showSendFromTemplate, setShowSendFromTemplate] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('admin_get_notification_templates');

            if (error) throw error;
            setTemplates(data || []);
        } catch (err) {
            console.error('Failed to load templates:', err);
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingTemplate(null);
        setShowEditor(true);
    };

    const handleEdit = (template: Template) => {
        setEditingTemplate(template);
        setShowEditor(true);
    };

    const handleSave = async (data: any) => {
        try {
            if (editingTemplate) {
                // Update existing
                const { error } = await supabase.rpc('admin_update_notification_template', {
                    p_template_id: editingTemplate.id,
                    p_name: data.name,
                    p_slug: data.slug,
                    p_subject: data.subject,
                    p_body: data.body,
                    p_variables: data.variables,
                    p_type: data.type,
                    p_description: data.description,
                });

                if (error) throw error;
                toast.success('Template updated successfully');
            } else {
                // Create new
                const { error } = await supabase.rpc('admin_create_notification_template', {
                    p_name: data.name,
                    p_slug: data.slug,
                    p_subject: data.subject,
                    p_body: data.body,
                    p_variables: data.variables,
                    p_type: data.type,
                    p_description: data.description,
                });

                if (error) throw error;
                toast.success('Template created successfully');
            }

            setShowEditor(false);
            loadTemplates();
        } catch (err: any) {
            toast.error(err.message || 'Failed to save template');
        }
    };

    const handleToggleActive = async (template: Template) => {
        try {
            const { error } = await supabase.rpc('admin_update_notification_template', {
                p_template_id: template.id,
                p_is_active: !template.is_active,
            });

            if (error) throw error;
            toast.success(template.is_active ? 'Template disabled' : 'Template enabled');
            loadTemplates();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update template');
        }
    };

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async (id: string) => {
        setDeleteConfirmId(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        setDeleting(true);
        try {
            const { error } = await supabase.rpc('admin_delete_notification_template', {
                p_template_id: deleteConfirmId,
            });

            if (error) throw error;
            toast.success('Template deleted');
            setTemplates(templates.filter((t) => t.id !== deleteConfirmId));
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete template');
        } finally {
            setDeleting(false);
            setDeleteConfirmId(null);
        }
    };

    const handleDuplicate = (template: Template) => {
        setEditingTemplate({
            ...template,
            id: '',
            name: `${template.name} (Copy)`,
            slug: `${template.slug}-copy`,
        });
        setShowEditor(true);
    };

    const handleSendFromTemplate = (template: Template) => {
        setSelectedTemplate(template);
        setShowSendFromTemplate(true);
    };

    const handleSendNotification = async (data: any) => {
        if (!selectedTemplate) return;

        try {
            const { error } = await supabase.rpc('admin_send_from_template', {
                p_template_slug: selectedTemplate.slug,
                p_user_id: data.user_id,
                p_variables: {}, // In a real app, you'd collect variable values
                p_priority: data.priority,
            });

            if (error) throw error;
            toast.success('Notification sent from template');
            setShowSendFromTemplate(false);
            setSelectedTemplate(null);
            loadTemplates(); // Refresh to update use count
        } catch (err: any) {
            toast.error(err.message || 'Failed to send notification');
        }
    };

    // Filter templates
    const filteredTemplates = templates.filter((template) => {
        const matchesSearch =
            !searchTerm ||
            template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.slug.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || template.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const types = Array.from(new Set(templates.map((t) => t.type)));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notification Templates</h1>
                    <p className="text-gray-600 mt-1">Create reusable notification templates with variables</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Create Template
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="text-sm text-gray-500">Total Templates</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{templates.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="text-sm text-gray-500">Active</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                        {templates.filter((t) => t.is_active).length}
                    </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="text-sm text-gray-500">Total Uses</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                        {templates.reduce((sum, t) => sum + (t.use_count || 0), 0)}
                    </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="text-sm text-gray-500">Types</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{types.length}</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search templates..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Types</option>
                    {types.map((type) => (
                        <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                    ))}
                </select>

                <button
                    onClick={loadTemplates}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Templates Grid */}
            {loading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-gray-500 mt-3">Loading templates...</p>
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No templates found</p>
                    <p className="text-sm text-gray-400 mt-1">Create your first template above</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTemplates.map((template) => (
                        <div
                            key={template.id}
                            className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${template.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'
                                }`}
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-gray-100">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-900">{template.name}</h3>
                                            {!template.is_active && (
                                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                                                    Disabled
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Code className="w-3 h-3 text-gray-400" />
                                            <code className="text-xs text-gray-500">{template.slug}</code>
                                        </div>
                                    </div>
                                    <span
                                        className={`text-xs px-2 py-1 rounded-full ${TYPE_COLORS[template.type] || TYPE_COLORS.system
                                            }`}
                                    >
                                        {template.type}
                                    </span>
                                </div>
                            </div>

                            {/* Body Preview */}
                            <div className="p-4">
                                {template.subject && (
                                    <p className="text-sm text-gray-600 mb-2 truncate">
                                        <span className="font-medium">Subject:</span> {template.subject}
                                    </p>
                                )}
                                <p className="text-sm text-gray-500 line-clamp-3">{template.body}</p>

                                {/* Variables */}
                                {template.variables && template.variables.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        {template.variables.slice(0, 4).map((variable) => (
                                            <span
                                                key={variable}
                                                className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-mono"
                                            >
                                                {'{{'}{variable}{'}}'}
                                            </span>
                                        ))}
                                        {template.variables.length > 4 && (
                                            <span className="text-xs text-gray-400">
                                                +{template.variables.length - 4} more
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">
                                        Used {template.use_count || 0} times
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleSendFromTemplate(template)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            title="Send using template"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDuplicate(template)}
                                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                                            title="Duplicate"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleToggleActive(template)}
                                            className={`p-1.5 rounded ${template.is_active
                                                    ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                                                    : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                                }`}
                                            title={template.is_active ? 'Disable' : 'Enable'}
                                        >
                                            {template.is_active ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleEdit(template)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            title="Edit"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(template.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Editor Modal */}
            <TemplateEditor
                isOpen={showEditor}
                onClose={() => setShowEditor(false)}
                onSave={handleSave}
                template={editingTemplate}
            />

            {/* Send from Template Modal */}
            <SendNotificationModal
                isOpen={showSendFromTemplate}
                onClose={() => {
                    setShowSendFromTemplate(false);
                    setSelectedTemplate(null);
                }}
                onSend={handleSendNotification}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={confirmDelete}
                title="Delete Template"
                message="Are you sure you want to delete this template? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                loading={deleting}
            />
        </div>
    );
}

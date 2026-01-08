import { useState, useEffect } from 'react';
import { X, Save, FileText, Code, Plus, Trash2, Eye, Copy, Info } from 'lucide-react';

interface TemplateEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: TemplateData) => void;
    template?: Template | null;
}

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
}

interface TemplateData {
    name: string;
    slug: string;
    subject: string;
    body: string;
    variables: string[];
    type: string;
    description?: string;
}

const TEMPLATE_TYPES = [
    { value: 'transactional', label: 'Transactional', description: 'For actions like booking, cancellation' },
    { value: 'promotional', label: 'Promotional', description: 'For marketing and promotions' },
    { value: 'reminder', label: 'Reminder', description: 'For scheduled reminders' },
    { value: 'alert', label: 'Alert', description: 'For important alerts' },
    { value: 'system', label: 'System', description: 'For system notifications' },
];

const COMMON_VARIABLES = [
    { name: 'user_name', description: "User's full name" },
    { name: 'user_email', description: "User's email address" },
    { name: 'ride_date', description: 'Date of the ride' },
    { name: 'ride_time', description: 'Time of the ride' },
    { name: 'pickup_location', description: 'Pickup address' },
    { name: 'dropoff_location', description: 'Dropoff address' },
    { name: 'driver_name', description: "Driver's name" },
    { name: 'booking_id', description: 'Booking reference ID' },
    { name: 'amount', description: 'Payment amount' },
    { name: 'app_name', description: 'Application name' },
];

export default function TemplateEditor({
    isOpen,
    onClose,
    onSave,
    template,
}: TemplateEditorProps) {
    const [formData, setFormData] = useState<TemplateData>({
        name: '',
        slug: '',
        subject: '',
        body: '',
        variables: [],
        type: 'transactional',
        description: '',
    });
    const [customVariable, setCustomVariable] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<Record<string, string>>({});

    useEffect(() => {
        if (template) {
            setFormData({
                name: template.name,
                slug: template.slug,
                subject: template.subject,
                body: template.body,
                variables: template.variables || [],
                type: template.type,
                description: template.description || '',
            });
        } else {
            setFormData({
                name: '',
                slug: '',
                subject: '',
                body: '',
                variables: [],
                type: 'transactional',
                description: '',
            });
        }
        setShowPreview(false);
        setPreviewData({});
    }, [template, isOpen]);

    if (!isOpen) return null;

    const handleNameChange = (name: string) => {
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        setFormData({ ...formData, name, slug });
    };

    const addVariable = (variable: string) => {
        const varName = variable.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (varName && !formData.variables.includes(varName)) {
            setFormData({ ...formData, variables: [...formData.variables, varName] });
        }
        setCustomVariable('');
    };

    const removeVariable = (variable: string) => {
        setFormData({
            ...formData,
            variables: formData.variables.filter((v) => v !== variable),
        });
    };

    const insertVariable = (variable: string) => {
        const textarea = document.querySelector('#template-body') as HTMLTextAreaElement;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = formData.body;
            const before = text.substring(0, start);
            const after = text.substring(end);
            const newBody = `${before}{{${variable}}}${after}`;
            setFormData({ ...formData, body: newBody });

            // Reset cursor position after React re-renders
            setTimeout(() => {
                textarea.focus();
                textarea.selectionStart = textarea.selectionEnd = start + variable.length + 4;
            }, 0);
        }
    };

    const getPreviewText = () => {
        let text = formData.body;
        formData.variables.forEach((variable) => {
            const value = previewData[variable] || `[${variable}]`;
            text = text.replace(new RegExp(`{{${variable}}}`, 'g'), value);
        });
        return text;
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.slug || !formData.body) return;

        setIsSubmitting(true);
        try {
            await onSave(formData);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const isEditing = !!template;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            {isEditing ? 'Edit Template' : 'Create Template'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className={`p-2 rounded-lg transition-colors ${showPreview
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                }`}
                            title="Toggle Preview"
                        >
                            <Eye className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex">
                    {/* Main Form */}
                    <div className={`p-4 space-y-4 ${showPreview ? 'w-1/2 border-r' : 'w-full'}`}>
                        {/* Name & Slug */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Template Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder="e.g., Booking Confirmation"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <span className="flex items-center gap-1">
                                        <Code className="w-3.5 h-3.5" />
                                        Slug *
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    placeholder="booking-confirmation"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                />
                            </div>
                        </div>

                        {/* Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Template Type</label>
                            <div className="flex flex-wrap gap-2">
                                {TEMPLATE_TYPES.map((type) => (
                                    <button
                                        key={type.value}
                                        onClick={() => setFormData({ ...formData, type: type.value })}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${formData.type === type.value
                                                ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        title={type.description}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Subject */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Subject (for emails)
                            </label>
                            <input
                                type="text"
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                placeholder="e.g., Your booking is confirmed!"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description (internal)
                            </label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="When this template should be used..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Variables */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <span className="flex items-center gap-1">
                                    Variables
                                    <Info className="w-3.5 h-3.5 text-gray-400" />
                                </span>
                            </label>

                            {/* Current Variables */}
                            {formData.variables.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {formData.variables.map((variable) => (
                                        <div
                                            key={variable}
                                            className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm"
                                        >
                                            <Code className="w-3 h-3" />
                                            <span className="font-mono">{'{{' + variable + '}}'}</span>
                                            <button
                                                onClick={() => insertVariable(variable)}
                                                className="p-0.5 hover:bg-blue-100 rounded"
                                                title="Insert into body"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => removeVariable(variable)}
                                                className="p-0.5 hover:bg-red-100 rounded text-red-500"
                                                title="Remove variable"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Variable */}
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={customVariable}
                                    onChange={(e) => setCustomVariable(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addVariable(customVariable)}
                                    placeholder="Add custom variable..."
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                                <button
                                    onClick={() => addVariable(customVariable)}
                                    disabled={!customVariable}
                                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Common Variables */}
                            <div className="text-xs text-gray-500 mb-1">Quick add common variables:</div>
                            <div className="flex flex-wrap gap-1">
                                {COMMON_VARIABLES.filter((v) => !formData.variables.includes(v.name)).map(
                                    (variable) => (
                                        <button
                                            key={variable.name}
                                            onClick={() => addVariable(variable.name)}
                                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
                                            title={variable.description}
                                        >
                                            {variable.name}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Body */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Template Body *
                            </label>
                            <textarea
                                id="template-body"
                                value={formData.body}
                                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                placeholder={`Hello {{user_name}},\n\nYour ride on {{ride_date}} has been confirmed!\n\nPickup: {{pickup_location}}\nDropoff: {{dropoff_location}}\n\nThank you for using {{app_name}}!`}
                                rows={8}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Use {'{{variable_name}}'} syntax to insert variables
                            </p>
                        </div>
                    </div>

                    {/* Preview Panel */}
                    {showPreview && (
                        <div className="w-1/2 p-4 bg-gray-50">
                            <h3 className="font-medium text-gray-900 mb-3">Live Preview</h3>

                            {/* Variable Inputs */}
                            {formData.variables.length > 0 && (
                                <div className="mb-4 space-y-2">
                                    <p className="text-xs text-gray-500">Test with sample values:</p>
                                    {formData.variables.map((variable) => (
                                        <div key={variable} className="flex items-center gap-2">
                                            <label className="text-xs text-gray-600 w-24 font-mono">{variable}:</label>
                                            <input
                                                type="text"
                                                value={previewData[variable] || ''}
                                                onChange={(e) =>
                                                    setPreviewData({ ...previewData, [variable]: e.target.value })
                                                }
                                                placeholder={`Sample ${variable}`}
                                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Preview Output */}
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                {formData.subject && (
                                    <div className="mb-3 pb-3 border-b border-gray-100">
                                        <p className="text-xs text-gray-500 mb-1">Subject:</p>
                                        <p className="font-medium text-gray-900">{formData.subject}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Body:</p>
                                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                                        {getPreviewText() || 'Enter template body to see preview...'}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !formData.name || !formData.slug || !formData.body}
                        className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {isEditing ? 'Update Template' : 'Create Template'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

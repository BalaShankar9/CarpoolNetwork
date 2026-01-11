import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import {
    Settings,
    Save,
    RefreshCw,
    AlertTriangle,
    Check,
    X,
    Lock,
    Unlock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../lib/toast';

interface PlatformSetting {
    id: string;
    setting_key: string;
    setting_value: any;
    setting_type: 'boolean' | 'number' | 'string' | 'json' | 'array';
    category: string;
    description: string;
    is_public: boolean;
    updated_at: string;
}

interface SettingsByCategory {
    [category: string]: PlatformSetting[];
}

export default function PlatformSettings() {
    const { user } = useAuth();
    const [settings, setSettings] = useState<PlatformSetting[]>([]);
    const [settingsByCategory, setSettingsByCategory] = useState<SettingsByCategory>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>('features');
    const [editedValues, setEditedValues] = useState<{ [key: string]: any }>({});

    const categories = [
        { id: 'features', label: 'Features', icon: '🎯' },
        { id: 'limits', label: 'Limits & Restrictions', icon: '📊' },
        { id: 'security', label: 'Security', icon: '🔒' },
        { id: 'notifications', label: 'Notifications', icon: '🔔' },
        { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
        { id: 'integrations', label: 'Integrations', icon: '🔌' },
    ];

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('platform_settings')
                .select('*')
                .order('category', { ascending: true })
                .order('setting_key', { ascending: true });

            if (error) throw error;

            setSettings(data || []);

            // Group by category
            const grouped: SettingsByCategory = {};
            (data || []).forEach((setting) => {
                if (!grouped[setting.category]) {
                    grouped[setting.category] = [];
                }
                grouped[setting.category].push(setting);
            });
            setSettingsByCategory(grouped);
        } catch (error: any) {
            console.error('Error loading settings:', error);
            toast.error('Failed to load platform settings');
        } finally {
            setLoading(false);
        }
    };

    const handleValueChange = (key: string, value: any, type: string) => {
        let processedValue = value;

        // Process based on type
        if (type === 'boolean') {
            processedValue = value === 'true' || value === true;
        } else if (type === 'number') {
            processedValue = parseFloat(value) || 0;
        }

        setEditedValues((prev) => ({
            ...prev,
            [key]: processedValue,
        }));
    };

    const saveSetting = async (key: string) => {
        if (!editedValues[key] === undefined) return;

        setSaving(true);
        try {
            const { error } = await supabase.rpc('update_platform_setting', {
                p_key: key,
                p_value: JSON.stringify(editedValues[key]),
                p_user_id: user?.id,
            });

            if (error) throw error;

            toast.success('Setting updated successfully');

            // Remove from edited values
            setEditedValues((prev) => {
                const newValues = { ...prev };
                delete newValues[key];
                return newValues;
            });

            // Reload settings
            await loadSettings();
        } catch (error: any) {
            console.error('Error saving setting:', error);
            toast.error(`Failed to update setting: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const renderSettingInput = (setting: PlatformSetting) => {
        const currentValue = editedValues[setting.setting_key] !== undefined
            ? editedValues[setting.setting_key]
            : setting.setting_value;

        const hasChanges = editedValues[setting.setting_key] !== undefined;

        switch (setting.setting_type) {
            case 'boolean':
                return (
                    <div className="flex items-center gap-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={currentValue === true || currentValue === 'true'}
                                onChange={(e) => handleValueChange(setting.setting_key, e.target.checked, 'boolean')}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            <span className="ml-3 text-sm font-medium text-gray-700">
                                {currentValue === true || currentValue === 'true' ? 'Enabled' : 'Disabled'}
                            </span>
                        </label>
                        {hasChanges && (
                            <button
                                onClick={() => saveSetting(setting.setting_key)}
                                disabled={saving}
                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                title="Save changes"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                );

            case 'number':
                return (
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={currentValue}
                            onChange={(e) => handleValueChange(setting.setting_key, e.target.value, 'number')}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {hasChanges && (
                            <>
                                <button
                                    onClick={() => saveSetting(setting.setting_key)}
                                    disabled={saving}
                                    className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                    title="Save changes"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setEditedValues((prev) => {
                                            const newValues = { ...prev };
                                            delete newValues[setting.setting_key];
                                            return newValues;
                                        });
                                    }}
                                    className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                                    title="Cancel changes"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                );

            case 'string':
                return (
                    <div className="flex items-center gap-2 flex-1">
                        <input
                            type="text"
                            value={currentValue}
                            onChange={(e) => handleValueChange(setting.setting_key, e.target.value, 'string')}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {hasChanges && (
                            <>
                                <button
                                    onClick={() => saveSetting(setting.setting_key)}
                                    disabled={saving}
                                    className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                    title="Save changes"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setEditedValues((prev) => {
                                            const newValues = { ...prev };
                                            delete newValues[setting.setting_key];
                                            return newValues;
                                        });
                                    }}
                                    className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                                    title="Cancel changes"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                );

            default:
                return (
                    <div className="text-sm text-gray-500">
                        {JSON.stringify(currentValue)}
                    </div>
                );
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    const activeCategorySettings = settingsByCategory[activeCategory] || [];

    return (
        <AdminLayout
            title="Platform Settings"
            subtitle="Configure global platform behavior and features"
            actions={
                <button
                    onClick={loadSettings}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                    <RefreshCw className="w-5 h-5" />
                    Refresh
                </button>
            }
        >
            <div className="grid lg:grid-cols-4 gap-6">
                {/* Category Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
                        <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
                        <div className="space-y-2">
                            {categories.map((category) => (
                                <button
                                    key={category.id}
                                    onClick={() => setActiveCategory(category.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeCategory === category.id
                                            ? 'bg-blue-50 text-blue-700 font-medium'
                                            : 'hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    <span className="text-xl">{category.icon}</span>
                                    <span>{category.label}</span>
                                    {settingsByCategory[category.id] && (
                                        <span className="ml-auto text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                                            {settingsByCategory[category.id].length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Settings List */}
                <div className="lg:col-span-3 space-y-4">
                    {activeCategorySettings.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                            <p className="text-gray-500">No settings in this category</p>
                        </div>
                    ) : (
                        activeCategorySettings.map((setting) => (
                            <div
                                key={setting.setting_key}
                                className="bg-white rounded-xl border border-gray-200 p-6"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-semibold text-gray-900">
                                                {setting.setting_key.split('.')[1]?.replace(/_/g, ' ') || setting.setting_key}
                                            </h3>
                                            <span title={setting.is_public ? "Public setting" : "Private setting"}>
                                                {setting.is_public ? (
                                                    <Unlock className="w-4 h-4 text-gray-400" />
                                                ) : (
                                                    <Lock className="w-4 h-4 text-orange-500" />
                                                )}
                                            </span>
                                        </div>
                                        {setting.description && (
                                            <p className="text-sm text-gray-600 mb-4">{setting.description}</p>
                                        )}
                                        <div className="flex items-center gap-3">
                                            {renderSettingInput(setting)}
                                        </div>
                                        <div className="mt-3 text-xs text-gray-400">
                                            Last updated: {new Date(setting.updated_at).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Warning for Maintenance Mode */}
                    {activeCategory === 'maintenance' && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-orange-900 mb-1">Maintenance Mode Warning</h4>
                                    <p className="text-sm text-orange-700">
                                        Enabling maintenance mode will block all non-admin users from accessing the platform.
                                        Make sure to communicate this to your users before enabling.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Webhook,
    Key,
    Plus,
    Trash2,
    Eye,
    EyeOff,
    Copy,
    Check,
    AlertCircle,
    RefreshCw,
    ChevronRight,
    ChevronDown,
    Send,
    Clock,
    CheckCircle,
    XCircle,
    Code,
    Settings,
    Shield,
} from 'lucide-react';
import {
    webhookService,
    Webhook as WebhookType,
    WebhookDelivery,
    ApiKey,
    WEBHOOK_EVENTS,
    API_SCOPES,
    WebhookEvent,
    ApiScope,
} from '../../services/webhookService';
import { useAuth } from '../../contexts/AuthContext';

export function DeveloperSettings() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'webhooks' | 'api-keys'>('webhooks');
    const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            loadData();
        }
    }, [user?.id]);

    const loadData = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const [webhooksData, apiKeysData] = await Promise.all([
                webhookService.getWebhooks(user.id),
                webhookService.getApiKeys(user.id),
            ]);
            setWebhooks(webhooksData);
            setApiKeys(apiKeysData);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Developer Settings</h1>
                <p className="text-gray-500">Manage webhooks and API access for integrations</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                <button
                    onClick={() => setActiveTab('webhooks')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'webhooks'
                            ? 'bg-white text-gray-900 shadow'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    <Webhook className="w-4 h-4" />
                    Webhooks
                </button>
                <button
                    onClick={() => setActiveTab('api-keys')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'api-keys'
                            ? 'bg-white text-gray-900 shadow'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    <Key className="w-4 h-4" />
                    API Keys
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-gray-200 rounded-xl" />
                    ))}
                </div>
            ) : activeTab === 'webhooks' ? (
                <WebhooksSection
                    webhooks={webhooks}
                    onRefresh={loadData}
                    userId={user?.id || ''}
                />
            ) : (
                <ApiKeysSection
                    apiKeys={apiKeys}
                    onRefresh={loadData}
                    userId={user?.id || ''}
                />
            )}
        </div>
    );
}

// Webhooks Section
function WebhooksSection({
    webhooks,
    onRefresh,
    userId,
}: {
    webhooks: WebhookType[];
    onRefresh: () => void;
    userId: string;
}) {
    const [showCreate, setShowCreate] = useState(false);
    const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
    const [deliveries, setDeliveries] = useState<Record<string, WebhookDelivery[]>>({});

    const loadDeliveries = async (webhookId: string) => {
        const data = await webhookService.getDeliveries(webhookId);
        setDeliveries((prev) => ({ ...prev, [webhookId]: data }));
    };

    const toggleExpand = (webhookId: string) => {
        if (expandedWebhook === webhookId) {
            setExpandedWebhook(null);
        } else {
            setExpandedWebhook(webhookId);
            if (!deliveries[webhookId]) {
                loadDeliveries(webhookId);
            }
        }
    };

    const handleTest = async (webhookId: string) => {
        await webhookService.testWebhook(webhookId);
        loadDeliveries(webhookId);
    };

    const handleDelete = async (webhookId: string) => {
        if (confirm('Are you sure you want to delete this webhook?')) {
            await webhookService.deleteWebhook(webhookId);
            onRefresh();
        }
    };

    return (
        <div className="space-y-4">
            {/* Create Button */}
            <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">{webhooks.length} webhook(s) configured</p>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Add Webhook
                </button>
            </div>

            {/* Webhooks List */}
            {webhooks.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <Webhook className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No webhooks configured</h3>
                    <p className="text-gray-500 mb-4">
                        Webhooks allow you to receive real-time notifications when events occur.
                    </p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Create Your First Webhook
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {webhooks.map((webhook) => (
                        <div
                            key={webhook.id}
                            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                        >
                            {/* Webhook Header */}
                            <div
                                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => toggleExpand(webhook.id)}
                            >
                                <div className={`w-3 h-3 rounded-full ${webhook.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900">{webhook.name}</p>
                                    <p className="text-sm text-gray-500 truncate">{webhook.url}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                        {webhook.events.length} events
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleTest(webhook.id);
                                        }}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Send test"
                                    >
                                        <Send className="w-4 h-4 text-gray-500" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(webhook.id);
                                        }}
                                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </button>
                                    <ChevronDown
                                        className={`w-5 h-5 text-gray-400 transition-transform ${expandedWebhook === webhook.id ? 'rotate-180' : ''
                                            }`}
                                    />
                                </div>
                            </div>

                            {/* Expanded Details */}
                            <AnimatePresence>
                                {expandedWebhook === webhook.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-gray-100"
                                    >
                                        <div className="p-4 space-y-4">
                                            {/* Events */}
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 mb-2">Subscribed Events</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {webhook.events.map((event) => (
                                                        <span
                                                            key={event}
                                                            className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded font-mono"
                                                        >
                                                            {event}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Secret */}
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 mb-2">Signing Secret</p>
                                                <SecretDisplay secret={webhook.secret} />
                                            </div>

                                            {/* Recent Deliveries */}
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 mb-2">Recent Deliveries</p>
                                                {deliveries[webhook.id]?.length > 0 ? (
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {deliveries[webhook.id].slice(0, 5).map((delivery) => (
                                                            <div
                                                                key={delivery.id}
                                                                className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-sm"
                                                            >
                                                                {delivery.success ? (
                                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                                ) : (
                                                                    <XCircle className="w-4 h-4 text-red-500" />
                                                                )}
                                                                <span className="font-mono text-gray-600">{delivery.event}</span>
                                                                <span className="text-gray-400">
                                                                    {delivery.responseStatus || 'Error'}
                                                                </span>
                                                                <span className="text-gray-400 text-xs">
                                                                    {delivery.responseTime}ms
                                                                </span>
                                                                <span className="text-gray-400 text-xs ml-auto">
                                                                    {new Date(delivery.createdAt).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500">No deliveries yet</p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {showCreate && (
                    <CreateWebhookModal
                        userId={userId}
                        onClose={() => setShowCreate(false)}
                        onSuccess={() => {
                            setShowCreate(false);
                            onRefresh();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// API Keys Section
function ApiKeysSection({
    apiKeys,
    onRefresh,
    userId,
}: {
    apiKeys: ApiKey[];
    onRefresh: () => void;
    userId: string;
}) {
    const [showCreate, setShowCreate] = useState(false);
    const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

    const handleRevoke = async (keyId: string) => {
        if (confirm('Are you sure you want to revoke this API key?')) {
            await webhookService.revokeApiKey(keyId);
            onRefresh();
        }
    };

    const handleDelete = async (keyId: string) => {
        if (confirm('Are you sure you want to delete this API key permanently?')) {
            await webhookService.deleteApiKey(keyId);
            onRefresh();
        }
    };

    return (
        <div className="space-y-4">
            {/* Create Button */}
            <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">{apiKeys.length} API key(s)</p>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Create API Key
                </button>
            </div>

            {/* New Key Alert */}
            <AnimatePresence>
                {newKeyValue && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-green-50 border border-green-200 rounded-xl p-4"
                    >
                        <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-medium text-green-900">API Key Created!</p>
                                <p className="text-sm text-green-700 mb-3">
                                    Copy your API key now. It won't be shown again.
                                </p>
                                <SecretDisplay secret={newKeyValue} alwaysShow />
                            </div>
                            <button
                                onClick={() => setNewKeyValue(null)}
                                className="text-green-600 hover:text-green-800"
                            >
                                Dismiss
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* API Keys List */}
            {apiKeys.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <Key className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No API keys</h3>
                    <p className="text-gray-500 mb-4">
                        Create API keys to access the CarpoolNetwork API programmatically.
                    </p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Create Your First API Key
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {apiKeys.map((key) => (
                        <div
                            key={key.id}
                            className={`bg-white rounded-xl border p-4 ${key.active ? 'border-gray-200' : 'border-red-200 bg-red-50/30'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${key.active ? 'bg-gray-100' : 'bg-red-100'}`}>
                                    <Key className={`w-5 h-5 ${key.active ? 'text-gray-600' : 'text-red-600'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-gray-900">{key.name}</p>
                                        {!key.active && (
                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded font-medium">
                                                Revoked
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 font-mono">{key.keyPrefix}...</p>
                                </div>
                                <div className="text-right text-sm text-gray-500">
                                    {key.lastUsed ? (
                                        <p>Last used: {new Date(key.lastUsed).toLocaleDateString()}</p>
                                    ) : (
                                        <p>Never used</p>
                                    )}
                                    <p>Created: {new Date(key.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex gap-1">
                                    {key.active && (
                                        <button
                                            onClick={() => handleRevoke(key.id)}
                                            className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
                                            title="Revoke"
                                        >
                                            <Shield className="w-4 h-4 text-amber-600" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(key.id)}
                                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </button>
                                </div>
                            </div>

                            {/* Scopes */}
                            <div className="mt-3 flex flex-wrap gap-1">
                                {key.scopes.map((scope) => (
                                    <span
                                        key={scope}
                                        className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                                    >
                                        {scope}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {showCreate && (
                    <CreateApiKeyModal
                        userId={userId}
                        onClose={() => setShowCreate(false)}
                        onSuccess={(plainKey) => {
                            setShowCreate(false);
                            setNewKeyValue(plainKey);
                            onRefresh();
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Secret Display Component
function SecretDisplay({ secret, alwaysShow = false }: { secret: string; alwaysShow?: boolean }) {
    const [visible, setVisible] = useState(alwaysShow);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
            <code className="flex-1 text-sm font-mono text-gray-700 truncate">
                {visible ? secret : '•'.repeat(Math.min(40, secret.length))}
            </code>
            {!alwaysShow && (
                <button
                    onClick={() => setVisible(!visible)}
                    className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                >
                    {visible ? (
                        <EyeOff className="w-4 h-4 text-gray-500" />
                    ) : (
                        <Eye className="w-4 h-4 text-gray-500" />
                    )}
                </button>
            )}
            <button
                onClick={handleCopy}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            >
                {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                ) : (
                    <Copy className="w-4 h-4 text-gray-500" />
                )}
            </button>
        </div>
    );
}

// Create Webhook Modal
function CreateWebhookModal({
    userId,
    onClose,
    onSuccess,
}: {
    userId: string;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([]);
    const [creating, setCreating] = useState(false);

    const toggleEvent = (event: WebhookEvent) => {
        setSelectedEvents((prev) =>
            prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !url || selectedEvents.length === 0) return;

        setCreating(true);
        try {
            const result = await webhookService.createWebhook(userId, name, url, selectedEvents);
            if (result) {
                onSuccess();
            }
        } finally {
            setCreating(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Create Webhook</h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Integration"
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Endpoint URL</label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/webhook"
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Events</label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                            {WEBHOOK_EVENTS.map(({ event, name }) => (
                                <label
                                    key={event}
                                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${selectedEvents.includes(event)
                                            ? 'bg-indigo-50 border border-indigo-200'
                                            : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedEvents.includes(event)}
                                        onChange={() => toggleEvent(event)}
                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                                    />
                                    <span className="text-sm text-gray-700">{name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name || !url || selectedEvents.length === 0 || creating}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                        >
                            {creating ? 'Creating...' : 'Create Webhook'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// Create API Key Modal
function CreateApiKeyModal({
    userId,
    onClose,
    onSuccess,
}: {
    userId: string;
    onClose: () => void;
    onSuccess: (plainKey: string) => void;
}) {
    const [name, setName] = useState('');
    const [selectedScopes, setSelectedScopes] = useState<ApiScope[]>([]);
    const [expiration, setExpiration] = useState<string>('never');
    const [creating, setCreating] = useState(false);

    const toggleScope = (scope: ApiScope) => {
        setSelectedScopes((prev) =>
            prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || selectedScopes.length === 0) return;

        setCreating(true);
        try {
            const expiresInDays = expiration === 'never' ? undefined : parseInt(expiration);
            const result = await webhookService.createApiKey(userId, name, selectedScopes, expiresInDays);
            if (result) {
                onSuccess(result.plainTextKey);
            }
        } finally {
            setCreating(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Create API Key</h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My API Key"
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Expiration</label>
                        <select
                            value={expiration}
                            onChange={(e) => setExpiration(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="never">Never</option>
                            <option value="7">7 days</option>
                            <option value="30">30 days</option>
                            <option value="90">90 days</option>
                            <option value="365">1 year</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Scopes</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {API_SCOPES.map(({ scope, name, description }) => (
                                <label
                                    key={scope}
                                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedScopes.includes(scope)
                                            ? 'bg-indigo-50 border border-indigo-200'
                                            : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedScopes.includes(scope)}
                                        onChange={() => toggleScope(scope)}
                                        className="w-4 h-4 mt-0.5 rounded border-gray-300 text-indigo-600"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{name}</p>
                                        <p className="text-xs text-gray-500">{description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800">
                                <p className="font-medium">Important</p>
                                <p className="text-amber-700">
                                    The API key will only be shown once. Store it securely.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name || selectedScopes.length === 0 || creating}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                        >
                            {creating ? 'Creating...' : 'Create API Key'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

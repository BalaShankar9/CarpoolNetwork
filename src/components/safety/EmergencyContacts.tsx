import { useState, useEffect } from 'react';
import {
    Phone,
    Plus,
    Trash2,
    Edit2,
    AlertTriangle,
    Bell,
    UserPlus,
    Shield,
    Check,
    X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
    getEmergencyContacts,
    addEmergencyContact,
    updateEmergencyContact,
    deleteEmergencyContact,
    EmergencyContact,
} from '../../services/safetyService';

interface EmergencyContactFormData {
    name: string;
    phone: string;
    relationship: string;
    notify_on_sos: boolean;
    notify_on_trip_start: boolean;
}

const RELATIONSHIPS = [
    'Family Member',
    'Spouse/Partner',
    'Parent',
    'Sibling',
    'Friend',
    'Colleague',
    'Other',
];

export function EmergencyContacts() {
    const { user } = useAuth();
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
    const [formData, setFormData] = useState<EmergencyContactFormData>({
        name: '',
        phone: '',
        relationship: 'Family Member',
        notify_on_sos: true,
        notify_on_trip_start: false,
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            loadContacts();
        }
    }, [user]);

    const loadContacts = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = await getEmergencyContacts(user.id);
            setContacts(data);
        } catch (err) {
            console.error('Error loading emergency contacts:', err);
            setError('Failed to load emergency contacts');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSubmitting(true);
        setError(null);

        try {
            if (editingContact) {
                const updated = await updateEmergencyContact(editingContact.id, formData);
                setContacts(contacts.map(c => (c.id === updated.id ? updated : c)));
            } else {
                const newContact = await addEmergencyContact(user.id, formData);
                setContacts([...contacts, newContact]);
            }
            resetForm();
        } catch (err: any) {
            setError(err.message || 'Failed to save contact');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (contact: EmergencyContact) => {
        setEditingContact(contact);
        setFormData({
            name: contact.name,
            phone: contact.phone,
            relationship: contact.relationship,
            notify_on_sos: contact.notify_on_sos,
            notify_on_trip_start: contact.notify_on_trip_start,
        });
        setShowForm(true);
    };

    const handleDelete = async (contactId: string) => {
        if (!confirm('Are you sure you want to remove this emergency contact?')) {
            return;
        }

        try {
            await deleteEmergencyContact(contactId);
            setContacts(contacts.filter(c => c.id !== contactId));
        } catch (err) {
            setError('Failed to delete contact');
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingContact(null);
        setFormData({
            name: '',
            phone: '',
            relationship: 'Family Member',
            notify_on_sos: true,
            notify_on_trip_start: false,
        });
        setError(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Emergency Contacts</h2>
                        <p className="text-sm text-gray-500">
                            These contacts will be notified in case of emergency
                        </p>
                    </div>
                </div>

                {contacts.length < 5 && !showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                     hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Add Contact
                    </button>
                )}
            </div>

            {/* Error Alert */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <p className="text-red-700">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="h-4 w-4 text-red-500" />
                    </button>
                </div>
            )}

            {/* Contact Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900">
                            {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
                        </h3>
                        <button
                            type="button"
                            onClick={resetForm}
                            className="p-1 hover:bg-gray-200 rounded-full"
                        >
                            <X className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                         focus:border-blue-500"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                required
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                         focus:border-blue-500"
                                placeholder="+44 7xxx xxx xxx"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Relationship
                            </label>
                            <select
                                value={formData.relationship}
                                onChange={e => setFormData({ ...formData, relationship: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
                         focus:border-blue-500"
                            >
                                {RELATIONSHIPS.map(rel => (
                                    <option key={rel} value={rel}>
                                        {rel}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.notify_on_sos}
                                onChange={e =>
                                    setFormData({ ...formData, notify_on_sos: e.target.checked })
                                }
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 
                         focus:ring-blue-500"
                            />
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <span className="text-sm text-gray-700">Notify on SOS emergency</span>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.notify_on_trip_start}
                                onChange={e =>
                                    setFormData({ ...formData, notify_on_trip_start: e.target.checked })
                                }
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 
                         focus:ring-blue-500"
                            />
                            <div className="flex items-center gap-2">
                                <Bell className="h-4 w-4 text-blue-500" />
                                <span className="text-sm text-gray-700">Notify when I start a trip</span>
                            </div>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       flex items-center gap-2"
                        >
                            {submitting ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            ) : (
                                <Check className="h-4 w-4" />
                            )}
                            {editingContact ? 'Save Changes' : 'Add Contact'}
                        </button>
                    </div>
                </form>
            )}

            {/* Contact List */}
            {contacts.length === 0 && !showForm ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Emergency Contacts
                    </h3>
                    <p className="text-gray-500 mb-4 max-w-md mx-auto">
                        Add trusted contacts who will be notified in case of an emergency during your rides.
                    </p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white
                     rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Add Your First Contact
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {contacts.map(contact => (
                        <div
                            key={contact.id}
                            className="bg-white border rounded-xl p-4 flex items-center gap-4
                       hover:shadow-md transition-shadow"
                        >
                            <div className="p-3 bg-blue-100 rounded-full">
                                <Phone className="h-5 w-5 text-blue-600" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-gray-900">{contact.name}</h3>
                                <p className="text-sm text-gray-500">{contact.phone}</p>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-gray-400">{contact.relationship}</span>
                                    {contact.notify_on_sos && (
                                        <span className="inline-flex items-center gap-1 text-xs text-red-600">
                                            <AlertTriangle className="h-3 w-3" />
                                            SOS
                                        </span>
                                    )}
                                    {contact.notify_on_trip_start && (
                                        <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                                            <Bell className="h-3 w-3" />
                                            Trip Start
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleEdit(contact)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50
                           rounded-lg transition-colors"
                                    title="Edit contact"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(contact.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50
                           rounded-lg transition-colors"
                                    title="Remove contact"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">How emergency notifications work</p>
                    <p className="text-blue-700">
                        When you trigger an SOS or a safety concern is detected, your emergency contacts
                        will receive an SMS with your current location and ride details. They can also
                        receive automatic updates when you start a trip if enabled.
                    </p>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { Phone, Plus, Edit, Trash2, AlertTriangle, CheckCircle, X, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
}

export default function EmergencyContactsManager() {
  const { profile } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relationship: '',
    is_primary: false
  });

  useEffect(() => {
    if (profile?.id) {
      loadContacts();
    }
  }, [profile?.id]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', profile?.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (err: any) {
      console.error('Error loading contacts:', err);
      setError('Failed to load emergency contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (!formData.name.trim() || !formData.phone.trim()) {
        setError('Name and phone number are required');
        return;
      }

      if (formData.is_primary) {
        await supabase
          .from('emergency_contacts')
          .update({ is_primary: false })
          .eq('user_id', profile?.id);
      }

      if (editingId) {
        const { error } = await supabase
          .from('emergency_contacts')
          .update({
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            relationship: formData.relationship.trim(),
            is_primary: formData.is_primary
          })
          .eq('id', editingId);

        if (error) throw error;
        setSuccess('Contact updated successfully');
      } else {
        const { error } = await supabase
          .from('emergency_contacts')
          .insert({
            user_id: profile?.id,
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            relationship: formData.relationship.trim(),
            is_primary: formData.is_primary
          });

        if (error) throw error;
        setSuccess('Contact added successfully');
      }

      setFormData({ name: '', phone: '', relationship: '', is_primary: false });
      setShowForm(false);
      setEditingId(null);
      await loadContacts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save contact');
    }
  };

  const handleEdit = (contact: EmergencyContact) => {
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      is_primary: contact.is_primary
    });
    setEditingId(contact.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this emergency contact?')) return;

    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccess('Contact deleted successfully');
      await loadContacts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete contact');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', phone: '', relationship: '', is_primary: false });
    setError('');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-200 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Phone className="w-6 h-6" />
            Emergency Contacts
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Add trusted contacts who can be reached in case of emergency
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex items-start gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">
              {editingId ? 'Edit Contact' : 'Add New Contact'}
            </h4>
            <button
              type="button"
              onClick={cancelForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+44 1234 567890"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relationship
              </label>
              <select
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select relationship</option>
                <option value="spouse">Spouse</option>
                <option value="partner">Partner</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="child">Child</option>
                <option value="friend">Friend</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_primary"
                checked={formData.is_primary}
                onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_primary" className="text-sm text-gray-700">
                Set as primary emergency contact
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={cancelForm}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingId ? 'Update Contact' : 'Add Contact'}
              </button>
            </div>
          </div>
        </form>
      )}

      {contacts.length === 0 && !showForm ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <UserPlus className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="font-medium text-gray-900 mb-2">No emergency contacts added</p>
          <p className="text-sm text-gray-600 mb-4">
            Add emergency contacts to enhance your safety while carpooling
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add First Contact
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex flex-col sm:flex-row items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
            >
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 truncate">{contact.name}</p>
                      {contact.is_primary && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {contact.phone}
                    </p>
                    {contact.relationship && (
                      <p className="text-xs text-gray-500 mt-1 capitalize">
                        {contact.relationship}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleEdit(contact)}
                  className="flex-1 sm:flex-none px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(contact.id)}
                  className="flex-1 sm:flex-none px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {contacts.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Your emergency contacts will be notified automatically if you trigger an emergency alert during a ride.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

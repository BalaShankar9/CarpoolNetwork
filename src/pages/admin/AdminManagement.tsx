import { useState, useEffect } from 'react';
import { UserCog, Trash2, Plus, Search, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import AdminLayout, { AdminSection, AdminEmptyState } from '../../components/admin/AdminLayout';
import PermissionGuard from '../../components/admin/PermissionGuard';
import { AdminRole, ROLE_DISPLAY_NAMES, ROLE_COLORS, ROLE_DESCRIPTIONS } from '../../types/admin';
import { logAdminAction, AUDIT_ACTIONS } from '../../services/auditService';

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  admin_role: AdminRole;
  created_at: string;
}

export default function AdminManagement() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState<AdminUser | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<AdminRole>('moderator');
  const [addingAdmin, setAddingAdmin] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, admin_role, created_at')
      .not('admin_role', 'is', null)
      .order('admin_role');

    if (error) {
      toast.error('Failed to load admins');
      console.error('Error loading admins:', error);
    } else {
      setAdmins((data || []) as AdminUser[]);
    }
    setLoading(false);
  };

  const updateAdminRole = async (userId: string, newRole: AdminRole) => {
    const admin = admins.find(a => a.id === userId);
    if (!admin) return;

    const oldRole = admin.admin_role;

    const { error } = await supabase
      .from('profiles')
      .update({ admin_role: newRole })
      .eq('id', userId);

    if (error) {
      toast.error('Failed to update role');
      return;
    }

    await logAdminAction({
      action: AUDIT_ACTIONS.ADMIN_ROLE_CHANGED,
      targetType: 'admin',
      targetId: userId,
      details: {
        admin_name: admin.full_name,
        old_role: oldRole,
        new_role: newRole
      },
    });

    toast.success(`Role updated to ${ROLE_DISPLAY_NAMES[newRole]}`);
    loadAdmins();
  };

  const removeAdmin = async (admin: AdminUser) => {
    const { error } = await supabase
      .from('profiles')
      .update({ admin_role: null, is_admin: false })
      .eq('id', admin.id);

    if (error) {
      toast.error('Failed to remove admin');
      return;
    }

    await logAdminAction({
      action: AUDIT_ACTIONS.ADMIN_REMOVED,
      targetType: 'admin',
      targetId: admin.id,
      details: {
        admin_name: admin.full_name,
        previous_role: admin.admin_role
      },
    });

    toast.success('Admin access removed');
    setShowRemoveModal(null);
    loadAdmins();
  };

  const addAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setAddingAdmin(true);

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, admin_role')
      .eq('email', newAdminEmail.trim().toLowerCase())
      .single();

    if (userError || !user) {
      toast.error('User not found with that email');
      setAddingAdmin(false);
      return;
    }

    if (user.admin_role) {
      toast.error('User is already an admin');
      setAddingAdmin(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ admin_role: newAdminRole, is_admin: true })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to add admin');
      setAddingAdmin(false);
      return;
    }

    await logAdminAction({
      action: AUDIT_ACTIONS.ADMIN_CREATED,
      targetType: 'admin',
      targetId: user.id,
      details: {
        admin_name: user.full_name,
        role: newAdminRole
      },
    });

    toast.success(`${user.full_name} is now a ${ROLE_DISPLAY_NAMES[newAdminRole]}`);
    setShowAddModal(false);
    setNewAdminEmail('');
    setNewAdminRole('moderator');
    setAddingAdmin(false);
    loadAdmins();
  };

  const filteredAdmins = admins.filter(admin =>
    admin.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group admins by role
  const adminsByRole = filteredAdmins.reduce((acc, admin) => {
    const role = admin.admin_role;
    if (!acc[role]) acc[role] = [];
    acc[role].push(admin);
    return acc;
  }, {} as Record<AdminRole, AdminUser[]>);

  const roleOrder: AdminRole[] = ['super_admin', 'admin', 'moderator', 'analyst'];

  return (
    <PermissionGuard minRole="super_admin" redirectTo="/admin" showAccessDenied>
      <AdminLayout
        title="Admin Management"
        subtitle="Manage admin users and their roles"
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Admin
          </button>
        }
      >
        <div className="space-y-6">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search admins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Role Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {roleOrder.map(role => (
              <div key={role} className={`p-4 rounded-xl border ${ROLE_COLORS[role]}`}>
                <p className="text-2xl font-bold">{adminsByRole[role]?.length || 0}</p>
                <p className="text-sm font-medium">{ROLE_DISPLAY_NAMES[role]}s</p>
              </div>
            ))}
          </div>

          {/* Admins List */}
          <AdminSection title="All Admins">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : filteredAdmins.length === 0 ? (
              <AdminEmptyState
                icon={<UserCog className="w-6 h-6" />}
                title="No admins found"
                description={searchTerm ? 'Try a different search term' : 'Add your first admin to get started'}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">User</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAdmins.map(admin => (
                      <tr key={admin.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={admin.avatar_url || '/default-avatar.png'}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover bg-gray-200"
                            />
                            <span className="font-medium text-gray-900">{admin.full_name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-600">{admin.email}</td>
                        <td className="px-4 py-4">
                          <select
                            value={admin.admin_role}
                            onChange={(e) => updateAdminRole(admin.id, e.target.value as AdminRole)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border cursor-pointer ${ROLE_COLORS[admin.admin_role]}`}
                          >
                            <option value="analyst">Analyst</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => setShowRemoveModal(admin)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove admin access"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSection>

          {/* Role Descriptions */}
          <AdminSection title="Role Permissions">
            <div className="grid md:grid-cols-2 gap-4">
              {roleOrder.map(role => (
                <div key={role} className={`p-4 rounded-lg border ${ROLE_COLORS[role]}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5" />
                    <h3 className="font-semibold">{ROLE_DISPLAY_NAMES[role]}</h3>
                  </div>
                  <p className="text-sm opacity-80">{ROLE_DESCRIPTIONS[role]}</p>
                </div>
              ))}
            </div>
          </AdminSection>
        </div>

        {/* Add Admin Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <UserCog className="w-5 h-5 text-blue-600" />
                Add New Admin
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User Email
                  </label>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The user must already have an account
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={newAdminRole}
                    onChange={(e) => setNewAdminRole(e.target.value as AdminRole)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="analyst">Analyst - Read-only analytics access</option>
                    <option value="moderator">Moderator - Review and verification</option>
                    <option value="admin">Admin - Full user management</option>
                    <option value="super_admin">Super Admin - Everything including admin management</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewAdminEmail('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addAdmin}
                  disabled={addingAdmin}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {addingAdmin ? 'Adding...' : 'Add Admin'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Admin Confirmation Modal */}
        {showRemoveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Remove Admin Access</h3>
                  <p className="text-sm text-gray-500">This action can be undone</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to remove admin access for{' '}
                <span className="font-semibold">{showRemoveModal.full_name}</span>?
                They will no longer be able to access the admin panel.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRemoveModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => removeAdmin(showRemoveModal)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Remove Access
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </PermissionGuard>
  );
}

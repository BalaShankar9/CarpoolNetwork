import { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Car,
  FileText,
  Image,
  AlertCircle,
  ExternalLink,
  Eye,
  Calendar,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface DriverLicense {
  id: string;
  user_id: string;
  license_number: string;
  license_type: string;
  country_of_issue: string;
  issue_date: string;
  expiry_date: string;
  verified: boolean;
  verification_method: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    profile_photo_url: string | null;
  };
}

interface VehicleInsurance {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  policy_number: string;
  provider: string;
  issue_date: string;
  expiry_date: string;
  coverage_type: string;
  status: string;
  document_path: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
  vehicles: {
    make: string;
    model: string;
    license_plate: string;
  } | null;
}

interface PendingVerification {
  type: 'license' | 'insurance' | 'profile_photo' | 'vehicle_photo';
  id: string;
  user_name: string;
  user_email: string;
  submitted_at: string;
  data: any;
}

export default function VerificationQueue() {
  const [pendingLicenses, setPendingLicenses] = useState<DriverLicense[]>([]);
  const [pendingInsurance, setPendingInsurance] = useState<VehicleInsurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'licenses' | 'insurance' | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [viewModal, setViewModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  const fetchPendingVerifications = async () => {
    setLoading(true);
    try {
      const [licensesResponse, insuranceResponse] = await Promise.all([
        supabase
          .from('driver_licenses')
          .select(`
            *,
            profiles!driver_licenses_user_id_fkey (
              full_name,
              email,
              profile_photo_url
            )
          `)
          .eq('verified', false)
          .order('created_at', { ascending: false }),

        supabase
          .from('vehicle_insurance')
          .select(`
            *,
            profiles!vehicle_insurance_user_id_fkey (
              full_name,
              email
            ),
            vehicles!vehicle_insurance_vehicle_id_fkey (
              make,
              model,
              license_plate
            )
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ]);

      if (licensesResponse.error) throw licensesResponse.error;
      if (insuranceResponse.error) throw insuranceResponse.error;

      setPendingLicenses(licensesResponse.data || []);
      setPendingInsurance(insuranceResponse.data || []);
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLicense = async (licenseId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('driver_licenses')
        .update({
          verified: true,
          verified_at: new Date().toISOString(),
          verification_method: 'manual',
        })
        .eq('id', licenseId);

      if (error) throw error;

      const { error: attemptError } = await supabase
        .from('license_verification_attempts')
        .insert({
          license_id: licenseId,
          attempt_type: 'manual_review',
          status: 'success',
        });

      if (attemptError) console.error('Error logging verification attempt:', attemptError);

      setPendingLicenses(prev => prev.filter(l => l.id !== licenseId));
      setViewModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error approving license:', error);
      toast.error('Failed to approve license verification');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectLicense = async (licenseId: string) => {
    if (!rejectionReason.trim()) {
      toast.warning('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      const { error: attemptError } = await supabase
        .from('license_verification_attempts')
        .insert({
          license_id: licenseId,
          attempt_type: 'manual_review',
          status: 'failed',
          error_message: rejectionReason,
        });

      if (attemptError) throw attemptError;

      setPendingLicenses(prev => prev.filter(l => l.id !== licenseId));
      setViewModal(false);
      setSelectedItem(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting license:', error);
      toast.error('Failed to reject license verification');
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveInsurance = async (insuranceId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('vehicle_insurance')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', insuranceId);

      if (error) throw error;

      setPendingInsurance(prev => prev.filter(i => i.id !== insuranceId));
      setViewModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error approving insurance:', error);
      toast.error('Failed to approve insurance verification');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectInsurance = async (insuranceId: string) => {
    if (!rejectionReason.trim()) {
      toast.warning('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('vehicle_insurance')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', insuranceId);

      if (error) throw error;

      setPendingInsurance(prev => prev.filter(i => i.id !== insuranceId));
      setViewModal(false);
      setSelectedItem(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting insurance:', error);
      toast.error('Failed to reject insurance verification');
    } finally {
      setProcessing(false);
    }
  };

  const openViewModal = (item: any, type: 'license' | 'insurance') => {
    setSelectedItem({ ...item, type });
    setViewModal(true);
    setRejectionReason('');
  };

  const closeViewModal = () => {
    setViewModal(false);
    setSelectedItem(null);
    setRejectionReason('');
  };

  const totalPending = pendingLicenses.length + pendingInsurance.length;

  return (
    <AdminLayout
      title="Verification Queue"
      subtitle={`${totalPending} pending verification${totalPending !== 1 ? 's' : ''}`}
      actions={
        <button
          onClick={fetchPendingVerifications}
          disabled={loading}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div>
            <div className="flex space-x-2 mb-6 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'all'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                All ({totalPending})
              </button>
              <button
                onClick={() => setActiveTab('licenses')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'licenses'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                Driver Licenses ({pendingLicenses.length})
              </button>
              <button
                onClick={() => setActiveTab('insurance')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'insurance'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                Vehicle Insurance ({pendingInsurance.length})
              </button>
            </div>

            {totalPending === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-600">No pending verifications at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(activeTab === 'all' || activeTab === 'licenses') &&
                  pendingLicenses.map(license => (
                    <div key={license.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                Driver License Verification
                              </h3>
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                                Pending
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4" />
                                <span className="font-medium">{license.profiles.full_name}</span>
                                <span className="text-gray-400">•</span>
                                <span>{license.profiles.email}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4" />
                                <span>License: {license.license_number}</span>
                                <span className="text-gray-400">•</span>
                                <span className="capitalize">{license.license_type.replace('_', ' ')}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4" />
                                <span>Expires: {new Date(license.expiry_date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4" />
                                <span>Submitted: {new Date(license.created_at).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => openViewModal(license, 'license')}
                          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Review</span>
                        </button>
                      </div>
                    </div>
                  ))}

                {(activeTab === 'all' || activeTab === 'insurance') &&
                  pendingInsurance.map(insurance => (
                    <div key={insurance.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="p-3 bg-green-100 rounded-lg">
                            <Car className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                Vehicle Insurance Verification
                              </h3>
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                                Pending
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4" />
                                <span className="font-medium">{insurance.profiles.full_name}</span>
                                <span className="text-gray-400">•</span>
                                <span>{insurance.profiles.email}</span>
                              </div>
                              {insurance.vehicles && (
                                <div className="flex items-center space-x-2">
                                  <Car className="w-4 h-4" />
                                  <span>
                                    {insurance.vehicles.make} {insurance.vehicles.model} - {insurance.vehicles.license_plate}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center space-x-2">
                                <Shield className="w-4 h-4" />
                                <span>Policy: {insurance.policy_number}</span>
                                <span className="text-gray-400">•</span>
                                <span>{insurance.provider}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4" />
                                <span>Expires: {new Date(insurance.expiry_date).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4" />
                                <span>Submitted: {new Date(insurance.created_at).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => openViewModal(insurance, 'insurance')}
                          className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Review</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {viewModal && selectedItem && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedItem.type === 'license' ? 'Driver License Verification' : 'Insurance Verification'}
                    </h2>
                    <button
                      onClick={closeViewModal}
                      className="text-gray-400 hover:text-gray-600"
                      disabled={processing}
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {selectedItem.type === 'license' ? (
                    <>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                          <p className="text-gray-900">{selectedItem.profiles.full_name}</p>
                          <p className="text-sm text-gray-600">{selectedItem.profiles.email}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                            <p className="text-gray-900 font-mono">{selectedItem.license_number}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">License Type</label>
                            <p className="text-gray-900 capitalize">{selectedItem.license_type.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Country of Issue</label>
                            <p className="text-gray-900">{selectedItem.country_of_issue}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                            <p className="text-gray-900">{new Date(selectedItem.issue_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                          <p className="text-gray-900">{new Date(selectedItem.expiry_date).toLocaleDateString()}</p>
                          {new Date(selectedItem.expiry_date) < new Date() && (
                            <p className="text-red-600 text-sm mt-1 flex items-center space-x-1">
                              <AlertCircle className="w-4 h-4" />
                              <span>License has expired</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason (if rejecting)</label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                          placeholder="Provide a detailed reason for rejection..."
                          disabled={processing}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                          <p className="text-gray-900">{selectedItem.profiles.full_name}</p>
                          <p className="text-sm text-gray-600">{selectedItem.profiles.email}</p>
                        </div>
                        {selectedItem.vehicles && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
                            <p className="text-gray-900">
                              {selectedItem.vehicles.make} {selectedItem.vehicles.model}
                            </p>
                            <p className="text-sm text-gray-600">{selectedItem.vehicles.license_plate}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
                            <p className="text-gray-900 font-mono">{selectedItem.policy_number}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                            <p className="text-gray-900">{selectedItem.provider}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Type</label>
                            <p className="text-gray-900 capitalize">{selectedItem.coverage_type.replace('_', ' ')}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                            <p className="text-gray-900">{new Date(selectedItem.expiry_date).toLocaleDateString()}</p>
                            {new Date(selectedItem.expiry_date) < new Date() && (
                              <p className="text-red-600 text-sm mt-1 flex items-center space-x-1">
                                <AlertCircle className="w-4 h-4" />
                                <span>Insurance has expired</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason (if rejecting)</label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          rows={3}
                          placeholder="Provide a detailed reason for rejection..."
                          disabled={processing}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
                  <button
                    onClick={closeViewModal}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={processing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      selectedItem.type === 'license'
                        ? handleRejectLicense(selectedItem.id)
                        : handleRejectInsurance(selectedItem.id)
                    }
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                    disabled={processing}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{processing ? 'Rejecting...' : 'Reject'}</span>
                  </button>
                  <button
                    onClick={() =>
                      selectedItem.type === 'license'
                        ? handleApproveLicense(selectedItem.id)
                        : handleApproveInsurance(selectedItem.id)
                    }
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                    disabled={processing}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{processing ? 'Approving...' : 'Approve'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}

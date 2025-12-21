import { useState, useEffect, useRef } from 'react';
import { FileText, Upload, CheckCircle, Clock, XCircle, AlertTriangle, Calendar, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Document {
  id: string;
  document_type: 'license' | 'insurance' | 'registration';
  status: 'pending' | 'verified' | 'rejected';
  expiry_date?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

interface DriverLicense {
  id: string;
  license_number: string;
  issue_date: string;
  expiry_date: string;
  issuing_country: string;
  license_class: string;
  status: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string;
  document_path?: string;
}

interface VehicleInsurance {
  id: string;
  vehicle_id?: string;
  policy_number: string;
  provider: string;
  issue_date: string;
  expiry_date: string;
  coverage_type: string;
  status: 'pending' | 'active' | 'expired' | 'rejected';
  rejection_reason?: string;
  document_path?: string;
}

export default function DocumentUploadCenter() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [driverLicense, setDriverLicense] = useState<DriverLicense | null>(null);
  const [insurance, setInsurance] = useState<VehicleInsurance[]>([]);
  const [showLicenseForm, setShowLicenseForm] = useState(false);
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);

  const [licenseForm, setLicenseForm] = useState({
    license_number: '',
    issue_date: '',
    expiry_date: '',
    issuing_country: 'UK',
    license_class: 'B'
  });

  const [insuranceForm, setInsuranceForm] = useState({
    policy_number: '',
    provider: '',
    issue_date: '',
    expiry_date: '',
    coverage_type: 'comprehensive'
  });

  const licenseFileRef = useRef<HTMLInputElement>(null);
  const insuranceFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.id) {
      loadDocuments();
    }
  }, [profile?.id]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const [licenseResult, insuranceResult] = await Promise.all([
        supabase
          .from('driver_licenses')
          .select('*')
          .eq('user_id', profile?.id)
          .maybeSingle(),
        supabase
          .from('vehicle_insurance')
          .select('*')
          .eq('user_id', profile?.id)
      ]);

      if (licenseResult.error && licenseResult.error.code !== 'PGRST116') {
        throw licenseResult.error;
      }
      if (insuranceResult.error) throw insuranceResult.error;

      setDriverLicense(licenseResult.data);
      setInsurance(insuranceResult.data || []);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file: File, type: 'license' | 'insurance'): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile?.id}/${type}_${Date.now()}.${fileExt}`;
    const filePath = `documents/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;
    return filePath;
  };

  const handleLicenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setUploading(true);

      const insertData: any = {
        user_id: profile?.id,
        license_number: licenseForm.license_number,
        issue_date: licenseForm.issue_date,
        expiry_date: licenseForm.expiry_date,
        issuing_country: licenseForm.issuing_country,
        license_class: licenseForm.license_class,
        status: 'pending'
      };

      if (licenseFileRef.current?.files?.[0]) {
        const documentPath = await uploadDocument(licenseFileRef.current.files[0], 'license');
        insertData.document_path = documentPath;
      }

      const { error } = await supabase
        .from('driver_licenses')
        .upsert(insertData, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setSuccess('Driver license submitted successfully');
      setShowLicenseForm(false);
      await loadDocuments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit license');
    } finally {
      setUploading(false);
    }
  };

  const handleInsuranceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setUploading(true);

      const insertData: any = {
        user_id: profile?.id,
        policy_number: insuranceForm.policy_number,
        provider: insuranceForm.provider,
        issue_date: insuranceForm.issue_date,
        expiry_date: insuranceForm.expiry_date,
        coverage_type: insuranceForm.coverage_type,
        status: 'pending'
      };

      if (insuranceFileRef.current?.files?.[0]) {
        const documentPath = await uploadDocument(insuranceFileRef.current.files[0], 'insurance');
        insertData.document_path = documentPath;
      }

      const { error } = await supabase
        .from('vehicle_insurance')
        .insert(insertData);

      if (error) throw error;

      setSuccess('Insurance submitted successfully');
      setShowInsuranceForm(false);
      setInsuranceForm({
        policy_number: '',
        provider: '',
        issue_date: '',
        expiry_date: '',
        coverage_type: 'comprehensive'
      });
      await loadDocuments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit insurance');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      verified: { icon: CheckCircle, color: 'green', label: 'Verified' },
      active: { icon: CheckCircle, color: 'green', label: 'Active' },
      pending: { icon: Clock, color: 'yellow', label: 'Pending Review' },
      rejected: { icon: XCircle, color: 'red', label: 'Rejected' },
      expired: { icon: XCircle, color: 'red', label: 'Expired' }
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`px-2 py-1 bg-${badge.color}-100 text-${badge.color}-800 rounded text-xs font-medium flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const isExpiringSoon = (dateString: string) => {
    const expiryDate = new Date(dateString);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
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
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-gray-900" />
        <h3 className="text-xl font-bold text-gray-900">Document Verification</h3>
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

      <div className="space-y-6">
        <div className="p-5 border border-gray-200 rounded-lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Driver's License
              </h4>
              <p className="text-sm text-gray-600 mt-1">Upload your valid driver's license</p>
            </div>
            {driverLicense && getStatusBadge(driverLicense.status)}
          </div>

          {driverLicense ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">License Number</p>
                  <p className="font-medium text-gray-900">{driverLicense.license_number}</p>
                </div>
                <div>
                  <p className="text-gray-600">Class</p>
                  <p className="font-medium text-gray-900">{driverLicense.license_class}</p>
                </div>
                <div>
                  <p className="text-gray-600">Expiry Date</p>
                  <p className={`font-medium ${isExpiringSoon(driverLicense.expiry_date) ? 'text-amber-600' : 'text-gray-900'}`}>
                    {new Date(driverLicense.expiry_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Country</p>
                  <p className="font-medium text-gray-900">{driverLicense.issuing_country}</p>
                </div>
              </div>

              {driverLicense.status === 'rejected' && driverLicense.rejection_reason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  <strong>Rejection Reason:</strong> {driverLicense.rejection_reason}
                </div>
              )}

              {isExpiringSoon(driverLicense.expiry_date) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
                  <Calendar className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Your license is expiring soon. Please update it.</span>
                </div>
              )}

              <button
                onClick={() => setShowLicenseForm(true)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Update License →
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLicenseForm(true)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Driver's License
            </button>
          )}
        </div>

        <div className="p-5 border border-gray-200 rounded-lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Vehicle Insurance
              </h4>
              <p className="text-sm text-gray-600 mt-1">Upload your vehicle insurance documents</p>
            </div>
            <button
              onClick={() => setShowInsuranceForm(true)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
            >
              <Upload className="w-4 h-4" />
              Add Insurance
            </button>
          </div>

          {insurance.length > 0 ? (
            <div className="space-y-3">
              {insurance.map((ins) => (
                <div key={ins.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{ins.provider}</p>
                      <p className="text-sm text-gray-600">Policy: {ins.policy_number}</p>
                    </div>
                    {getStatusBadge(ins.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-600">Expiry</p>
                      <p className={`font-medium ${isExpiringSoon(ins.expiry_date) ? 'text-amber-600' : 'text-gray-900'}`}>
                        {new Date(ins.expiry_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Coverage</p>
                      <p className="font-medium text-gray-900 capitalize">{ins.coverage_type}</p>
                    </div>
                  </div>
                  {isExpiringSoon(ins.expiry_date) && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                      Expiring soon - please renew
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 text-sm">
              No insurance documents uploaded yet
            </div>
          )}
        </div>
      </div>

      {showLicenseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Upload Driver's License</h3>

            <form onSubmit={handleLicenseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={licenseForm.license_number}
                  onChange={(e) => setLicenseForm({ ...licenseForm, license_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date</label>
                  <input
                    type="date"
                    value={licenseForm.issue_date}
                    onChange={(e) => setLicenseForm({ ...licenseForm, issue_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={licenseForm.expiry_date}
                    onChange={(e) => setLicenseForm({ ...licenseForm, expiry_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    value={licenseForm.issuing_country}
                    onChange={(e) => setLicenseForm({ ...licenseForm, issuing_country: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">License Class</label>
                  <input
                    type="text"
                    value={licenseForm.license_class}
                    onChange={(e) => setLicenseForm({ ...licenseForm, license_class: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Document (Optional)
                </label>
                <input
                  ref={licenseFileRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Accepted: Images or PDF</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLicenseForm(false)}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                >
                  {uploading ? 'Uploading...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInsuranceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Insurance</h3>

            <form onSubmit={handleInsuranceSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Policy Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={insuranceForm.policy_number}
                  onChange={(e) => setInsuranceForm({ ...insuranceForm, policy_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insurance Provider <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={insuranceForm.provider}
                  onChange={(e) => setInsuranceForm({ ...insuranceForm, provider: e.target.value })}
                  placeholder="e.g., Aviva, Admiral"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date</label>
                  <input
                    type="date"
                    value={insuranceForm.issue_date}
                    onChange={(e) => setInsuranceForm({ ...insuranceForm, issue_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={insuranceForm.expiry_date}
                    onChange={(e) => setInsuranceForm({ ...insuranceForm, expiry_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Coverage Type</label>
                <select
                  value={insuranceForm.coverage_type}
                  onChange={(e) => setInsuranceForm({ ...insuranceForm, coverage_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="comprehensive">Comprehensive</option>
                  <option value="third_party">Third Party</option>
                  <option value="third_party_fire_theft">Third Party, Fire & Theft</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Document (Optional)
                </label>
                <input
                  ref={insuranceFileRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Accepted: Images or PDF</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInsuranceForm(false)}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                >
                  {uploading ? 'Uploading...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

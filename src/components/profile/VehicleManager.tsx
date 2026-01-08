import { useState, useEffect, useRef } from 'react';
import { Car, X, Edit, Trash2, Upload, Check, AlertCircle, Loader, Plus, Search, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  capacity: number;
  is_active: boolean;
  fuel_type?: string;
  vehicle_type?: string;
  registration_year?: number;
  engine_capacity?: number;
  image_url?: string;
  vehicle_photo_url?: string;
  mot_status?: string;
  mot_expiry_date?: string;
  tax_status?: string;
  tax_due_date?: string;
}

interface VehicleFormData {
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  capacity: number;
  fuel_type: string;
  vehicle_type: string;
}

const fuelTypes = ['petrol', 'diesel', 'electric', 'hybrid', 'cng', 'lpg'];
const vehicleTypes = ['sedan', 'suv', 'hatchback', 'mpv', 'van', 'other'];

export default function VehicleManager() {
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [entryMode, setEntryMode] = useState<'lookup' | 'manual'>('lookup');
  const [licensePlateInput, setLicensePlateInput] = useState('');
  const [vehicleImage, setVehicleImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; vehicle: Vehicle | null }>({ show: false, vehicle: null });
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState<VehicleFormData>({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    license_plate: '',
    capacity: 4,
    fuel_type: 'petrol',
    vehicle_type: 'sedan',
  });

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    if (editingVehicle) {
      setFormData({
        make: editingVehicle.make,
        model: editingVehicle.model,
        year: editingVehicle.year,
        color: editingVehicle.color,
        license_plate: editingVehicle.license_plate,
        capacity: editingVehicle.capacity,
        fuel_type: editingVehicle.fuel_type || 'petrol',
        vehicle_type: editingVehicle.vehicle_type || 'sedan',
      });
      setShowForm(true);
    }
  }, [editingVehicle]);

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (err: any) {
      console.error('Failed to load vehicles:', err);
    }
  };

  const lookupVehicle = async () => {
    if (!licensePlateInput.trim()) {
      setError('Please enter a license plate number');
      return;
    }

    setError('');
    setLookupLoading(true);

    try {
      const plateNumber = licensePlateInput.trim().toUpperCase();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vehicle-lookup`;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ registrationNumber: plateNumber }),
      });

      if (!response.ok) {
        throw new Error('Vehicle lookup service unavailable. Please use manual entry.');
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('Vehicle not found. Please use manual entry or check the license plate.');
      }

      const vehicleData = result.data;

      setFormData({
        make: vehicleData.make || '',
        model: vehicleData.model || '',
        year: vehicleData.year || new Date().getFullYear(),
        color: vehicleData.color || '',
        license_plate: plateNumber,
        capacity: vehicleData.capacity || 4,
        fuel_type: vehicleData.fuel_type || 'petrol',
        vehicle_type: vehicleData.vehicle_type || 'sedan',
      });

      setEntryMode('manual');
      setSuccess('Vehicle details loaded! Please review and confirm.');
    } catch (err: any) {
      setError(err.message || 'Failed to lookup vehicle. Please use manual entry.');
      setFormData(prev => ({ ...prev, license_plate: licensePlateInput.trim().toUpperCase() }));
      setEntryMode('manual');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }

    setVehicleImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadVehicleImage = async (vehicleId: string): Promise<string | null> => {
    if (!vehicleImage) return null;

    try {
      const fileExt = vehicleImage.name.split('.').pop();
      const fileName = `${vehicleId}-${Date.now()}.${fileExt}`;
      const filePath = `${profile?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(filePath, vehicleImage, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error('Error uploading image:', err);
      return null;
    }
  };

  const validateForm = (): boolean => {
    if (!formData.make.trim()) {
      setError('Please enter vehicle make');
      return false;
    }
    if (!formData.model.trim()) {
      setError('Please enter vehicle model');
      return false;
    }
    if (!formData.color.trim()) {
      setError('Please enter vehicle color');
      return false;
    }
    if (!formData.license_plate.trim()) {
      setError('Please enter license plate number');
      return false;
    }
    if (formData.year < 1900 || formData.year > new Date().getFullYear() + 2) {
      setError('Please enter a valid year');
      return false;
    }
    if (formData.capacity < 1 || formData.capacity > 8) {
      setError('Capacity must be between 1 and 8');
      return false;
    }
    // Vehicle photo is mandatory for new vehicles
    if (!editingVehicle && !vehicleImage) {
      setError('Please upload a photo of your vehicle - this is required for safety and verification');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const vehicleData: any = {
        user_id: profile?.id,
        make: formData.make.trim(),
        model: formData.model.trim(),
        year: formData.year,
        color: formData.color.trim(),
        license_plate: formData.license_plate.trim().toUpperCase(),
        capacity: formData.capacity,
        fuel_type: formData.fuel_type,
        vehicle_type: formData.vehicle_type,
        is_active: true,
      };

      if (editingVehicle) {
        const { error: updateError } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', editingVehicle.id);

        if (updateError) throw updateError;

        if (vehicleImage) {
          const imageUrl = await uploadVehicleImage(editingVehicle.id);
          if (imageUrl) {
            await supabase
              .from('vehicles')
              .update({ vehicle_photo_url: imageUrl })
              .eq('id', editingVehicle.id);
          }
        }

        setSuccess('Vehicle updated successfully!');
      } else {
        const { data: newVehicle, error: insertError } = await supabase
          .from('vehicles')
          .insert(vehicleData)
          .select()
          .single();

        if (insertError) throw insertError;

        if (vehicleImage && newVehicle) {
          const imageUrl = await uploadVehicleImage(newVehicle.id);
          if (imageUrl) {
            await supabase
              .from('vehicles')
              .update({ vehicle_photo_url: imageUrl })
              .eq('id', newVehicle.id);
          }
        }

        setSuccess('Vehicle added successfully!');
      }

      resetForm();
      await loadVehicles();
    } catch (err: any) {
      console.error('Vehicle operation error:', err);
      setError(err.message || 'Failed to save vehicle. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    const vehicleToDelete = vehicles.find(v => v.id === vehicleId);
    if (!vehicleToDelete) return;

    // Show custom confirmation modal instead of browser confirm
    setDeleteConfirm({ show: true, vehicle: vehicleToDelete });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.vehicle) return;

    const vehicleId = deleteConfirm.vehicle.id;
    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      // First check if this vehicle is used in any active rides
      const { data: activeRides, error: ridesError } = await supabase
        .from('rides')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .in('status', ['pending', 'in_progress', 'scheduled'])
        .limit(1);

      if (ridesError) {
        console.warn('Could not check for active rides:', ridesError);
      }

      if (activeRides && activeRides.length > 0) {
        setError('Cannot delete this vehicle - it is currently assigned to active rides. Please complete or cancel those rides first.');
        setDeleteConfirm({ show: false, vehicle: null });
        setDeleting(false);
        return;
      }

      const { error: deleteError } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId)
        .eq('user_id', profile?.id); // Extra safety check

      if (deleteError) throw deleteError;

      setSuccess('Vehicle deleted successfully!');
      setDeleteConfirm({ show: false, vehicle: null });
      await loadVehicles();
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete vehicle. Please try again.');
    } finally {
      setDeleting(false);
      setDeleteConfirm({ show: false, vehicle: null });
    }
  };

  const resetForm = () => {
    setFormData({
      make: '',
      model: '',
      year: new Date().getFullYear(),
      color: '',
      license_plate: '',
      capacity: 4,
      fuel_type: 'petrol',
      vehicle_type: 'sedan',
    });
    setLicensePlateInput('');
    setVehicleImage(null);
    setImagePreview(null);
    setShowForm(false);
    setEditingVehicle(null);
    setEntryMode('lookup');
    setError('');
    setSuccess('');
  };

  return (
    <div className="space-y-4">
      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && deleteConfirm.vehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Vehicle</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete <span className="font-semibold">{deleteConfirm.vehicle.make} {deleteConfirm.vehicle.model}</span>?
              </p>
              <p className="text-sm text-gray-500 mt-1">
                License Plate: {deleteConfirm.vehicle.license_plate}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm({ show: false, vehicle: null })}
                disabled={deleting}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Vehicle
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Car className="w-6 h-6" />
          My Vehicles
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Vehicle
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {!editingVehicle && entryMode === 'lookup' && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Number (License Plate)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={licensePlateInput}
                    onChange={(e) => setLicensePlateInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && lookupVehicle()}
                    placeholder="e.g., BV67FHU"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                    disabled={lookupLoading}
                  />
                  <button
                    onClick={lookupVehicle}
                    disabled={lookupLoading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center gap-2"
                  >
                    {lookupLoading ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Looking up...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Lookup
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Enter your UK vehicle registration to auto-fill details
                </p>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setEntryMode('manual')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Or enter details manually →
                </button>
              </div>
            </div>
          )}

          {(entryMode === 'manual' || editingVehicle) && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Make *
                  </label>
                  <input
                    type="text"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    placeholder="e.g., Toyota"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model *
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., Corolla"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year *
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                    min="1900"
                    max={new Date().getFullYear() + 2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color *
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="e.g., Silver"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Plate *
                </label>
                <input
                  type="text"
                  value={formData.license_plate}
                  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                  placeholder="e.g., BV67FHU"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Passenger Capacity *
                  </label>
                  <select
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                      <option key={num} value={num}>{num} seat{num > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fuel Type
                  </label>
                  <select
                    value={formData.fuel_type}
                    onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {fuelTypes.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type
                </label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {vehicleTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Photo *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-lg p-6 transition-colors ${!editingVehicle && !vehicleImage
                    ? 'border-red-300 hover:border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-blue-500'
                    }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                    ) : (
                      <>
                        <Upload className={`w-8 h-8 ${!editingVehicle ? 'text-red-400' : 'text-gray-400'}`} />
                        <span className={`text-sm ${!editingVehicle ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {!editingVehicle ? 'Vehicle photo required - Click to upload' : 'Click to upload vehicle photo'}
                        </span>
                        <span className="text-xs text-gray-500">Max 10MB • Required for safety verification</span>
                      </>
                    )}
                  </div>
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 font-semibold flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : editingVehicle ? (
                    'Update Vehicle'
                  ) : (
                    'Add Vehicle'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-lg text-gray-900">
                  {vehicle.make} {vehicle.model}
                </h4>
                <p className="text-sm text-gray-600">
                  {vehicle.year} • {vehicle.color}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingVehicle(vehicle)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(vehicle.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <p><span className="font-medium">License Plate:</span> {vehicle.license_plate}</p>
              <p><span className="font-medium">Capacity:</span> {vehicle.capacity} seats</p>
              {vehicle.fuel_type && (
                <p><span className="font-medium">Fuel:</span> {vehicle.fuel_type}</p>
              )}
              {vehicle.vehicle_type && (
                <p><span className="font-medium">Type:</span> {vehicle.vehicle_type}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {vehicles.length === 0 && !showForm && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No vehicles yet</h3>
          <p className="text-gray-600 mb-4">Add your first vehicle to start offering rides</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Your First Vehicle
          </button>
        </div>
      )}
    </div>
  );
}

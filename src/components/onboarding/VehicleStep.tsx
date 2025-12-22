import React, { useState } from 'react';
import { Car, ArrowRight, SkipForward } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface VehicleStepProps {
  onNext: () => void;
  onSkipStep: () => void;
}

export default function VehicleStep({ onNext, onSkipStep }: VehicleStepProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    color: '',
    year: new Date().getFullYear(),
    seats: 4
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('vehicles')
        .insert({
          user_id: user.id,
          ...formData,
          registration_number: 'PENDING'
        });

      if (error) throw error;
      onNext();
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert('Failed to add vehicle. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-3">
          <Car className="w-8 h-8 text-orange-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">
          Add Your Vehicle
        </h3>
        <p className="text-gray-600">
          Optional: Add your vehicle to offer rides
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Make
            </label>
            <input
              type="text"
              value={formData.make}
              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Toyota"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Corolla"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <input
              type="text"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Silver"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              min="1990"
              max={new Date().getFullYear() + 1}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Available Seats
          </label>
          <select
            value={formData.seats}
            onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            {[1, 2, 3, 4, 5, 6, 7].map(num => (
              <option key={num} value={num}>{num} seat{num > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            You can add more details and upload registration documents later from your profile.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSkipStep}
            className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 font-semibold"
          >
            Skip for Now
            <SkipForward className="w-5 h-5" />
          </button>
          <button
            type="submit"
            disabled={loading || !formData.make || !formData.model}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2 font-semibold"
          >
            {loading ? 'Saving...' : 'Add Vehicle'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
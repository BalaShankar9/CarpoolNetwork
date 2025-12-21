import React, { useState } from 'react';
import { Car, Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DriverPreferenceDashboard from '../components/preferences/DriverPreferenceDashboard';
import PassengerFilterCenter from '../components/preferences/PassengerFilterCenter';

export default function Preferences() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'driver' | 'passenger'>('passenger');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setMode('passenger')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  mode === 'passenger'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Search className="w-4 h-4" />
                <span className="font-medium">Passenger Filters</span>
              </button>

              <button
                onClick={() => setMode('driver')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  mode === 'driver'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Car className="w-4 h-4" />
                <span className="font-medium">Driver Preferences</span>
              </button>
            </div>

            <div className="w-20" />
          </div>
        </div>
      </div>

      <div className="py-8">
        {mode === 'driver' && <DriverPreferenceDashboard />}
        {mode === 'passenger' && (
          <div className="max-w-4xl mx-auto px-4">
            <PassengerFilterCenter
              onFiltersChange={(filters) => console.log('Filters changed:', filters)}
              onSearch={() => console.log('Search clicked')}
              matchCount={0}
            />
          </div>
        )}
      </div>
    </div>
  );
}

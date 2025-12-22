import React from 'react';
import { Car, Users, Leaf, Shield, ArrowRight } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="text-center">
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
          <Car className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to CarpoolNetwork!
        </h3>
        <p className="text-gray-600 text-lg">
          Let's get you set up in just a few quick steps
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl text-left">
          <Users className="w-8 h-8 text-blue-600 mb-3" />
          <h4 className="font-semibold text-gray-900 mb-1">Connect with Others</h4>
          <p className="text-sm text-gray-600">
            Find compatible travel companions in your area
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl text-left">
          <Leaf className="w-8 h-8 text-green-600 mb-3" />
          <h4 className="font-semibold text-gray-900 mb-1">Save the Planet</h4>
          <p className="text-sm text-gray-600">
            Reduce your carbon footprint with every ride
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl text-left">
          <Shield className="w-8 h-8 text-purple-600 mb-3" />
          <h4 className="font-semibold text-gray-900 mb-1">Travel Safely</h4>
          <p className="text-sm text-gray-600">
            Verified profiles and secure ride matching
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl text-left">
          <Car className="w-8 h-8 text-orange-600 mb-3" />
          <h4 className="font-semibold text-gray-900 mb-1">Save Money</h4>
          <p className="text-sm text-gray-600">
            Share costs and make your commute affordable
          </p>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-lg font-semibold"
      >
        Get Started
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
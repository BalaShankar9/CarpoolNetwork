import { Car, Users, Leaf, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
            Share Rides,
            <span className="text-blue-600"> Build Community</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Connect with neighbors, reduce your carbon footprint, and make your commute more
            enjoyable. Join our community-based carpooling platform today.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link
              to="/find-rides"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg"
            >
              Find a Ride
            </Link>
            <Link
              to="/post-ride"
              className="px-8 py-4 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all"
            >
              Offer a Ride
            </Link>
          </div>

          <div className="grid md:grid-cols-4 gap-8 pt-12">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Car className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Easy Matching</h3>
              <p className="text-sm text-gray-600 text-center">
                Smart algorithm finds the best carpooling matches
              </p>
            </div>

            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Leaf className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Eco-Friendly</h3>
              <p className="text-sm text-gray-600 text-center">
                Reduce emissions and traffic congestion
              </p>
            </div>

            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Build Community</h3>
              <p className="text-sm text-gray-600 text-center">
                Connect with neighbors and make friends
              </p>
            </div>

            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Safe & Secure</h3>
              <p className="text-sm text-gray-600 text-center">
                Verified users and safety features
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white py-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-blue-600">50K+</p>
              <p className="text-gray-600 mt-2">Active Users</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-green-600">200K+</p>
              <p className="text-gray-600 mt-2">Rides Shared</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-orange-600">1M+</p>
              <p className="text-gray-600 mt-2">Miles Saved</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

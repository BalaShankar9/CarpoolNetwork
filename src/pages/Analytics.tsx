import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdvancedAnalyticsDashboard from '../components/analytics/AdvancedAnalyticsDashboard';

export default function Analytics() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/profile')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">My Analytics</h1>
                <p className="text-sm text-gray-600">Your carpool journey insights</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdvancedAnalyticsDashboard />
      </div>
    </div>
  );
}

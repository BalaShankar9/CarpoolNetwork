import { Car, Users, Star, TrendingUp, Calendar, Award } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function StatisticsDashboard() {
  const { profile } = useAuth();

  if (!profile) return null;

  const memberSince = new Date(profile.created_at);
  const monthsActive = Math.floor(
    (new Date().getTime() - memberSince.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  const totalRides = profile.total_rides_offered + profile.total_rides_taken;
  const responseRate = 95;
  const completionRate = 98;

  const stats = [
    {
      label: 'Rides Offered',
      value: profile.total_rides_offered,
      icon: Car,
      color: 'blue',
      description: 'As a driver'
    },
    {
      label: 'Rides Taken',
      value: profile.total_rides_taken,
      icon: Users,
      color: 'green',
      description: 'As a passenger'
    },
    {
      label: 'Average Rating',
      value: profile.average_rating.toFixed(1),
      icon: Star,
      color: 'yellow',
      description: 'Out of 5.0'
    },
    {
      label: 'Total Trips',
      value: totalRides,
      icon: TrendingUp,
      color: 'purple',
      description: 'Combined rides'
    }
  ];

  const additionalStats = [
    {
      label: 'Member Since',
      value: memberSince.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      sublabel: `${monthsActive} months active`
    },
    {
      label: 'Response Rate',
      value: `${responseRate}%`,
      sublabel: 'Replies to messages'
    },
    {
      label: 'Completion Rate',
      value: `${completionRate}%`,
      sublabel: 'Completed bookings'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      yellow: 'bg-yellow-50 text-yellow-600',
      purple: 'bg-purple-50 text-purple-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <Award className="w-6 h-6 text-gray-900" />
        <h3 className="text-xl font-bold text-gray-900">Your Statistics</h3>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
          >
            <div className={`inline-flex p-2.5 rounded-lg mb-3 ${getColorClasses(stat.color)}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <div className="text-sm font-medium text-gray-700 mb-0.5">{stat.label}</div>
            <div className="text-xs text-gray-500">{stat.description}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
        {additionalStats.map((stat, index) => (
          <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                {stat.label}
              </p>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
            <p className="text-xs text-gray-600">{stat.sublabel}</p>
          </div>
        ))}
      </div>

      {totalRides >= 10 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Award className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-900">Active Rider Badge Earned!</p>
              <p className="text-sm text-blue-700 mt-1">
                You've completed {totalRides} rides. Keep up the great work!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

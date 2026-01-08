import { Shield, Star, Bell, Lock, Users, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Safety() {
  const features = [
    {
      icon: Shield,
      title: 'Verified Profiles',
      description: 'All users undergo verification with email, phone, and optional ID checks.',
    },
    {
      icon: Star,
      title: 'Rating System',
      description: 'Rate and review your carpooling experiences to maintain quality standards.',
    },
    {
      icon: Bell,
      title: 'Real-Time Tracking',
      description: 'Share your trip status with emergency contacts for added security.',
    },
    {
      icon: Lock,
      title: 'Secure Messaging',
      description: 'Encrypted in-app communication keeps your personal information private.',
    },
    {
      icon: Users,
      title: 'Community Trust',
      description: 'Build trust through repeated rides with the same community members.',
    },
    {
      icon: Phone,
      title: 'Emergency Support',
      description: 'Quick access to emergency contacts and reporting features.',
    },
  ];

  return (
    <section id="safety" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Your Safety is Our Priority</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We've built comprehensive safety features to ensure every ride is secure and comfortable.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-blue-50 rounded-2xl p-8 md:p-12">
          <div className="max-w-3xl mx-auto text-center">
            <Shield className="w-16 h-16 text-blue-600 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Community Safety Guidelines
            </h3>
            <p className="text-gray-700 mb-6">
              Every member of our community commits to respectful behavior, punctuality, and
              maintaining a safe environment. We have zero tolerance for harassment or unsafe
              behavior.
            </p>
            <Link
              to="/help"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Read Our Guidelines
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

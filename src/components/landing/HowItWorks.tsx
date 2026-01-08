import { UserPlus, Search, MessageCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HowItWorks() {
  const steps = [
    {
      icon: UserPlus,
      title: 'Create Your Profile',
      description: 'Sign up and tell us about yourself, your preferences, and your regular routes.',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Search,
      title: 'Find or Offer Rides',
      description: 'Search for rides that match your schedule or post your own to help others.',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: MessageCircle,
      title: 'Connect & Coordinate',
      description: 'Chat with potential carpoolers and finalize pickup details.',
      color: 'bg-orange-100 text-orange-600',
    },
    {
      icon: CheckCircle,
      title: 'Share the Journey',
      description: 'Meet your carpool partners and enjoy a more social, sustainable commute.',
      color: 'bg-red-100 text-red-600',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Getting started with Carpool Network is simple. Follow these steps to join our community.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${step.color}`}>
                    <step.icon className="w-8 h-8" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link
            to="/signup"
            className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all transform hover:scale-105"
          >
            Get Started Today
          </Link>
        </div>
      </div>
    </section>
  );
}

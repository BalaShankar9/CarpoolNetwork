/**
 * How It Works - Public Marketing Page
 *
 * SEO-optimized page explaining how Carpool Network works.
 */

import { Link } from 'react-router-dom';
import { Car, Users, Shield, Leaf, MapPin, MessageSquare, Star, ArrowRight } from 'lucide-react';
import Seo from '../../components/shared/Seo';
import Logo from '../../components/shared/Logo';

const steps = [
  {
    icon: Users,
    title: 'Create Your Profile',
    description: 'Sign up and complete your profile with verification. Build trust with ratings and reviews from other carpoolers.',
  },
  {
    icon: Car,
    title: 'Post or Find a Ride',
    description: 'Drivers post their available seats with route details. Passengers search for rides matching their journey.',
  },
  {
    icon: MessageSquare,
    title: 'Connect & Confirm',
    description: 'Message your potential ride-share partner to discuss pickup points and confirm the booking.',
  },
  {
    icon: MapPin,
    title: 'Meet & Travel Together',
    description: 'Meet at the agreed location, share the journey, and split the costs. Safe, simple, sustainable.',
  },
];

const benefits = [
  {
    icon: Leaf,
    title: 'Reduce Your Carbon Footprint',
    description: 'Every shared ride means fewer cars on the road. Join eco-conscious commuters making a real difference.',
    stat: '2.5kg CO₂',
    statLabel: 'saved per shared trip',
  },
  {
    icon: Shield,
    title: 'Travel with Confidence',
    description: 'Verified profiles, ratings system, and our safety features ensure you travel with trusted community members.',
    stat: '4.7/5',
    statLabel: 'average user rating',
  },
  {
    icon: Star,
    title: 'Save Money Every Trip',
    description: 'Share fuel costs and parking fees. Regular commuters can save significantly on their monthly travel expenses.',
    stat: '£80+',
    statLabel: 'typical monthly savings',
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <Seo
        title="How It Works | Carpool Network"
        description="Learn how Carpool Network connects drivers with spare seats to passengers heading the same way. Save money, reduce emissions, and meet great people."
        canonical="/how-it-works"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'How to Use Carpool Network',
          description: 'Step-by-step guide to carpooling with Carpool Network',
          step: steps.map((step, index) => ({
            '@type': 'HowToStep',
            position: index + 1,
            name: step.title,
            text: step.description,
          })),
        }}
      />

      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/">
              <Logo size="sm" clickable={false} />
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/communities" className="text-gray-600 hover:text-gray-900 hidden sm:inline text-sm font-medium">Communities</Link>
              <Link to="/safety-info" className="text-gray-600 hover:text-gray-900 hidden sm:inline text-sm font-medium">Safety</Link>
              <Link to="/faq" className="text-gray-600 hover:text-gray-900 hidden sm:inline text-sm font-medium">FAQ</Link>
              <Link to="/signin" className="px-4 py-2 text-red-600 hover:text-red-700 font-medium text-sm">Sign In</Link>
              <Link to="/signup" className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium text-sm hover:from-red-600 hover:to-orange-600 transition-all">Get Started</Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="bg-gradient-to-br from-red-500 via-red-600 to-orange-500 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              How Carpool Network Works
            </h1>
            <p className="text-xl text-red-100 max-w-2xl mx-auto">
              Connect with fellow travelers, share rides, and make every journey more affordable and sustainable.
            </p>
          </div>
        </header>

        {/* Steps Section */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Getting Started is Easy
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                Whether you're a driver with empty seats or a passenger looking for a ride,
                Carpool Network makes it simple to connect.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <div key={step.title} className="relative">
                  <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 h-full">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center mb-4">
                      <step.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      {index + 1}
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Why Choose Carpool Network?
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                Join UK commuters who are saving money and helping the environment.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-orange-100 rounded-xl flex items-center justify-center mb-4">
                    <benefit.icon className="w-7 h-7 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">{benefit.title}</h3>
                  <p className="text-gray-600 mb-4">{benefit.description}</p>
                  <div className="border-t pt-4">
                    <div className="text-2xl font-bold text-red-600">{benefit.stat}</div>
                    <div className="text-sm text-gray-500">{benefit.statLabel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For Drivers / For Passengers */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* For Drivers */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-8">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center mb-6">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">For Drivers</h3>
                <ul className="space-y-3 text-gray-600 mb-6">
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold">•</span>
                    Offset your fuel and parking costs
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold">•</span>
                    Set your own price and schedule
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold">•</span>
                    Make your commute more social
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold">•</span>
                    Help reduce traffic and emissions
                  </li>
                </ul>
                <Link to="/signup" className="inline-flex items-center gap-2 text-red-600 font-semibold hover:text-red-700">
                  Start offering rides <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* For Passengers */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-8">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">For Passengers</h3>
                <ul className="space-y-3 text-gray-600 mb-6">
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold">•</span>
                    Save money vs. driving solo or public transport
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold">•</span>
                    Travel comfortably with verified drivers
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold">•</span>
                    Flexible pickup locations
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold">•</span>
                    Meet interesting people on your route
                  </li>
                </ul>
                <Link to="/signup" className="inline-flex items-center gap-2 text-red-600 font-semibold hover:text-red-700">
                  Find your ride <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-r from-red-600 to-orange-500 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Start Carpooling?
            </h2>
            <p className="text-red-100 mb-8 text-lg">
              Join our community of smart commuters. Create your free account today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="px-8 py-4 bg-white text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors shadow-lg"
              >
                Create Free Account
              </Link>
              <Link
                to="/communities"
                className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-colors"
              >
                Browse Communities
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-300 py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-bold">Carpool Network</span>
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <Link to="/how-it-works" className="hover:text-white">How It Works</Link>
                <Link to="/safety-info" className="hover:text-white">Safety</Link>
                <Link to="/communities" className="hover:text-white">Communities</Link>
                <Link to="/terms" className="hover:text-white">Terms</Link>
                <Link to="/privacy" className="hover:text-white">Privacy</Link>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
              © {new Date().getFullYear()} Carpool Network Ltd. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

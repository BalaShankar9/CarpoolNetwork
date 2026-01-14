/**
 * How It Works - Public Marketing Page
 * 
 * SEO-optimized page explaining how CarpoolNetwork works.
 * This is a public page that should be indexed by search engines.
 */

import { Link } from 'react-router-dom';
import { Car, Users, Shield, Leaf, MapPin, Calendar, MessageSquare, Star } from 'lucide-react';
import Seo from '../../components/shared/Seo';

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
    description: 'Every shared ride means fewer cars on the road. Join thousands of eco-conscious commuters making a difference.',
    stat: '2.5kg CO₂',
    statLabel: 'saved per shared trip',
  },
  {
    icon: Shield,
    title: 'Travel with Confidence',
    description: 'Verified profiles, ratings system, and our safety features ensure you travel with trusted community members.',
    stat: '4.8/5',
    statLabel: 'average safety rating',
  },
  {
    icon: Star,
    title: 'Save Money Every Trip',
    description: 'Share fuel costs and parking fees. Regular commuters save hundreds of pounds per month on travel expenses.',
    stat: '£150+',
    statLabel: 'average monthly savings',
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <Seo
        title="How It Works"
        description="Learn how CarpoolNetwork connects drivers with spare seats to passengers heading the same way. Save money, reduce emissions, and meet great people."
        canonical="/how-it-works"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'How to Use CarpoolNetwork',
          description: 'Step-by-step guide to carpooling with CarpoolNetwork',
          step: steps.map((step, index) => ({
            '@type': 'HowToStep',
            position: index + 1,
            name: step.title,
            text: step.description,
          })),
        }}
      />
      
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <header className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
              <Car className="w-8 h-8" />
              CarpoolNetwork
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/communities" className="hover:underline hidden sm:inline">Communities</Link>
              <Link to="/safety-info" className="hover:underline hidden sm:inline">Safety</Link>
              <Link to="/signin" className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50">
                Sign In
              </Link>
            </div>
          </nav>
          
          <div className="max-w-7xl mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              How CarpoolNetwork Works
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Connect with fellow travelers, share rides, and make every journey more affordable and sustainable.
            </p>
          </div>
        </header>

        {/* Steps Section */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              Getting Started is Easy
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Whether you're a driver with empty seats or a passenger looking for a ride, 
              CarpoolNetwork makes it simple to connect.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <div key={step.title} className="relative">
                  <div className="bg-blue-50 rounded-2xl p-6 h-full">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                      <step.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -top-3 -left-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
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
            <h2 className="text-3xl font-bold text-center mb-4">
              Why Choose CarpoolNetwork?
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Join thousands of UK commuters who are saving money and helping the environment.
            </p>
            
            <div className="grid md:grid-cols-3 gap-8">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="bg-white rounded-2xl p-8 shadow-sm">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                    <benefit.icon className="w-7 h-7 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-gray-600 mb-4">{benefit.description}</p>
                  <div className="border-t pt-4">
                    <div className="text-2xl font-bold text-blue-600">{benefit.stat}</div>
                    <div className="text-sm text-gray-500">{benefit.statLabel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-blue-600 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Start Carpooling?
            </h2>
            <p className="text-blue-100 mb-8">
              Join our community of smart commuters. Create your free account in under 2 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
              >
                Create Free Account
              </Link>
              <Link
                to="/communities"
                className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Browse Communities
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-300 py-12 px-4">
          <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-lg mb-4">
                <Car className="w-6 h-6" />
                CarpoolNetwork
              </div>
              <p className="text-sm">
                The UK's trusted platform for sharing rides and reducing travel costs.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Learn More</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/how-it-works" className="hover:text-white">How It Works</Link></li>
                <li><Link to="/safety-info" className="hover:text-white">Safety</Link></li>
                <li><Link to="/communities" className="hover:text-white">Communities</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Cities</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/cities/cardiff" className="hover:text-white">Cardiff</Link></li>
                <li><Link to="/cities/sheffield" className="hover:text-white">Sheffield</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-gray-800 text-center text-sm">
            © {new Date().getFullYear()} CarpoolNetwork. All rights reserved.
          </div>
        </footer>
      </div>
    </>
  );
}

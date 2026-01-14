/**
 * Safety Information - Public Marketing Page
 * 
 * SEO-optimized page explaining CarpoolNetwork's safety features.
 * This is a public page that should be indexed by search engines.
 */

import { Link } from 'react-router-dom';
import { Car, Shield, UserCheck, MessageSquare, Star, AlertTriangle, Phone, Lock, Eye, Users } from 'lucide-react';
import Seo from '../../components/shared/Seo';

const safetyFeatures = [
  {
    icon: UserCheck,
    title: 'Verified Profiles',
    description: 'Every user goes through our verification process. We verify email, phone, and encourage ID verification for enhanced trust.',
  },
  {
    icon: Star,
    title: 'Ratings & Reviews',
    description: 'After each ride, both drivers and passengers can rate and review each other. Build your reputation through positive experiences.',
  },
  {
    icon: MessageSquare,
    title: 'In-App Messaging',
    description: 'Communicate safely through our app without sharing personal contact details until you\'re ready.',
  },
  {
    icon: Eye,
    title: 'Trip Sharing',
    description: 'Share your trip details with friends or family so they can track your journey in real-time.',
  },
  {
    icon: AlertTriangle,
    title: '24/7 Safety Support',
    description: 'Our dedicated safety team is available around the clock to help with any concerns or incidents.',
  },
  {
    icon: Lock,
    title: 'Secure Payments',
    description: 'All payment information is encrypted and processed securely. No cash exchanges needed.',
  },
];

const tips = [
  {
    title: 'Before the Ride',
    items: [
      'Check your ride partner\'s profile, ratings, and reviews',
      'Verify the vehicle details match what\'s listed',
      'Share your trip details with a trusted contact',
      'Meet in a public, well-lit location',
    ],
  },
  {
    title: 'During the Ride',
    items: [
      'Keep your phone charged and accessible',
      'Trust your instincts – if something feels wrong, speak up',
      'Wear your seatbelt at all times',
      'Follow the agreed route',
    ],
  },
  {
    title: 'After the Ride',
    items: [
      'Leave an honest rating and review',
      'Report any concerns to our safety team',
      'Don\'t share personal information unnecessarily',
      'Block users who make you uncomfortable',
    ],
  },
];

export default function SafetyInfoPage() {
  return (
    <>
      <Seo
        title="Safety Information"
        description="Your safety is our priority. Learn about CarpoolNetwork's verification process, rating system, and safety features that protect our community."
        canonical="/safety-info"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'How does CarpoolNetwork verify users?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'We verify email and phone for all users, and encourage ID verification for enhanced trust.',
              },
            },
            {
              '@type': 'Question',
              name: 'What safety features does CarpoolNetwork offer?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'We offer verified profiles, ratings and reviews, in-app messaging, trip sharing, 24/7 support, and secure payments.',
              },
            },
          ],
        }}
      />
      
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <header className="bg-gradient-to-br from-green-600 to-green-800 text-white">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
              <Car className="w-8 h-8" />
              CarpoolNetwork
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/how-it-works" className="hover:underline hidden sm:inline">How It Works</Link>
              <Link to="/communities" className="hover:underline hidden sm:inline">Communities</Link>
              <Link to="/signin" className="px-4 py-2 bg-white text-green-600 rounded-lg font-medium hover:bg-green-50">
                Sign In
              </Link>
            </div>
          </nav>
          
          <div className="max-w-7xl mx-auto px-4 py-16 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Your Safety Comes First
            </h1>
            <p className="text-xl text-green-100 max-w-2xl mx-auto">
              We've built multiple layers of protection to ensure every ride is safe, secure, and trustworthy.
            </p>
          </div>
        </header>

        {/* Safety Features */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              Built-In Safety Features
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Every feature is designed with your safety in mind.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {safetyFeatures.map((feature) => (
                <div key={feature.title} className="bg-gray-50 rounded-2xl p-6">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Safety Tips */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              Safety Tips for Every Ride
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Follow these guidelines to ensure a safe carpooling experience.
            </p>
            
            <div className="grid md:grid-cols-3 gap-8">
              {tips.map((section) => (
                <div key={section.title} className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xl font-semibold mb-4 text-green-700">{section.title}</h3>
                  <ul className="space-y-3">
                    {section.items.map((item, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-green-600 text-sm font-medium">{index + 1}</span>
                        </div>
                        <span className="text-gray-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Emergency Contact */}
        <section className="py-20 px-4 bg-red-50">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Phone className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold mb-4">
              Need Help?
            </h2>
            <p className="text-gray-600 mb-6">
              If you're in immediate danger, call emergency services (999). 
              For safety concerns or to report an incident, contact our team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:safety@carpoolnetwork.co.uk"
                className="px-8 py-4 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                Contact Safety Team
              </a>
              <Link
                to="/help"
                className="px-8 py-4 border-2 border-red-600 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors"
              >
                Help Center
              </Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 bg-green-600 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              Join Our Safe Community
            </h2>
            <p className="text-green-100 mb-8">
              Thousands of verified members are already sharing rides safely. Join them today.
            </p>
            <Link
              to="/signup"
              className="inline-block px-8 py-4 bg-white text-green-600 rounded-xl font-semibold hover:bg-green-50 transition-colors"
            >
              Create Free Account
            </Link>
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

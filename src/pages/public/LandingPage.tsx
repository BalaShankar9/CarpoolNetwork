/**
 * Public Landing Page
 * 
 * SEO-optimized homepage for non-authenticated users.
 * This is the main entry point that should be indexed by search engines.
 */

import { Link } from 'react-router-dom';
import { Car, Users, Shield, Leaf, MapPin, ArrowRight, Star, Check } from 'lucide-react';
import Seo from '../../components/shared/Seo';

const features = [
  {
    icon: Users,
    title: 'Trusted Community',
    description: 'Connect with verified drivers and passengers in your area. Every member is rated and reviewed.',
  },
  {
    icon: Shield,
    title: 'Safe & Secure',
    description: 'In-app messaging, trip sharing, and 24/7 support ensure your safety on every journey.',
  },
  {
    icon: Leaf,
    title: 'Eco-Friendly',
    description: 'Reduce your carbon footprint by sharing rides. Every carpool makes a difference.',
  },
];

const stats = [
  { value: '50,000+', label: 'Active Members' },
  { value: '£2M+', label: 'Saved by Users' },
  { value: '500t', label: 'CO₂ Reduced' },
  { value: '4.8/5', label: 'Average Rating' },
];

const testimonials = [
  {
    quote: "CarpoolNetwork has transformed my daily commute. I've saved over £200 a month and made great friends!",
    author: 'Sarah M.',
    location: 'Cardiff',
    rating: 5,
  },
  {
    quote: "As a driver, I love helping fellow commuters while offsetting my fuel costs. The app is super easy to use.",
    author: 'James K.',
    location: 'Sheffield',
    rating: 5,
  },
];

export default function LandingPage() {
  return (
    <>
      <Seo
        title="Share Rides, Save Money"
        description="Join the UK's trusted carpooling community. Share rides with verified members, save money on your commute, and reduce your carbon footprint."
        canonical="/"
      />
      
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <header className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
              <Car className="w-8 h-8" />
              CarpoolNetwork
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/how-it-works" className="hover:underline hidden sm:inline">How It Works</Link>
              <Link to="/communities" className="hover:underline hidden sm:inline">Communities</Link>
              <Link to="/safety-info" className="hover:underline hidden sm:inline">Safety</Link>
              <Link to="/signin" className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50">
                Sign In
              </Link>
            </div>
          </nav>
          
          <div className="max-w-7xl mx-auto px-4 py-20">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Share Rides.<br />
                Save Money.<br />
                <span className="text-blue-200">Help the Planet.</span>
              </h1>
              <p className="text-xl text-blue-100 mb-8 max-w-xl">
                Join thousands of UK commuters sharing their daily journeys. 
                Find trusted drivers or passengers heading your way.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/signup"
                  className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors text-center"
                >
                  Get Started Free
                </Link>
                <Link
                  to="/how-it-works"
                  className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-center"
                >
                  See How It Works
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Bar */}
        <section className="bg-gray-900 text-white py-8">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-blue-400">{stat.value}</div>
                  <div className="text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              Why Choose CarpoolNetwork?
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              We've built the most trusted carpooling platform in the UK, 
              designed to make sharing rides safe, simple, and sustainable.
            </p>
            
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature) => (
                <div key={feature.title} className="bg-gray-50 rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <feature.icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Preview */}
        <section className="py-20 px-4 bg-blue-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Getting Started is Easy
            </h2>
            
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: '1', title: 'Create Profile', desc: 'Sign up and verify your account' },
                { step: '2', title: 'Find Rides', desc: 'Search for rides matching your route' },
                { step: '3', title: 'Connect', desc: 'Message and confirm with your match' },
                { step: '4', title: 'Travel Together', desc: 'Share the journey and costs' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                    {item.step}
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-12">
              <Link
                to="/how-it-works"
                className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700"
              >
                Learn more about how it works
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              What Our Members Say
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="bg-gray-50 rounded-2xl p-8">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-lg mb-4">"{testimonial.quote}"</blockquote>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="font-medium">{testimonial.author}</span>
                    <span>•</span>
                    <span>{testimonial.location}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cities Section */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">
              Active Communities Across the UK
            </h2>
            <p className="text-gray-600 text-center mb-12">
              Join carpoolers in your city and start saving today.
            </p>
            
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { city: 'Cardiff', members: '2,400+', slug: 'cardiff' },
                { city: 'Sheffield', members: '1,800+', slug: 'sheffield' },
                { city: 'Bristol', members: '3,200+', slug: 'bristol', comingSoon: true },
                { city: 'Manchester', members: '4,500+', slug: 'manchester', comingSoon: true },
              ].map((item) => (
                <Link
                  key={item.city}
                  to={item.comingSoon ? '/communities' : `/cities/${item.slug}`}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold">{item.city}</span>
                  </div>
                  <div className="text-gray-600 text-sm">
                    {item.comingSoon ? (
                      <span className="text-yellow-600">Coming Soon</span>
                    ) : (
                      `${item.members} members`
                    )}
                  </div>
                </Link>
              ))}
            </div>
            
            <div className="text-center mt-8">
              <Link
                to="/communities"
                className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700"
              >
                View all communities
                <ArrowRight className="w-5 h-5" />
              </Link>
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
              Create your free account in under 2 minutes and join the movement.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
              >
                Create Free Account
              </Link>
              <Link
                to="/signin"
                className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Sign In
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

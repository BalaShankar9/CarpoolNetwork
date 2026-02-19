/**
 * Public Landing Page
 *
 * SEO-optimized homepage for non-authenticated users.
 * Professional company landing page with all necessary information.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Users, Shield, Leaf, MapPin, ArrowRight, Star, Check, Mail, Clock, Facebook, Twitter, Instagram, Linkedin, Menu, X } from 'lucide-react';
import Seo from '../../components/shared/Seo';
import Logo from '../../components/shared/Logo';

const features = [
  {
    icon: Users,
    title: 'Trusted Community',
    description: 'Connect with verified drivers and passengers in your area. Every member is rated and reviewed for your peace of mind.',
  },
  {
    icon: Shield,
    title: 'Safe & Secure',
    description: 'In-app messaging, trip sharing, and dedicated support ensure your safety on every journey.',
  },
  {
    icon: Leaf,
    title: 'Eco-Friendly',
    description: 'Reduce your carbon footprint by sharing rides. Every carpool helps reduce traffic and emissions.',
  },
];

const stats = [
  { value: '1,200+', label: 'Active Members' },
  { value: '£48K+', label: 'Saved by Users' },
  { value: '15t', label: 'CO₂ Reduced' },
  { value: '4.7/5', label: 'User Rating' },
];

const testimonials = [
  {
    quote: "Carpool Network has made my daily commute so much better. I've met great people and the savings really add up!",
    author: 'Sarah',
    location: 'Cardiff',
    rating: 5,
  },
  {
    quote: "As a driver, I love helping fellow commuters while offsetting my fuel costs. The app is straightforward and reliable.",
    author: 'James',
    location: 'Sheffield',
    rating: 5,
  },
  {
    quote: "I was nervous about carpooling at first, but the verified profiles and ratings gave me real confidence. Best commuting decision I've made.",
    author: 'Emma',
    location: 'Cardiff',
    rating: 5,
  },
];

const whyChooseUs = [
  'Verified user profiles with ID checks',
  'Real-time ride tracking for safety',
  'In-app messaging - no need to share phone numbers',
  'Flexible booking - one-time or recurring rides',
  'Cost sharing calculator built-in',
  'Community ratings and reviews',
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <Seo
        title="Share Rides, Save Money | Carpool Network"
        description="Join the UK's trusted carpooling community. Share rides with verified members, save money on your commute, and reduce your carbon footprint. Sign up free today."
        canonical="/"
      />

      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Logo size="sm" clickable={false} />
            <div className="flex items-center gap-3">
              <Link to="/how-it-works" className="text-gray-600 hover:text-gray-900 hidden sm:inline text-sm font-medium">How It Works</Link>
              <Link to="/communities" className="text-gray-600 hover:text-gray-900 hidden sm:inline text-sm font-medium">Communities</Link>
              <Link to="/safety-info" className="text-gray-600 hover:text-gray-900 hidden sm:inline text-sm font-medium">Safety</Link>
              <Link to="/about" className="text-gray-600 hover:text-gray-900 hidden md:inline text-sm font-medium">About Us</Link>
              <Link to="/contact" className="text-gray-600 hover:text-gray-900 hidden md:inline text-sm font-medium">Contact</Link>
              <Link to="/signin" className="px-4 py-2 text-red-600 hover:text-red-700 font-medium text-sm">Sign In</Link>
              <Link to="/signup" className="hidden sm:inline-flex px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium text-sm hover:from-red-600 hover:to-orange-600 transition-all">
                Get Started
              </Link>
              {/* Hamburger — mobile only */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="sm:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
          {/* Mobile dropdown */}
          {menuOpen && (
            <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-2">
              <Link to="/how-it-works" onClick={() => setMenuOpen(false)} className="block py-3 text-sm font-medium text-gray-700 border-b border-gray-50 hover:text-red-600 transition-colors">How It Works</Link>
              <Link to="/communities" onClick={() => setMenuOpen(false)} className="block py-3 text-sm font-medium text-gray-700 border-b border-gray-50 hover:text-red-600 transition-colors">Communities</Link>
              <Link to="/safety-info" onClick={() => setMenuOpen(false)} className="block py-3 text-sm font-medium text-gray-700 border-b border-gray-50 hover:text-red-600 transition-colors">Safety</Link>
              <Link to="/about" onClick={() => setMenuOpen(false)} className="block py-3 text-sm font-medium text-gray-700 border-b border-gray-50 hover:text-red-600 transition-colors">About Us</Link>
              <Link to="/contact" onClick={() => setMenuOpen(false)} className="block py-3 text-sm font-medium text-gray-700 border-b border-gray-50 hover:text-red-600 transition-colors">Contact</Link>
              <Link to="/faq" onClick={() => setMenuOpen(false)} className="block py-3 text-sm font-medium text-gray-700 border-b border-gray-50 hover:text-red-600 transition-colors">FAQ</Link>
              <div className="py-3">
                <Link to="/signup" onClick={() => setMenuOpen(false)} className="block w-full text-center px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-semibold text-sm">
                  Get Started Free
                </Link>
              </div>
            </div>
          )}
        </nav>

        {/* Hero Section */}
        <header className="bg-gradient-to-br from-red-500 via-red-600 to-orange-500 text-white">
          <div className="max-w-7xl mx-auto px-4 py-20 lg:py-28">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  Share Rides.<br />
                  Save Money.<br />
                  <span className="text-orange-200">Help the Planet.</span>
                </h1>
                <p className="text-xl text-red-100 mb-8 max-w-lg">
                  Join our growing community of UK commuters sharing their daily journeys.
                  Find trusted drivers or passengers heading your way.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    to="/signup"
                    className="px-8 py-4 bg-white text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors text-center shadow-lg"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    to="/how-it-works"
                    className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-colors text-center"
                  >
                    See How It Works
                  </Link>
                </div>
                <p className="text-red-200 text-sm mt-6">
                  Free to join. No credit card required.
                </p>
              </div>
              <div className="hidden lg:flex justify-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
                  <div className="grid grid-cols-2 gap-4">
                    {stats.map((stat) => (
                      <div key={stat.label} className="text-center p-4 bg-white/10 rounded-xl">
                        <div className="text-3xl font-bold text-white">{stat.value}</div>
                        <div className="text-red-100 text-sm">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Bar - Mobile */}
        <section className="bg-gray-900 text-white py-8 lg:hidden">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-bold text-orange-400">{stat.value}</div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Why Choose Carpool Network?
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                We've built a trusted carpooling platform for the UK,
                designed to make sharing rides safe, simple, and sustainable.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature) => (
                <div key={feature.title} className="bg-gray-50 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <feature.icon className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us - Checklist */}
        <section className="py-20 px-4 bg-gradient-to-br from-red-50 to-orange-50">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Everything You Need for Safe Carpooling
                </h2>
                <p className="text-gray-600 text-lg mb-8">
                  Whether you're a driver looking to offset costs or a passenger seeking affordable travel,
                  we've got you covered with features designed for your peace of mind.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {whyChooseUs.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-8 shadow-xl">
                <h3 className="text-xl font-semibold mb-6 text-gray-900">Getting Started is Easy</h3>
                <div className="space-y-6">
                  {[
                    { step: '1', title: 'Create Your Profile', desc: 'Sign up free and verify your account' },
                    { step: '2', title: 'Find or Offer Rides', desc: 'Search rides or post your own journey' },
                    { step: '3', title: 'Connect & Travel', desc: 'Message, confirm, and share the journey' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{item.title}</h4>
                        <p className="text-gray-600 text-sm">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  to="/signup"
                  className="mt-8 w-full px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all text-center block"
                >
                  Create Free Account
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                What Our Members Say
              </h2>
              <p className="text-gray-600">Real experiences from our community</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="bg-gray-50 rounded-2xl p-8">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-lg text-gray-700 mb-4">"{testimonial.quote}"</blockquote>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                      {testimonial.author[0]}
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">{testimonial.author}</span>
                      <span className="text-gray-400 mx-2">•</span>
                      <span className="text-gray-600">{testimonial.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cities Section */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Active Communities Across the UK
              </h2>
              <p className="text-gray-600">
                Join carpoolers in your city and start saving today.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { city: 'Cardiff', members: '450+', slug: 'cardiff' },
                { city: 'Sheffield', members: '320+', slug: 'sheffield' },
                { city: 'Bristol', slug: 'bristol', comingSoon: true },
                { city: 'Manchester', slug: 'manchester', comingSoon: true },
              ].map((item) => (
                <Link
                  key={item.city}
                  to={item.comingSoon ? '/communities' : `/cities/${item.slug}`}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="w-5 h-5 text-red-500" />
                    <span className="font-semibold text-gray-900">{item.city}</span>
                  </div>
                  <div className="text-gray-600 text-sm">
                    {item.comingSoon ? (
                      <span className="text-orange-600 font-medium">Coming Soon</span>
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
                className="inline-flex items-center gap-2 text-red-600 font-semibold hover:text-red-700"
              >
                View all communities
                <ArrowRight className="w-5 h-5" />
              </Link>
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
              Create your free account today and join the movement towards
              smarter, greener, and more affordable commuting.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="px-8 py-4 bg-white text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors shadow-lg"
              >
                Create Free Account
              </Link>
              <Link
                to="/contact"
                className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-300">
          <div className="max-w-7xl mx-auto px-4 py-16">
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
              {/* Brand */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <Car className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-bold text-lg">Carpool Network</span>
                </div>
                <p className="text-gray-400 mb-4 max-w-sm">
                  The UK's trusted platform for sharing rides, saving money, and reducing your environmental impact.
                </p>
                <div className="flex gap-4">
                  <a href="https://facebook.com/carpoolnetworkuk" target="_blank" rel="noopener noreferrer" aria-label="Follow us on Facebook" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                    <Facebook className="w-5 h-5" />
                  </a>
                  <a href="https://twitter.com/carpoolnetuk" target="_blank" rel="noopener noreferrer" aria-label="Follow us on Twitter / X" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                    <Twitter className="w-5 h-5" />
                  </a>
                  <a href="https://instagram.com/carpoolnetworkuk" target="_blank" rel="noopener noreferrer" aria-label="Follow us on Instagram" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a href="https://linkedin.com/company/carpoolnetwork" target="_blank" rel="noopener noreferrer" aria-label="Connect with us on LinkedIn" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                    <Linkedin className="w-5 h-5" />
                  </a>
                </div>
              </div>

              {/* Product */}
              <div>
                <h4 className="font-semibold text-white mb-4">Product</h4>
                <ul className="space-y-3 text-sm">
                  <li><Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
                  <li><Link to="/communities" className="hover:text-white transition-colors">Communities</Link></li>
                  <li><Link to="/safety-info" className="hover:text-white transition-colors">Safety</Link></li>
                  <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                </ul>
              </div>

              {/* Company */}
              <div>
                <h4 className="font-semibold text-white mb-4">Company</h4>
                <ul className="space-y-3 text-sm">
                  <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                  <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                  <li><Link to="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                  <li><Link to="/press" className="hover:text-white transition-colors">Press</Link></li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="font-semibold text-white mb-4">Legal</h4>
                <ul className="space-y-3 text-sm">
                  <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                  <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                  <li><Link to="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link></li>
                </ul>
              </div>
            </div>

            {/* Contact Info */}
            <div className="border-t border-gray-800 mt-12 pt-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-6 text-sm">
                  <a href="mailto:support@carpoolnetwork.co.uk" className="flex items-center gap-2 hover:text-white transition-colors">
                    <Mail className="w-4 h-4" />
                    support@carpoolnetwork.co.uk
                  </a>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Support: Mon-Fri, 9am-6pm GMT
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  © {new Date().getFullYear()} Carpool Network Ltd. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

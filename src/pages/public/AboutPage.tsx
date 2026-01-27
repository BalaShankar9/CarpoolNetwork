/**
 * About Us - Public Page
 *
 * Company information, mission, and values.
 */

import { Link } from 'react-router-dom';
import { Car, Users, Target, Heart, Leaf, Shield, Award, TrendingUp } from 'lucide-react';
import Seo from '../../components/shared/Seo';
import Logo from '../../components/shared/Logo';

const values = [
  {
    icon: Shield,
    title: 'Safety First',
    description: 'Every feature we build starts with your safety in mind. From verified profiles to trip sharing, we prioritize your peace of mind.',
  },
  {
    icon: Heart,
    title: 'Community Driven',
    description: 'We believe in the power of community. Our platform is built by listening to our users and growing together.',
  },
  {
    icon: Leaf,
    title: 'Sustainability',
    description: 'Every shared ride reduces emissions. We are committed to making transportation more sustainable for future generations.',
  },
  {
    icon: Award,
    title: 'Trust & Transparency',
    description: 'We are open about how we work, how we use your data, and how we make decisions. Your trust is our foundation.',
  },
];

const milestones = [
  { year: '2023', title: 'Founded', description: 'Carpool Network launched in Cardiff with a mission to make commuting better.' },
  { year: '2024', title: 'Expansion', description: 'Extended our services to Sheffield and began growing our UK-wide community.' },
  { year: '2025', title: 'Growing', description: 'Reached 1,000+ active members and saved users over £40,000 in commute costs.' },
];

export default function AboutPage() {
  return (
    <>
      <Seo
        title="About Us | Carpool Network"
        description="Learn about Carpool Network's mission to make commuting more affordable, sustainable, and social. Meet the team behind the UK's trusted carpooling platform."
        canonical="/about"
      />

      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/">
              <Logo size="sm" clickable={false} />
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/how-it-works" className="text-gray-600 hover:text-gray-900 hidden sm:inline text-sm font-medium">How It Works</Link>
              <Link to="/communities" className="text-gray-600 hover:text-gray-900 hidden sm:inline text-sm font-medium">Communities</Link>
              <Link to="/contact" className="text-gray-600 hover:text-gray-900 hidden sm:inline text-sm font-medium">Contact</Link>
              <Link to="/signin" className="px-4 py-2 text-red-600 hover:text-red-700 font-medium text-sm">Sign In</Link>
              <Link to="/signup" className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium text-sm hover:from-red-600 hover:to-orange-600 transition-all">Get Started</Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <header className="bg-gradient-to-br from-red-500 via-red-600 to-orange-500 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">About Carpool Network</h1>
            <p className="text-xl text-red-100 max-w-2xl mx-auto">
              We're on a mission to transform the way people commute - making it more affordable,
              sustainable, and social for everyone.
            </p>
          </div>
        </header>

        {/* Mission */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <Target className="w-4 h-4" />
                  Our Mission
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Making Every Journey Better
                </h2>
                <p className="text-gray-600 text-lg mb-6">
                  Carpool Network was born from a simple idea: what if we could make commuting better for everyone?
                  Better for your wallet, better for the environment, and better for building connections in your community.
                </p>
                <p className="text-gray-600 text-lg">
                  We've built a platform that connects drivers with empty seats to passengers heading the same way.
                  It's a win-win that reduces traffic, cuts emissions, and helps people save money while meeting
                  their neighbours and colleagues.
                </p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4">
                    <div className="text-4xl font-bold text-red-600">15t</div>
                    <div className="text-gray-600 text-sm">CO₂ Saved</div>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-4xl font-bold text-red-600">£48K+</div>
                    <div className="text-gray-600 text-sm">User Savings</div>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-4xl font-bold text-red-600">1,200+</div>
                    <div className="text-gray-600 text-sm">Active Members</div>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-4xl font-bold text-red-600">2</div>
                    <div className="text-gray-600 text-sm">UK Cities</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                These principles guide everything we do at Carpool Network.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value) => (
                <div key={value.title} className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-orange-100 rounded-xl flex items-center justify-center mb-4">
                    <value.icon className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{value.title}</h3>
                  <p className="text-gray-600 text-sm">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Journey</h2>
              <p className="text-gray-600">From idea to a growing community.</p>
            </div>

            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div key={milestone.year} className="flex gap-6">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                      {milestone.year.slice(-2)}
                    </div>
                    {index < milestones.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 mt-2" />
                    )}
                  </div>
                  <div className="pb-8">
                    <div className="text-sm text-red-600 font-medium">{milestone.year}</div>
                    <h3 className="text-xl font-semibold text-gray-900">{milestone.title}</h3>
                    <p className="text-gray-600 mt-1">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 bg-gradient-to-r from-red-600 to-orange-500 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
            <p className="text-red-100 mb-8">
              Be part of the movement towards smarter, greener commuting.
            </p>
            <Link
              to="/signup"
              className="inline-block px-8 py-4 bg-white text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors"
            >
              Get Started Free
            </Link>
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
                <Link to="/contact" className="hover:text-white">Contact</Link>
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

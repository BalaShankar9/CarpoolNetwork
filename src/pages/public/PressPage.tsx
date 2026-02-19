/**
 * Press / Media Page - Public Page
 *
 * Media kit and press contact information.
 */

import { Link } from 'react-router-dom';
import { Car, Newspaper, Download, Mail, ArrowRight } from 'lucide-react';
import Seo from '../../components/shared/Seo';
import Logo from '../../components/shared/Logo';

const stats = [
  { value: '1,200+', label: 'Active Members' },
  { value: '£48K+', label: 'Saved by Users' },
  { value: '15t', label: 'CO₂ Reduced' },
  { value: '2', label: 'UK Cities' },
];

const pressHighlights = [
  {
    title: 'Carpool Network Launches in Sheffield',
    date: 'March 2024',
    description: 'After a successful launch in Cardiff, Carpool Network expands to Sheffield, bringing its trusted carpooling community to South Yorkshire.',
  },
  {
    title: 'Community Reaches 1,000 Members',
    date: 'November 2024',
    description: 'Carpool Network celebrates a major milestone as its UK carpooling community surpasses 1,000 active members.',
  },
];

export default function PressPage() {
  return (
    <>
      <Seo
        title="Press & Media | Carpool Network"
        description="Press information, media kit, and news from Carpool Network — the UK's trusted carpooling platform."
        canonical="/press"
      />

      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/">
              <Logo size="sm" clickable={false} />
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/about" className="text-gray-600 hover:text-gray-900 hidden sm:inline text-sm font-medium">About Us</Link>
              <Link to="/contact" className="text-gray-600 hover:text-gray-900 hidden sm:inline text-sm font-medium">Contact</Link>
              <Link to="/signin" className="px-4 py-2 text-red-600 hover:text-red-700 font-medium text-sm">Sign In</Link>
              <Link to="/signup" className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium text-sm hover:from-red-600 hover:to-orange-600 transition-all">Get Started</Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <header className="bg-gradient-to-br from-red-500 via-red-600 to-orange-500 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Newspaper className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Press & Media</h1>
            <p className="text-xl text-red-100 max-w-2xl mx-auto">
              Resources and information for journalists and media professionals covering Carpool Network.
            </p>
          </div>
        </header>

        {/* Key stats */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Carpool Network at a Glance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((s) => (
                <div key={s.label} className="bg-white rounded-xl p-6 text-center shadow-sm">
                  <div className="text-3xl font-bold text-red-600 mb-1">{s.value}</div>
                  <div className="text-gray-500 text-sm">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About the company */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About Carpool Network</h2>
            <p className="text-gray-600 mb-4">
              Carpool Network is the UK's trusted platform for sharing rides. Founded in 2023 and launched initially
              in Cardiff, it connects drivers with empty seats to passengers heading the same way — making commuting
              more affordable, sustainable, and social.
            </p>
            <p className="text-gray-600 mb-4">
              The platform features verified user profiles, in-app messaging, trip sharing for safety, real-time
              ride tracking, and a community rating system. Carpool Network is currently active in Cardiff and Sheffield,
              with expansion across the UK underway.
            </p>
            <p className="text-gray-600">
              Carpool Network Ltd is a registered company in England and Wales.
            </p>
          </div>
        </section>

        {/* News highlights */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Recent News</h2>
            <div className="space-y-6">
              {pressHighlights.map((item) => (
                <div key={item.title} className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="text-sm text-red-600 font-medium mb-1">{item.date}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Media contact */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Press Contact</h2>
            <p className="text-gray-600 mb-6">
              For press enquiries, interview requests, or media kit downloads, please contact our press team.
              We aim to respond to all media enquiries within one business day.
            </p>
            <a
              href="mailto:press@carpoolnetwork.co.uk"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all"
            >
              <Mail className="w-5 h-5" />
              press@carpoolnetwork.co.uk
            </a>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 bg-gradient-to-r from-red-600 to-orange-500 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Learn More About Us</h2>
            <p className="text-red-100 mb-8">Read our full company story and mission.</p>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors"
            >
              About Carpool Network <ArrowRight className="w-5 h-5" />
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
                <Link to="/about" className="hover:text-white">About Us</Link>
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

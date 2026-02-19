/**
 * Careers Page - Public Page
 *
 * We're growing - come join the team.
 */

import { Link } from 'react-router-dom';
import { Car, Briefcase, Heart, Leaf, Users, Mail, ArrowRight } from 'lucide-react';
import Seo from '../../components/shared/Seo';
import Logo from '../../components/shared/Logo';

const values = [
  { icon: Heart, title: 'Mission-Driven', description: 'We are building technology that genuinely improves lives and reduces environmental impact.' },
  { icon: Users, title: 'People First', description: 'Small, collaborative team where your ideas matter and your work has direct impact.' },
  { icon: Leaf, title: 'Sustainability', description: 'Everything we do is in service of a greener, more connected world.' },
];

export default function CareersPage() {
  return (
    <>
      <Seo
        title="Careers | Carpool Network"
        description="Join the Carpool Network team and help us build the UK's best carpooling platform. View open roles and find out what it's like to work with us."
        canonical="/careers"
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
              <Briefcase className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Join Our Team</h1>
            <p className="text-xl text-red-100 max-w-2xl mx-auto">
              Help us build the UK's most trusted carpooling platform and make a real difference
              to how people commute every day.
            </p>
          </div>
        </header>

        {/* Values */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Work With Us?</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                We're a small, passionate team with a big mission. Join us and do the best work of your career.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {values.map((v) => (
                <div key={v.title} className="bg-gray-50 rounded-2xl p-8 text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <v.icon className="w-7 h-7 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{v.title}</h3>
                  <p className="text-gray-600 text-sm">{v.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Open roles */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Open Positions</h2>
            <p className="text-gray-600 mb-6">
              We're growing rapidly and always looking for talented people who share our passion.
              While we don't have specific roles listed right now, we welcome speculative applications.
            </p>
            <p className="text-gray-600 mb-8">
              We're particularly interested in people with experience in <strong>React/TypeScript</strong>,
              <strong> product design</strong>, <strong>community building</strong>, and <strong>growth marketing</strong>.
            </p>
            <a
              href="mailto:careers@carpoolnetwork.co.uk"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all"
            >
              <Mail className="w-5 h-5" />
              Send Us Your CV
            </a>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 bg-gradient-to-r from-red-600 to-orange-500 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Not Ready to Join the Team?</h2>
            <p className="text-red-100 mb-8">You can still be part of the community as a user.</p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors"
            >
              Create a Free Account <ArrowRight className="w-5 h-5" />
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

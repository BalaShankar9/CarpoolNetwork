/**
 * Cookie Policy - Public Legal Page
 *
 * Required under UK PECR (Privacy and Electronic Communications Regulations).
 */

import { Link } from 'react-router-dom';
import { Car, Cookie } from 'lucide-react';
import Seo from '../../components/shared/Seo';
import Logo from '../../components/shared/Logo';

const cookieTypes = [
  {
    name: 'Strictly Necessary Cookies',
    required: true,
    description:
      'These cookies are essential for the website to function and cannot be disabled. They are usually set in response to actions you take, such as logging in or filling in forms.',
    examples: ['Session authentication token', 'Security tokens', 'Load balancer preferences'],
  },
  {
    name: 'Functional Cookies',
    required: false,
    description:
      'These cookies allow the website to remember choices you make (such as your language preference or region) and provide enhanced, personalised features.',
    examples: ['Language preferences', 'Theme preferences', 'Accessibility settings'],
  },
  {
    name: 'Analytics Cookies',
    required: false,
    description:
      'These cookies help us understand how visitors interact with our website. All data collected is anonymised and used solely to improve our service.',
    examples: ['Google Analytics (anonymised)', 'Page view counts', 'Feature usage statistics'],
  },
  {
    name: 'Performance Cookies',
    required: false,
    description:
      'These cookies collect information about how you use our website to help us improve load times and the overall experience.',
    examples: ['Error reporting', 'Load time measurements', 'Browser compatibility data'],
  },
];

export default function CookiesPolicy() {
  return (
    <>
      <Seo
        title="Cookie Policy | Carpool Network"
        description="Learn how Carpool Network uses cookies and how you can manage your cookie preferences."
        canonical="/cookies"
      />

      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/">
              <Logo size="sm" clickable={false} />
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/terms" className="text-gray-600 hover:text-gray-900 hidden sm:inline text-sm font-medium">Terms</Link>
              <Link to="/privacy" className="text-gray-600 hover:text-gray-900 hidden sm:inline text-sm font-medium">Privacy</Link>
              <Link to="/signin" className="px-4 py-2 text-red-600 hover:text-red-700 font-medium text-sm">Sign In</Link>
              <Link to="/signup" className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium text-sm hover:from-red-600 hover:to-orange-600 transition-all">Get Started</Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <header className="bg-gradient-to-br from-red-500 via-red-600 to-orange-500 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Cookie className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Cookie Policy</h1>
            <p className="text-xl text-red-100 max-w-2xl mx-auto">
              How Carpool Network uses cookies and similar technologies.
            </p>
            <p className="text-red-200 text-sm mt-4">Last updated: February 2026</p>
          </div>
        </header>

        {/* Content */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto prose prose-gray">

            {/* What are cookies */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What Are Cookies?</h2>
              <p className="text-gray-600">
                Cookies are small text files placed on your device when you visit a website. They are widely used
                to make websites work more efficiently and to provide information to the owners of the site.
                Carpool Network uses cookies to improve your experience and to help us understand how our service is used.
              </p>
            </div>

            {/* Cookie types */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Types of Cookies We Use</h2>
              <div className="space-y-6">
                {cookieTypes.map((type) => (
                  <div key={type.name} className="bg-gray-50 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{type.name}</h3>
                      {type.required ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Always Active</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded-full">Optional</span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{type.description}</p>
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Examples: </span>
                      <span className="text-sm text-gray-500">{type.examples.join(' · ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Third party */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Third-Party Cookies</h2>
              <p className="text-gray-600 mb-4">
                Some cookies are set by third-party services that appear on our pages. We use the following third-party services
                which may set cookies on your device:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-1">•</span>
                  <span><strong>Google Analytics</strong> – anonymised usage statistics to help us improve the service</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-1">•</span>
                  <span><strong>Supabase</strong> – our authentication and database provider, sets session cookies for login</span>
                </li>
              </ul>
            </div>

            {/* Managing cookies */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Managing Your Cookies</h2>
              <p className="text-gray-600 mb-4">
                You can control and manage cookies in your browser settings. Please note that removing or blocking certain cookies
                may affect your ability to use some features of Carpool Network, including staying logged in.
              </p>
              <p className="text-gray-600 mb-4">How to manage cookies in popular browsers:</p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-1">•</span>
                  <span><strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-1">•</span>
                  <span><strong>Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-1">•</span>
                  <span><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-1">•</span>
                  <span><strong>Edge:</strong> Settings → Privacy, Search, and Services → Cookies</span>
                </li>
              </ul>
            </div>

            {/* Legal basis */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Legal Basis</h2>
              <p className="text-gray-600">
                Our use of cookies is in compliance with the UK Privacy and Electronic Communications Regulations (PECR)
                and the UK GDPR. Strictly necessary cookies are used on the basis of legitimate interests. Optional cookies
                are only used with your consent.
              </p>
            </div>

            {/* Contact */}
            <div className="bg-red-50 rounded-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Questions About Our Cookie Use?</h2>
              <p className="text-gray-600 mb-4">
                If you have any questions about how we use cookies, please contact us:
              </p>
              <a href="mailto:privacy@carpoolnetwork.co.uk" className="text-red-600 font-medium hover:text-red-700">
                privacy@carpoolnetwork.co.uk
              </a>
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
                <Link to="/terms" className="hover:text-white">Terms of Service</Link>
                <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
                <Link to="/cookies" className="hover:text-white">Cookie Policy</Link>
                <Link to="/contact" className="hover:text-white">Contact</Link>
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

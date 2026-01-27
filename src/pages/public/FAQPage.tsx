/**
 * FAQ - Public Page
 *
 * Frequently asked questions for SEO and user support.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, ChevronDown, ChevronUp, Search, HelpCircle } from 'lucide-react';
import Seo from '../../components/shared/Seo';
import Logo from '../../components/shared/Logo';

const faqCategories = [
  {
    title: 'Getting Started',
    faqs: [
      {
        q: 'How do I create an account?',
        a: 'Click "Get Started" on the homepage, enter your email and create a password. You\'ll receive a verification email to confirm your account. Once verified, complete your profile to start using Carpool Network.',
      },
      {
        q: 'Is Carpool Network free to use?',
        a: 'Yes! Creating an account and using the basic features of Carpool Network is completely free. We may introduce premium features in the future, but the core carpooling functionality will always be free.',
      },
      {
        q: 'Do I need a car to use Carpool Network?',
        a: 'No! Carpool Network is for both drivers and passengers. If you\'re looking for a ride, you can search for drivers heading your way. If you drive, you can offer rides to others.',
      },
      {
        q: 'How does profile verification work?',
        a: 'We verify your email and phone number when you sign up. You can also complete optional ID verification for enhanced trust. Verified profiles get a badge and are more likely to get ride matches.',
      },
    ],
  },
  {
    title: 'Finding & Offering Rides',
    faqs: [
      {
        q: 'How do I find a ride?',
        a: 'Go to "Find Rides" and enter your origin, destination, and preferred date/time. We\'ll show you available rides that match your route. You can filter by price, driver rating, and more.',
      },
      {
        q: 'How do I offer a ride as a driver?',
        a: 'Click "Post Ride" and enter your journey details including origin, destination, date/time, and number of available seats. Set your price per seat and add any preferences for passengers.',
      },
      {
        q: 'How are ride prices determined?',
        a: 'Drivers set their own prices. We recommend pricing based on fuel costs shared between passengers. Our cost calculator can help you find a fair price for your route.',
      },
      {
        q: 'Can I set up recurring rides?',
        a: 'Yes! When posting a ride, you can mark it as recurring (e.g., every weekday). This is great for regular commutes. Passengers can also set up recurring ride requests.',
      },
      {
        q: 'What if I need to cancel a ride?',
        a: 'You can cancel a ride through "My Rides". Please cancel as early as possible to give others time to make alternative arrangements. Frequent cancellations may affect your reliability score.',
      },
    ],
  },
  {
    title: 'Safety & Trust',
    faqs: [
      {
        q: 'How does Carpool Network keep users safe?',
        a: 'We have multiple safety features: verified profiles with ratings and reviews, in-app messaging (no need to share phone numbers), trip sharing with friends/family, and a dedicated safety team available for concerns.',
      },
      {
        q: 'Can I share my trip with someone?',
        a: 'Yes! Before or during a ride, you can share your trip details with trusted contacts. They can see your route and expected arrival time in real-time.',
      },
      {
        q: 'What should I do if I feel unsafe?',
        a: 'If you\'re in immediate danger, call 999. For non-emergency safety concerns, contact our safety team at safety@carpoolnetwork.co.uk. You can also report users directly through the app.',
      },
      {
        q: 'How do ratings and reviews work?',
        a: 'After each completed ride, both drivers and passengers can rate each other (1-5 stars) and leave optional reviews. Ratings are visible on profiles and help build community trust.',
      },
    ],
  },
  {
    title: 'Payments & Costs',
    faqs: [
      {
        q: 'How do payments work?',
        a: 'Currently, payments are arranged directly between drivers and passengers. Most users use bank transfer, cash, or payment apps. We\'re working on in-app payments for the future.',
      },
      {
        q: 'How much can I save by carpooling?',
        a: 'Savings depend on your commute, but regular carpoolers typically save £50-150 per month on travel costs. Drivers offset their fuel costs, while passengers save compared to driving solo or public transport.',
      },
      {
        q: 'Is carpooling legal in the UK?',
        a: 'Yes! Sharing costs for a journey is perfectly legal in the UK. As long as drivers don\'t make a profit (only share actual costs like fuel and parking), no special licence is needed.',
      },
    ],
  },
  {
    title: 'Account & Settings',
    faqs: [
      {
        q: 'How do I change my password?',
        a: 'Go to Settings > Security > Change Password. You\'ll need to enter your current password and then choose a new one.',
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes, you can request account deletion in Settings > Account > Delete Account. This will permanently remove your profile and all associated data.',
      },
      {
        q: 'How do I update my profile information?',
        a: 'Go to your Profile page and click "Edit Profile". You can update your photo, bio, preferences, and other details.',
      },
      {
        q: 'How do I manage notifications?',
        a: 'Go to Settings > Notifications to control which alerts you receive via email and push notifications.',
      },
    ],
  },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredCategories = faqCategories
    .map((category) => ({
      ...category,
      faqs: category.faqs.filter(
        (faq) =>
          faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.a.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.faqs.length > 0);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqCategories.flatMap((cat) =>
      cat.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.a,
        },
      }))
    ),
  };

  return (
    <>
      <Seo
        title="Frequently Asked Questions | Carpool Network"
        description="Find answers to common questions about Carpool Network. Learn how to find rides, offer rides, stay safe, and more."
        canonical="/faq"
        jsonLd={faqSchema}
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
              <Link to="/about" className="text-gray-600 hover:text-gray-900 hidden sm:inline text-sm font-medium">About</Link>
              <Link to="/contact" className="text-gray-600 hover:text-gray-900 hidden sm:inline text-sm font-medium">Contact</Link>
              <Link to="/signin" className="px-4 py-2 text-red-600 hover:text-red-700 font-medium text-sm">Sign In</Link>
              <Link to="/signup" className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium text-sm hover:from-red-600 hover:to-orange-600 transition-all">Get Started</Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <header className="bg-gradient-to-br from-red-500 via-red-600 to-orange-500 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
            <p className="text-xl text-red-100 max-w-2xl mx-auto mb-8">
              Find answers to common questions about using Carpool Network.
            </p>

            {/* Search */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>
        </header>

        {/* FAQ Content */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No FAQs found matching "{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-red-600 font-medium hover:text-red-700"
                >
                  Clear search
                </button>
              </div>
            ) : (
              filteredCategories.map((category) => (
                <div key={category.title} className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">{category.title}</h2>
                  <div className="space-y-4">
                    {category.faqs.map((faq, index) => {
                      const key = `${category.title}-${index}`;
                      const isOpen = openItems[key];

                      return (
                        <div key={key} className="bg-gray-50 rounded-xl overflow-hidden">
                          <button
                            onClick={() => toggleItem(key)}
                            className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-100 transition-colors"
                          >
                            <span className="font-semibold text-gray-900 pr-4">{faq.q}</span>
                            {isOpen ? (
                              <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="px-6 pb-6">
                              <p className="text-gray-600">{faq.a}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Still Need Help */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Still Have Questions?</h2>
            <p className="text-gray-600 mb-8">
              Can't find the answer you're looking for? Our support team is here to help.
            </p>
            <Link
              to="/contact"
              className="inline-block px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all"
            >
              Contact Support
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
                <Link to="/about" className="hover:text-white">About</Link>
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

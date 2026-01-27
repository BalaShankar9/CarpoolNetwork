/**
 * Contact Us - Public Page
 *
 * Contact form and support information.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Mail, Clock, MessageSquare, HelpCircle, Shield, Send } from 'lucide-react';
import Seo from '../../components/shared/Seo';
import Logo from '../../components/shared/Logo';

const contactOptions = [
  {
    icon: Mail,
    title: 'Email Support',
    description: 'Get help with your account or general enquiries.',
    contact: 'support@carpoolnetwork.co.uk',
    action: 'mailto:support@carpoolnetwork.co.uk',
  },
  {
    icon: Shield,
    title: 'Safety Team',
    description: 'Report safety concerns or incidents.',
    contact: 'safety@carpoolnetwork.co.uk',
    action: 'mailto:safety@carpoolnetwork.co.uk',
  },
  {
    icon: MessageSquare,
    title: 'Business Enquiries',
    description: 'Partnerships, press, and corporate accounts.',
    contact: 'business@carpoolnetwork.co.uk',
    action: 'mailto:business@carpoolnetwork.co.uk',
  },
];

const faqs = [
  { q: 'How long does it take to get a response?', a: 'We aim to respond to all enquiries within 24-48 hours during business days.' },
  { q: 'What if I have a safety concern?', a: 'For urgent safety matters, please email our safety team directly. For emergencies, always call 999.' },
  { q: 'Can I delete my account?', a: 'Yes, you can request account deletion through Settings or by contacting support.' },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'general',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to your backend
    console.log('Contact form submitted:', formData);
    setSubmitted(true);
  };

  return (
    <>
      <Seo
        title="Contact Us | Carpool Network"
        description="Get in touch with Carpool Network. We're here to help with questions, feedback, or support requests. Contact our team today."
        canonical="/contact"
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
              <Link to="/faq" className="text-gray-600 hover:text-gray-900 hidden sm:inline text-sm font-medium">FAQ</Link>
              <Link to="/signin" className="px-4 py-2 text-red-600 hover:text-red-700 font-medium text-sm">Sign In</Link>
              <Link to="/signup" className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium text-sm hover:from-red-600 hover:to-orange-600 transition-all">Get Started</Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <header className="bg-gradient-to-br from-red-500 via-red-600 to-orange-500 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
            <p className="text-xl text-red-100 max-w-2xl mx-auto">
              Have a question or feedback? We'd love to hear from you.
            </p>
          </div>
        </header>

        {/* Contact Options */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              {contactOptions.map((option) => (
                <a
                  key={option.title}
                  href={option.action}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-orange-100 rounded-xl flex items-center justify-center mb-4">
                    <option.icon className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{option.title}</h3>
                  <p className="text-gray-600 text-sm mb-3">{option.description}</p>
                  <span className="text-red-600 font-medium text-sm">{option.contact}</span>
                </a>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 mt-8 text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Support hours: Monday - Friday, 9am - 6pm GMT</span>
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Send Us a Message</h2>
              <p className="text-gray-600">Fill out the form below and we'll get back to you as soon as possible.</p>
            </div>

            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Message Sent!</h3>
                <p className="text-gray-600 mb-6">Thank you for contacting us. We'll respond within 24-48 hours.</p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-red-600 font-medium hover:text-red-700"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-8">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <select
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="general">General Enquiry</option>
                    <option value="support">Account Support</option>
                    <option value="feedback">Feedback</option>
                    <option value="bug">Report a Bug</option>
                    <option value="business">Business Enquiry</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="mb-6">
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    placeholder="How can we help you?"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Send Message
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Quick FAQs */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Common Questions</h2>
              <p className="text-gray-600">
                Quick answers to frequently asked questions.{' '}
                <Link to="/faq" className="text-red-600 hover:text-red-700">View all FAQs</Link>
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.q} className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                  <p className="text-gray-600 text-sm">{faq.a}</p>
                </div>
              ))}
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
                <Link to="/about" className="hover:text-white">About</Link>
                <Link to="/faq" className="hover:text-white">FAQ</Link>
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

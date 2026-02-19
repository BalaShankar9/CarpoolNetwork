import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import Seo from '../components/shared/Seo';
import Logo from '../components/shared/Logo';

export default function PrivacyPolicy() {
  return (
    <>
      <Seo
        title="Privacy Policy | Carpool Network"
        description="Read the Privacy Policy for Carpool Network. Learn how we collect, use and protect your personal data in accordance with UK GDPR and the Data Protection Act 2018."
        canonical="/privacy"
      />

      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/">
              <Logo size="sm" clickable={false} />
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/terms" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:inline">Terms of Service</Link>
              <Link to="/cookies" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:inline">Cookies</Link>
              <Link to="/signin" className="px-4 py-2 text-red-600 hover:text-red-700 font-medium text-sm">Sign In</Link>
              <Link to="/signup" className="hidden sm:inline-flex px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium text-sm hover:from-red-600 hover:to-orange-600 transition-all">Get Started</Link>
            </div>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Link>

          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="flex items-center gap-3 mb-8">
              <Shield className="w-8 h-8 text-red-600" />
              <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
            </div>

            <div className="prose prose-red max-w-none space-y-6 text-gray-700">
              <p className="text-sm text-gray-500">Last Updated: 14 January 2026</p>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
              <p>This Privacy Policy explains how Carpool Network (carpoolnetwork.co.uk) collects, uses, discloses, and safeguards your information when you use our carpooling platform. We are committed to protecting your privacy and complying with UK GDPR and Data Protection Act 2018.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>

              <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Personal Information:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Name, email address, phone number</li>
                <li>Date of birth (for age verification)</li>
                <li>Profile photo</li>
                <li>Emergency contact information</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Driver Information:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Driving license number and details</li>
                <li>License verification status</li>
                <li>International arrival date (if applicable)</li>
                <li>Vehicle information (make, model, registration)</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Usage Information:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Ride history (origins, destinations, times)</li>
                <li>Messages between users</li>
                <li>Reviews and ratings</li>
                <li>Location data for ride matching</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">Technical Information:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>IP address and device information</li>
                <li>Browser type and version</li>
                <li>Usage analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>To provide and maintain the connection platform</li>
                <li>To verify driver licenses with DVLA</li>
                <li>To check license ban status</li>
                <li>To facilitate ride matching and connections</li>
                <li>To enable communication between users</li>
                <li>To ensure safety and security</li>
                <li>To improve our service</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Legal Basis for Processing (UK GDPR)</h2>
              <p>We process your data based on:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Contract:</strong> To provide ridesharing services</li>
                <li><strong>Legal Obligation:</strong> To verify licenses and comply with transport regulations</li>
                <li><strong>Legitimate Interest:</strong> To ensure safety and prevent fraud</li>
                <li><strong>Consent:</strong> For optional features like location tracking</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Information Sharing</h2>
              <p>We share information with:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Other Users:</strong> Profile info, ratings, and ride details for matched connections</li>
                <li><strong>DVLA:</strong> License verification queries</li>
                <li><strong>Law Enforcement:</strong> When required by law or for safety</li>
                <li><strong>Service Providers:</strong> Cloud hosting, analytics (with appropriate safeguards)</li>
              </ul>
              <p className="mt-3">We do not sell your personal information to third parties. We do not process any payments or financial transactions.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Security</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>License numbers are encrypted in storage</li>
                <li>Secure transmission using HTTPS</li>
                <li>Regular security audits</li>
                <li>Access controls and authentication</li>
                <li>However, no method is 100% secure</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Data Retention</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Active account data: Retained while account is active</li>
                <li>Ride history: 7 years (for legal/insurance purposes)</li>
                <li>Messages: 2 years after last activity</li>
                <li>License verification: Until license expires or account closes</li>
                <li>Deleted accounts: Anonymized after 30 days, except where legally required</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Your Rights (UK GDPR)</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> Request copies of your personal data</li>
                <li><strong>Rectification:</strong> Correct inaccurate information</li>
                <li><strong>Erasure:</strong> Request deletion (subject to legal requirements)</li>
                <li><strong>Restriction:</strong> Limit processing of your data</li>
                <li><strong>Portability:</strong> Receive your data in machine-readable format</li>
                <li><strong>Object:</strong> Object to processing based on legitimate interests</li>
                <li><strong>Withdraw Consent:</strong> For consent-based processing</li>
              </ul>
              <p className="mt-3">To exercise these rights, contact us at privacy@carpoolnetwork.co.uk or through the platform.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Cookies and Tracking</h2>
              <p>We use essential cookies for:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Authentication and security</li>
                <li>Session management</li>
                <li>User preferences</li>
              </ul>
              <p className="mt-3">You can control cookies through browser settings.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. International Transfers</h2>
              <p>Your data is primarily stored in UK/EU servers. Any international transfers comply with UK GDPR requirements including appropriate safeguards.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Children's Privacy</h2>
              <p>Our service is not intended for users under 18. We do not knowingly collect data from children.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Changes to Privacy Policy</h2>
              <p>We may update this policy periodically. Material changes will be notified via email or platform notification.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Contact Us</h2>
              <p>For privacy concerns or to exercise your rights:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the platform's support system</li>
                <li>You also have the right to lodge a complaint with the ICO (Information Commissioner's Office)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">14. DVLA License Verification</h2>
              <p>By using this service as a driver, you consent to us verifying your driving license with DVLA, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>License validity checks</li>
                <li>Ban and suspension status</li>
                <li>Endorsement and penalty points</li>
                <li>Regular automated checks for ongoing verification</li>
              </ul>
            </section>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p>© {new Date().getFullYear()} Carpool Network Ltd. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link to="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link>
              <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

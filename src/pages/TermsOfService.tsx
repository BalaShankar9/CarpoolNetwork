import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';
import Seo from '../components/shared/Seo';
import Logo from '../components/shared/Logo';

export default function TermsOfService() {
  return (
    <>
      <Seo
        title="Terms of Service | Carpool Network"
        description="Read the Terms of Service for Carpool Network. Understand your rights and responsibilities when using our UK carpooling platform."
        canonical="/terms"
      />

      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/">
              <Logo size="sm" clickable={false} />
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:inline">Privacy Policy</Link>
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
              <FileText className="w-8 h-8 text-red-600" />
              <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
            </div>

            <div className="prose prose-red max-w-none space-y-6 text-gray-700">
              <p className="text-sm text-gray-500">Last Updated: 14 January 2026</p>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p>By accessing and using Carpool Network (carpoolnetwork.co.uk), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Service Description</h2>
              <p>Our platform connects drivers and passengers for carpooling purposes. We are solely a technology platform that facilitates connections between users. We are not a transportation provider, taxi service, or payment processor. All arrangements between drivers and passengers, including any cost contributions, are made privately between users.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. User Requirements</h2>
              <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">For All Users:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Must be at least 18 years of age</li>
                <li>Must provide accurate and complete information</li>
                <li>Must maintain account security</li>
                <li>Must not share account credentials</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">For Drivers:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Must hold a valid UK full driving license or international license (within 12 months of UK arrival)</li>
                <li>License must be verified and not banned or suspended</li>
                <li>Must have appropriate vehicle insurance as required by UK law</li>
                <li>Vehicle must be roadworthy and meet MOT/tax requirements</li>
                <li>Must comply with all UK traffic laws and regulations</li>
                <li>Responsible for ensuring insurance covers intended usage</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. License Verification</h2>
              <p>All drivers must provide valid driving license details for verification purposes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Valid UK full driving license or international license</li>
                <li>For international licenses: must be within 12 months of UK arrival</li>
                <li>License must not be banned, suspended, or expired</li>
              </ul>
              <p className="mt-3">We reserve the right to verify licenses with DVLA and suspend accounts with invalid or banned licenses.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Private Arrangements</h2>
              <p>Important: The platform does not handle, process, or facilitate any payments.</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>All cost-sharing arrangements are private between driver and passengers</li>
                <li>Users must arrange payment methods directly with each other</li>
                <li>Platform is not involved in any financial transactions</li>
                <li>Platform is not responsible for payment disputes</li>
                <li>Any cost contributions must comply with UK ridesharing laws</li>
                <li>Drivers must ensure they do not operate as a commercial taxi service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Safety and Conduct</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Users must treat each other with respect</li>
                <li>No harassment, discrimination, or inappropriate behavior</li>
                <li>Report safety concerns immediately</li>
                <li>Emergency contacts should be provided and kept current</li>
                <li>Users may be removed for violations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Cancellation Policy</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Users should provide reasonable notice for cancellations</li>
                <li>Repeated last-minute cancellations may result in account restrictions</li>
                <li>Any cost-related matters are between users only</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Liability</h2>
              <p>The platform acts only as an intermediary:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>We are not responsible for user actions or behavior</li>
                <li>We are not liable for accidents, injuries, or property damage</li>
                <li>Users engage in ridesharing at their own risk</li>
                <li>Driver insurance is primary coverage for incidents</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Account Termination</h2>
              <p>We reserve the right to suspend or terminate accounts for:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violation of terms</li>
                <li>Fraudulent activity</li>
                <li>Safety concerns</li>
                <li>Invalid or expired licenses</li>
                <li>Misuse of platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to Terms</h2>
              <p>We may update these terms periodically. Continued use of the service constitutes acceptance of modified terms.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact Information</h2>
              <p>For questions about these terms, please contact us at support@carpoolnetwork.co.uk or through the platform's support system.</p>
            </section>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p>© {new Date().getFullYear()} Carpool Network Ltd. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link>
              <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

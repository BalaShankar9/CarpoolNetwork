import { HelpCircle, MessageCircle, FileText, Book, Mail, ExternalLink, Star, Bug } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FeedbackButton from '../shared/FeedbackButton';

export default function SupportSettings() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <HelpCircle className="w-6 h-6" />
          Get Help
        </h2>

        <div className="space-y-3">
          <button
            onClick={() => window.open('https://help.carpoolnetwork.co.uk', '_blank')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <Book className="w-5 h-5 text-gray-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Help Center</p>
                <p className="text-sm text-gray-500">Browse articles and guides</p>
              </div>
            </div>
            <ExternalLink className="w-5 h-5 text-gray-400" />
          </button>

          <button
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-gray-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Live Chat Support</p>
                <p className="text-sm text-gray-500">Chat with our support team</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              Online
            </span>
          </button>

          <button
            onClick={() => window.location.href = 'mailto:support@carpoolnetwork.co.uk'}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Email Support</p>
                <p className="text-sm text-gray-500">support@carpoolnetwork.co.uk</p>
              </div>
            </div>
            <ExternalLink className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Bug className="w-6 h-6" />
          Report Issues
        </h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Bug className="w-5 h-5 text-gray-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Report a Bug</p>
                <p className="text-sm text-gray-500">Help us improve the app</p>
              </div>
            </div>
            <FeedbackButton />
          </div>

          <button className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-gray-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Request a Feature</p>
                <p className="text-sm text-gray-500">Suggest new features or improvements</p>
              </div>
            </div>
            <span className="text-blue-600">→</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Legal
        </h2>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/terms')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-600" />
              <p className="font-medium text-gray-900">Terms of Service</p>
            </div>
            <span className="text-blue-600">→</span>
          </button>

          <button
            onClick={() => navigate('/privacy')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-600" />
              <p className="font-medium text-gray-900">Privacy Policy</p>
            </div>
            <span className="text-blue-600">→</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">App Version</span>
            <span className="text-gray-900 font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Build Number</span>
            <span className="text-gray-900 font-medium">2024.12.22</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Last Updated</span>
            <span className="text-gray-900 font-medium">December 2024</span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-gray-900 mb-2">Love Carpool Network?</h3>
        <p className="text-sm text-gray-700 mb-4">
          Help us grow by rating the app and sharing it with friends!
        </p>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            Rate on App Store
          </button>
          <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
            Share App
          </button>
        </div>
      </div>
    </div>
  );
}

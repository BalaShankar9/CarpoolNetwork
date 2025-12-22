import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, User, Shield, Bell, Palette, Database, Globe,
  Accessibility, Heart, HelpCircle, FileText, Settings as SettingsIcon,
  Car, Users, Briefcase, Headphones, ChevronRight, CheckCircle
} from 'lucide-react';
import AccountSettings from '../components/settings/AccountSettings';
import NotificationSettings from '../components/settings/NotificationSettings';
import PrivacySettings from '../components/settings/PrivacySettings';
import DriverPreferences from '../components/settings/DriverPreferences';
import PassengerPreferences from '../components/settings/PassengerPreferences';
import AppearanceSettings from '../components/settings/AppearanceSettings';
import AccessibilitySettings from '../components/settings/AccessibilitySettings';
import DataSettings from '../components/settings/DataSettings';
import SupportSettings from '../components/settings/SupportSettings';

type SettingsSection =
  | 'account'
  | 'notifications'
  | 'privacy'
  | 'driver'
  | 'passenger'
  | 'appearance'
  | 'accessibility'
  | 'data'
  | 'support';

interface SettingsCategory {
  id: SettingsSection;
  icon: any;
  title: string;
  description: string;
  badge?: string;
  color: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<SettingsSection | null>(null);

  const categories: SettingsCategory[] = [
    {
      id: 'account',
      icon: User,
      title: 'Account Settings',
      description: 'Manage your personal information, email, phone, and profile',
      color: 'bg-blue-50 text-blue-600'
    },
    {
      id: 'privacy',
      icon: Shield,
      title: 'Security & Privacy',
      description: 'Password, 2FA, passkeys, sessions, and privacy controls',
      badge: 'Important',
      color: 'bg-red-50 text-red-600'
    },
    {
      id: 'notifications',
      icon: Bell,
      title: 'Notifications',
      description: 'Push, email, SMS notifications and Do Not Disturb settings',
      color: 'bg-purple-50 text-purple-600'
    },
    {
      id: 'driver',
      icon: Car,
      title: 'Driver Preferences',
      description: 'Auto-accept, passenger screening, vehicle amenities, and policies',
      color: 'bg-green-50 text-green-600'
    },
    {
      id: 'passenger',
      icon: Users,
      title: 'Passenger Preferences',
      description: 'Search filters, saved searches, preferred drivers, and auto-matching',
      color: 'bg-yellow-50 text-yellow-600'
    },
    {
      id: 'appearance',
      icon: Palette,
      title: 'Appearance & Theme',
      description: 'Dark mode, colors, font size, units, and display preferences',
      color: 'bg-pink-50 text-pink-600'
    },
    {
      id: 'accessibility',
      icon: Accessibility,
      title: 'Accessibility',
      description: 'Screen reader, high contrast, large text, and mobility features',
      color: 'bg-indigo-50 text-indigo-600'
    },
    {
      id: 'data',
      icon: Database,
      title: 'Data & Storage',
      description: 'Export data, cache management, data usage, and account deletion',
      color: 'bg-gray-50 text-gray-600'
    },
    {
      id: 'support',
      icon: HelpCircle,
      title: 'Help & Support',
      description: 'FAQ, contact support, tutorials, terms, privacy policy, and feedback',
      color: 'bg-teal-50 text-teal-600'
    }
  ];

  const filteredCategories = categories.filter(cat =>
    cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (activeSection) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <button
              onClick={() => setActiveSection(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-3"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              Back to Settings
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {categories.find(c => c.id === activeSection)?.title}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {categories.find(c => c.id === activeSection)?.description}
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          {activeSection === 'account' && <AccountSettings />}
          {activeSection === 'notifications' && <NotificationSettings />}
          {activeSection === 'privacy' && <PrivacySettings />}
          {activeSection === 'driver' && <DriverPreferences />}
          {activeSection === 'passenger' && <PassengerPreferences />}
          {activeSection === 'appearance' && <AppearanceSettings />}
          {activeSection === 'accessibility' && <AccessibilitySettings />}
          {activeSection === 'data' && <DataSettings />}
          {activeSection === 'support' && <SupportSettings />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <SettingsIcon className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>
          <p className="text-blue-100 mb-6">
            Customize your experience and manage your account preferences
          </p>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg border-0 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCategories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setActiveSection(category.id)}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-3 rounded-lg ${category.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  {category.badge && (
                    <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                      {category.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {category.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {category.description}
                </p>
                <div className="flex items-center text-blue-600 text-sm font-medium">
                  Configure
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        {searchQuery && filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No settings found matching "{searchQuery}"</p>
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Settings Tip</h3>
              <p className="text-sm text-gray-700">
                Complete your profile settings to unlock all features and improve your ride matching.
                Visit Account Settings to add missing information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

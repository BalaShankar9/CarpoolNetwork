import { useState } from 'react';
import { Users, UsersRound, MessageSquare, Globe } from 'lucide-react';
import FriendsManager from '../components/social/FriendsManager';
import SocialGroups from '../components/social/SocialGroups';
import { Link } from 'react-router-dom';

type SocialTab = 'friends' | 'groups' | 'community';

export default function Friends() {
  const [activeTab, setActiveTab] = useState<SocialTab>('friends');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Social Hub</h1>
        <p className="text-gray-600 mt-1">
          Connect with carpoolers, join groups, and be part of the community
        </p>
      </div>

      {/* Main Navigation Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'friends'
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            <Users className="w-5 h-5" />
            <span>Friends</span>
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'groups'
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            <UsersRound className="w-5 h-5" />
            <span>Groups</span>
          </button>
          <Link
            to="/community"
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors border-b-2 text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50`}
          >
            <Globe className="w-5 h-5" />
            <span>Community</span>
          </Link>
          <Link
            to="/messages"
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors border-b-2 text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50`}
          >
            <MessageSquare className="w-5 h-5" />
            <span>Messages</span>
          </Link>
        </div>

        {/* Tab Content */}
        <div className="p-0">
          {activeTab === 'friends' && <FriendsManager />}
          {activeTab === 'groups' && <SocialGroups />}
        </div>
      </div>
    </div>
  );
}

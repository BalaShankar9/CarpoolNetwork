import FriendsManager from '../components/social/FriendsManager';

export default function Friends() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Friends</h1>
        <p className="text-gray-600 mt-1">
          Connect with other carpoolers and manage your friend list
        </p>
      </div>
      <FriendsManager />
    </div>
  );
}

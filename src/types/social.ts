// =============================================================================
// Consolidated Social Types for the CarpoolNetwork Social Hub
// =============================================================================
// All social-related type definitions in one place. Components and services
// should import from here instead of defining local interfaces.
// =============================================================================

// ---------------------------------------------------------------------------
// Friends
// ---------------------------------------------------------------------------

export interface FriendProfile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  profile_photo_url?: string | null;
  bio?: string;
  average_rating?: number;
  total_rides_offered?: number;
  total_rides_taken?: number;
  trust_score?: number;
  profile_verified?: boolean;
}

export interface Friendship {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
  friend_id: string;
  friend: FriendProfile;
}

export interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  created_at: string;
  friend: FriendProfile;
}

export interface BlockedUser {
  block_id: string;
  blocked_id: string;
  full_name: string;
  avatar_url?: string | null;
  blocked_at: string;
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export interface SocialGroup {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  owner_id: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
  category: string;
  location: string | null;
  member_count: number;
  max_members: number;
  rules: string | null;
  created_at: string;
  is_member?: boolean;
  user_role?: string;
  owner?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface GroupInvite {
  id: string;
  group_id: string;
  inviter_id: string;
  status: string;
  message: string | null;
  created_at: string;
  group?: SocialGroup;
  inviter?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
  joined_at: string;
  profile?: FriendProfile;
}

// ---------------------------------------------------------------------------
// Activity Feed
// ---------------------------------------------------------------------------

export type ActivityType =
  | 'ride_completed'
  | 'friend_added'
  | 'challenge_completed'
  | 'post_created'
  | 'group_joined'
  | 'milestone'
  | 'leaderboard_change'
  | 'wave_received'
  | 'story_posted';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  text: string;
  userName?: string;
  userAvatar?: string;
  userId?: string;
  timestamp: string;
  meta?: Record<string, string>;
  actionLabel?: string;
  actionLink?: string;
  reactions?: ActivityReaction[];
}

export interface ActivityReaction {
  id: string;
  user_id: string;
  emoji: string;
  user_name?: string;
  user_avatar?: string;
}

// ---------------------------------------------------------------------------
// Presence
// ---------------------------------------------------------------------------

export type PresenceStatus = 'online' | 'idle' | 'offline';

export interface UserPresence {
  user_id: string;
  status: PresenceStatus;
  last_seen_at: string;
}

// ---------------------------------------------------------------------------
// Waves
// ---------------------------------------------------------------------------

export interface SocialWave {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_user?: FriendProfile;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Ride Stories
// ---------------------------------------------------------------------------

export interface RideStory {
  id: string;
  ride_id: string;
  user_id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  user?: FriendProfile;
}

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------

export interface CommunityPost {
  id: string;
  author_id: string;
  title: string;
  body: string;
  category: string | null;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_avatar?: string;
  score?: number;
  comment_count?: number;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  parent_comment_id?: string | null;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
}

// ---------------------------------------------------------------------------
// Challenges
// ---------------------------------------------------------------------------

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  challenge_type: string;
  target_value: number;
  reward_type: string;
  reward_value: string | null;
  badge_icon: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_seasonal: boolean;
  season_theme: string | null;
}

export interface UserChallengeProgress {
  id: string;
  user_id: string;
  challenge_id: string;
  progress: number;
  completed: boolean;
  completed_at: string | null;
  reward_claimed: boolean;
  challenge?: Challenge;
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  category: string;
  region: string | null;
  rank: number;
  score: number;
  period: string;
  user_name?: string;
  user_avatar?: string;
  trend?: number;
}

// ---------------------------------------------------------------------------
// Personal Stats
// ---------------------------------------------------------------------------

export interface SocialStats {
  friendsCount: number;
  groupsCount: number;
  ridesShared: number;
  co2Saved: number;
  challengesCompleted: number;
  challengesActive: number;
  karmaScore: number;
  currentStreak: number;
}

// ---------------------------------------------------------------------------
// Ride Match
// ---------------------------------------------------------------------------

export interface RideMatch {
  ride_id: string;
  driver_id: string;
  driver_name: string;
  driver_avatar: string | null;
  origin: string;
  destination: string;
  departure_time: string;
  seats_available: number;
  match_score: number;
  is_friend: boolean;
  shared_group?: string;
}

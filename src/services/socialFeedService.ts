// =============================================================================
// Social Feed Service — activity feed, reactions, stories, and waves
// =============================================================================
// Aggregates activities from multiple tables, scores them by relevance, and
// supports emoji reactions, ride stories, and social waves.
// =============================================================================

import { supabase } from '../lib/supabase';
import type {
  ActivityItem,
  ActivityReaction,
  RideStory,
  SocialWave,
  FriendProfile,
} from '../types/social';

// ---------------------------------------------------------------------------
// internal helpers
// ---------------------------------------------------------------------------

/** Normalise a single-row or array join result into one object (or null). */
function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

/** Internal type that carries a relevance score alongside the public fields. */
interface ScoredActivity extends ActivityItem {
  _score: number;
}

/**
 * Score an activity for ranking.
 * Formula: (recency * 0.3) + (social_proximity * 0.4) + (engagement * 0.3)
 *
 * - Recency: 1.0 for items < 1h old, decays to 0 at 7 days.
 * - Social proximity: 1.0 for the user themselves, 0.8 for friends, 0.3 for others.
 * - Engagement: defaults to 0.3 (neutral); callers can pass reactionCount for a boost.
 */
function scoreActivity(
  timestamp: string,
  userId: string,
  currentUserId: string,
  friendIds: Set<string>,
  reactionCount = 0,
): number {
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const ageHours = ageMs / 3_600_000;
  const recency = Math.max(0, 1 - ageHours / (7 * 24)); // 0..1 over 7 days

  let proximity = 0.3;
  if (userId === currentUserId) proximity = 1.0;
  else if (friendIds.has(userId)) proximity = 0.8;

  // Engagement: 0.3 base + up to 0.7 bonus based on reaction count (caps at 20 reactions)
  const engagement = Math.min(1.0, 0.3 + (reactionCount / 20) * 0.7);

  return recency * 0.3 + proximity * 0.4 + engagement * 0.3;
}

/**
 * Group consecutive activities of the same type+action into a single
 * summarised item (e.g. "Sarah and 3 others completed a ride").
 */
function groupSimilarActivities(items: ActivityItem[]): ActivityItem[] {
  if (items.length <= 1) return items;

  const grouped: ActivityItem[] = [];
  let i = 0;

  while (i < items.length) {
    const current = items[i];

    // Look ahead for same-type items within a 2-hour window
    const windowEnd = new Date(current.timestamp).getTime() - 2 * 3_600_000;
    const sameType: ActivityItem[] = [current];

    let j = i + 1;
    while (
      j < items.length &&
      items[j].type === current.type &&
      new Date(items[j].timestamp).getTime() >= windowEnd &&
      sameType.length < 5
    ) {
      sameType.push(items[j]);
      j++;
    }

    if (sameType.length >= 3 && current.userName) {
      // Collapse into a summary
      const others = sameType.length - 1;
      const typeLabels: Record<string, string> = {
        ride_completed: 'completed a ride',
        friend_added: 'made a new connection',
        challenge_completed: 'completed a challenge',
        post_created: 'posted in the community',
        group_joined: 'joined a group',
      };
      const action = typeLabels[current.type] ?? current.type.replace(/_/g, ' ');

      grouped.push({
        ...current,
        id: `grouped-${current.id}`,
        text: `${current.userName} and ${others} other${others > 1 ? 's' : ''} ${action}`,
      });
      i = j;
    } else {
      grouped.push(current);
      i++;
    }
  }

  return grouped;
}

// ---------------------------------------------------------------------------
// service
// ---------------------------------------------------------------------------

export const socialFeedService = {
  // -------------------------------------------------------------------------
  // Activity feed
  // -------------------------------------------------------------------------

  /**
   * Fetch a ranked, paginated activity feed for the given user.
   *
   * Pulls from: ride_bookings, friendships, community_posts, user_challenges,
   * social_group_members, leaderboard_cache, social_waves, and ride_stories.
   */
  async getActivities(
    userId: string,
    options: { limit?: number; offset?: number; filter?: string } = {},
  ): Promise<ActivityItem[]> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;
    const fetchLimit = limit + offset + 10; // over-fetch for merge headroom

    try {
      // Build friend set for scoring
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_a, user_b')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);

      const friendIds = new Set<string>();
      (friendships ?? []).forEach((f) => {
        friendIds.add(f.user_a);
        friendIds.add(f.user_b);
      });
      friendIds.delete(userId);

      // Parallel data fetching
      const [
        ridesRes,
        friendsRes,
        postsRes,
        challengesRes,
        groupsRes,
        leaderboardRes,
        wavesRes,
        storiesRes,
      ] = await Promise.allSettled([
        supabase
          .from('ride_bookings')
          .select(
            `id, created_at, pickup_location, dropoff_location, passenger_id,
             rides:ride_id (id, origin, destination, driver_id, profiles:driver_id (full_name, avatar_url))`,
          )
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(fetchLimit),

        supabase
          .from('friendships')
          .select(
            `id, created_at, user_a, user_b,
             profile_a:user_a (id, full_name, avatar_url),
             profile_b:user_b (id, full_name, avatar_url)`,
          )
          .or(`user_a.eq.${userId},user_b.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(fetchLimit),

        supabase
          .from('community_posts')
          .select(
            `id, title, body, category, created_at, author_id,
             author:profiles!community_posts_author_id_fkey (full_name, avatar_url)`,
          )
          .order('created_at', { ascending: false })
          .limit(fetchLimit),

        supabase
          .from('user_challenges')
          .select(
            `id, completed_at, user_id,
             challenges:challenge_id (title, badge_icon)`,
          )
          .eq('completed', true)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(fetchLimit),

        supabase
          .from('social_group_members')
          .select(
            `id, joined_at, user_id,
             social_groups:group_id (id, name),
             profiles:user_id (full_name, avatar_url)`,
          )
          .order('joined_at', { ascending: false })
          .limit(fetchLimit),

        supabase
          .from('leaderboard_cache')
          .select('user_id, rank, score, category, period, updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(5),

        supabase
          .from('social_waves')
          .select(
            `id, from_user_id, to_user_id, created_at,
             from_user:profiles!social_waves_from_user_id_fkey (full_name, avatar_url)`,
          )
          .eq('to_user_id', userId)
          .gte('created_at', new Date(Date.now() - 24 * 3_600_000).toISOString())
          .order('created_at', { ascending: false })
          .limit(fetchLimit),

        supabase
          .from('ride_stories')
          .select(
            `id, ride_id, user_id, photo_url, caption, created_at, expires_at,
             user:profiles!ride_stories_user_id_fkey (full_name, avatar_url)`,
          )
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(fetchLimit),
      ]);

      const items: ScoredActivity[] = [];

      // --- Rides ---
      if (ridesRes.status === 'fulfilled' && ridesRes.value.data) {
        for (const booking of ridesRes.value.data) {
          const ride: any = unwrap(booking.rides);
          const driver = ride ? unwrap(ride.profiles) : null;
          const driverName = driver?.full_name ?? 'Someone';
          const origin = ride?.origin ?? booking.pickup_location ?? 'Origin';
          const dest = ride?.destination ?? booking.dropoff_location ?? 'Destination';

          items.push({
            id: `ride-${booking.id}`,
            type: 'ride_completed',
            text: `${driverName} completed a ride from ${origin} to ${dest}`,
            userName: driverName,
            userAvatar: driver?.avatar_url ?? undefined,
            userId: ride?.driver_id,
            timestamp: booking.created_at,
            actionLabel: ride?.id ? 'View Ride' : undefined,
            actionLink: ride?.id ? `/rides/${ride.id}` : undefined,
            _score: scoreActivity(booking.created_at, ride?.driver_id ?? '', userId, friendIds),
          });
        }
      }

      // --- Friendships ---
      if (friendsRes.status === 'fulfilled' && friendsRes.value.data) {
        for (const fs of friendsRes.value.data) {
          const profileA: any = unwrap(fs.profile_a);
          const profileB: any = unwrap(fs.profile_b);
          const friendProfile = profileA?.id === userId ? profileB : profileA;
          const friendName = friendProfile?.full_name ?? 'Someone';

          items.push({
            id: `friend-${fs.id}`,
            type: 'friend_added',
            text: `${friendName} and you are now friends`,
            userName: friendName,
            userAvatar: friendProfile?.avatar_url ?? undefined,
            userId: friendProfile?.id,
            timestamp: fs.created_at,
            actionLabel: 'Congratulate',
            actionLink: friendProfile?.id ? `/profile/${friendProfile.id}` : undefined,
            _score: scoreActivity(fs.created_at, friendProfile?.id ?? '', userId, friendIds),
          });
        }
      }

      // --- Community posts ---
      if (postsRes.status === 'fulfilled' && postsRes.value.data) {
        for (const post of postsRes.value.data) {
          const author: any = unwrap(post.author);
          const authorName = author?.full_name ?? 'Community Member';
          const title =
            post.title && post.title.length > 50
              ? post.title.slice(0, 50) + '...'
              : post.title || 'a new post';
          const categoryLabel = post.category ? ` in ${post.category}` : '';

          items.push({
            id: `post-${post.id}`,
            type: 'post_created',
            text: `${authorName} posted${categoryLabel}: "${title}"`,
            userName: authorName,
            userAvatar: author?.avatar_url ?? undefined,
            userId: post.author_id,
            timestamp: post.created_at,
            meta: { postId: post.id },
            actionLabel: 'View Post',
            actionLink: `/community/post/${post.id}`,
            _score: scoreActivity(post.created_at, post.author_id, userId, friendIds),
          });
        }
      }

      // --- Challenges ---
      if (challengesRes.status === 'fulfilled' && challengesRes.value.data) {
        for (const uc of challengesRes.value.data) {
          const challenge: any = unwrap(uc.challenges);
          const title = challenge?.title ?? 'a challenge';
          const isCurrentUser = uc.user_id === userId;

          items.push({
            id: `challenge-${uc.id}`,
            type: 'challenge_completed',
            text: isCurrentUser
              ? `You earned the "${title}" badge`
              : `Someone earned the "${title}" badge`,
            timestamp: uc.completed_at ?? new Date().toISOString(),
            actionLabel: 'View Challenges',
            actionLink: '/challenges',
            _score: scoreActivity(
              uc.completed_at ?? new Date().toISOString(),
              uc.user_id,
              userId,
              friendIds,
            ),
          });
        }
      }

      // --- Group joins ---
      if (groupsRes.status === 'fulfilled' && groupsRes.value.data) {
        for (const member of groupsRes.value.data) {
          const group: any = unwrap(member.social_groups);
          const profile: any = unwrap(member.profiles);
          if (!group) continue;

          const memberName = profile?.full_name ?? 'Someone';

          items.push({
            id: `group-${member.id}`,
            type: 'group_joined',
            text: `${memberName} joined "${group.name}"`,
            userName: memberName,
            userAvatar: profile?.avatar_url ?? undefined,
            userId: member.user_id,
            timestamp: member.joined_at ?? new Date().toISOString(),
            actionLabel: 'View Group',
            actionLink: group.id ? `/social/groups/${group.id}` : undefined,
            _score: scoreActivity(
              member.joined_at ?? new Date().toISOString(),
              member.user_id,
              userId,
              friendIds,
            ),
          });
        }
      }

      // --- Leaderboard changes ---
      if (leaderboardRes.status === 'fulfilled' && leaderboardRes.value.data) {
        for (const entry of leaderboardRes.value.data) {
          if (entry.rank <= 10) {
            items.push({
              id: `leaderboard-${entry.category}-${entry.period}`,
              type: 'leaderboard_change',
              text: `You moved up to #${entry.rank} on the ${entry.category.replace(/_/g, ' ')} leaderboard`,
              timestamp: entry.updated_at ?? new Date().toISOString(),
              actionLabel: 'View Leaderboard',
              actionLink: '/leaderboards',
              _score: 0.9, // user's own leaderboard changes are always high-priority
            });
          }
        }
      }

      // --- Waves ---
      if (wavesRes.status === 'fulfilled' && wavesRes.value.data) {
        for (const wave of wavesRes.value.data) {
          const fromUser: any = unwrap(wave.from_user);
          const senderName = fromUser?.full_name ?? 'Someone';

          items.push({
            id: `wave-${wave.id}`,
            type: 'wave_received',
            text: `${senderName} waved at you!`,
            userName: senderName,
            userAvatar: fromUser?.avatar_url ?? undefined,
            userId: wave.from_user_id,
            timestamp: wave.created_at,
            actionLabel: 'Wave Back',
            actionLink: `/profile/${wave.from_user_id}`,
            _score: scoreActivity(wave.created_at, wave.from_user_id, userId, friendIds),
          });
        }
      }

      // --- Stories ---
      if (storiesRes.status === 'fulfilled' && storiesRes.value.data) {
        for (const story of storiesRes.value.data) {
          const storyUser: any = unwrap(story.user);
          const authorName = storyUser?.full_name ?? 'Someone';

          items.push({
            id: `story-${story.id}`,
            type: 'story_posted',
            text: `${authorName} shared a ride story${story.caption ? ': "' + story.caption + '"' : ''}`,
            userName: authorName,
            userAvatar: storyUser?.avatar_url ?? undefined,
            userId: story.user_id,
            timestamp: story.created_at,
            actionLabel: 'View Story',
            actionLink: `/rides/${story.ride_id}`,
            _score: scoreActivity(story.created_at, story.user_id, userId, friendIds),
          });
        }
      }

      // --- Filter by type if requested ---
      const filterMap: Record<string, string[]> = {
        rides: ['ride_completed'],
        friends: ['friend_added', 'wave_received'],
        community: ['post_created', 'group_joined', 'milestone', 'story_posted'],
        achievements: ['challenge_completed', 'leaderboard_change'],
      };

      let filtered = items;
      if (options.filter && options.filter !== 'all' && filterMap[options.filter]) {
        const allowedTypes = filterMap[options.filter];
        filtered = items.filter((i) => allowedTypes.includes(i.type));
      }

      // --- Sort by composite score (descending) ---
      filtered.sort((a, b) => b._score - a._score);

      // --- Group similar adjacent items ---
      const grouped = groupSimilarActivities(filtered);

      // --- Paginate ---
      const page = grouped.slice(offset, offset + limit);

      // Strip internal _score before returning
      return page.map((item) => {
        const { _score, ...rest } = item;
        return rest;
      });
    } catch (err) {
      console.error('[socialFeedService.getActivities]', err);
      return [];
    }
  },

  // -------------------------------------------------------------------------
  // Reactions
  // -------------------------------------------------------------------------

  /**
   * Add an emoji reaction to a feed activity.
   */
  async addReaction(
    activityType: string,
    activityId: string,
    userId: string,
    emoji: string,
  ): Promise<void> {
    try {
      const { error } = await supabase.from('activity_reactions').upsert(
        {
          activity_type: activityType,
          activity_id: activityId,
          user_id: userId,
          emoji,
        },
        { onConflict: 'activity_type,activity_id,user_id' },
      );

      if (error) throw error;
    } catch (err) {
      console.error('[socialFeedService.addReaction]', err);
      throw err;
    }
  },

  /**
   * Remove a reaction by its ID.
   */
  async removeReaction(reactionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('activity_reactions')
        .delete()
        .eq('id', reactionId);

      if (error) throw error;
    } catch (err) {
      console.error('[socialFeedService.removeReaction]', err);
      throw err;
    }
  },

  /**
   * Get all reactions on a specific activity.
   */
  async getReactions(
    activityType: string,
    activityId: string,
  ): Promise<ActivityReaction[]> {
    try {
      const { data, error } = await supabase
        .from('activity_reactions')
        .select(
          `id, user_id, emoji, created_at,
           user:profiles!activity_reactions_user_id_fkey (full_name, avatar_url)`,
        )
        .eq('activity_type', activityType)
        .eq('activity_id', activityId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((r: any) => {
        const user = unwrap(r.user);
        return {
          id: r.id,
          user_id: r.user_id,
          emoji: r.emoji,
          user_name: user?.full_name ?? undefined,
          user_avatar: user?.avatar_url ?? undefined,
        };
      });
    } catch (err) {
      console.error('[socialFeedService.getReactions]', err);
      return [];
    }
  },

  // -------------------------------------------------------------------------
  // Ride Stories
  // -------------------------------------------------------------------------

  /**
   * Get non-expired ride stories from the current user and their friends.
   */
  async getRideStories(
    userId: string,
    friendIds: string[],
  ): Promise<RideStory[]> {
    try {
      const userIds = [userId, ...friendIds];

      const { data, error } = await supabase
        .from('ride_stories')
        .select(
          `id, ride_id, user_id, photo_url, caption, created_at, expires_at,
           user:profiles!ride_stories_user_id_fkey (id, full_name, avatar_url, profile_photo_url)`,
        )
        .in('user_id', userIds)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((s: any) => {
        const userProfile = unwrap(s.user);
        return {
          id: s.id,
          ride_id: s.ride_id,
          user_id: s.user_id,
          photo_url: s.photo_url,
          caption: s.caption,
          created_at: s.created_at,
          expires_at: s.expires_at,
          user: userProfile
            ? ({
                id: userProfile.id,
                full_name: userProfile.full_name,
                avatar_url: userProfile.avatar_url,
                profile_photo_url: userProfile.profile_photo_url,
              } as FriendProfile)
            : undefined,
        };
      });
    } catch (err) {
      console.error('[socialFeedService.getRideStories]', err);
      return [];
    }
  },

  /**
   * Create a new ride story (auto-expires in 24 hours via DB default).
   */
  async createRideStory(
    rideId: string,
    userId: string,
    photoUrl: string,
    caption: string,
  ): Promise<RideStory | null> {
    try {
      const { data, error } = await supabase
        .from('ride_stories')
        .insert({
          ride_id: rideId,
          user_id: userId,
          photo_url: photoUrl,
          caption: caption || null,
        })
        .select('id, ride_id, user_id, photo_url, caption, created_at, expires_at')
        .single();

      if (error) throw error;

      return data as RideStory;
    } catch (err) {
      console.error('[socialFeedService.createRideStory]', err);
      throw err;
    }
  },

  // -------------------------------------------------------------------------
  // Waves
  // -------------------------------------------------------------------------

  /**
   * Send a wave (lightweight ping) to another user.
   */
  async sendWave(
    fromUserId: string,
    toUserId: string,
  ): Promise<SocialWave | null> {
    try {
      const { data, error } = await supabase
        .from('social_waves')
        .insert({
          from_user_id: fromUserId,
          to_user_id: toUserId,
        })
        .select('id, from_user_id, to_user_id, created_at')
        .single();

      if (error) throw error;

      return data as SocialWave;
    } catch (err) {
      console.error('[socialFeedService.sendWave]', err);
      throw err;
    }
  },

  /**
   * Get waves the user has received in the last 24 hours.
   */
  async getWaves(userId: string): Promise<SocialWave[]> {
    try {
      const since = new Date(Date.now() - 24 * 3_600_000).toISOString();

      const { data, error } = await supabase
        .from('social_waves')
        .select(
          `id, from_user_id, to_user_id, created_at,
           from_user:profiles!social_waves_from_user_id_fkey (id, full_name, avatar_url, profile_photo_url)`,
        )
        .eq('to_user_id', userId)
        .gte('created_at', since)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((w: any) => {
        const fromUserProfile = unwrap(w.from_user);
        return {
          id: w.id,
          from_user_id: w.from_user_id,
          to_user_id: w.to_user_id,
          created_at: w.created_at,
          from_user: fromUserProfile
            ? ({
                id: fromUserProfile.id,
                full_name: fromUserProfile.full_name,
                avatar_url: fromUserProfile.avatar_url,
                profile_photo_url: fromUserProfile.profile_photo_url,
              } as FriendProfile)
            : undefined,
        };
      });
    } catch (err) {
      console.error('[socialFeedService.getWaves]', err);
      return [];
    }
  },
};

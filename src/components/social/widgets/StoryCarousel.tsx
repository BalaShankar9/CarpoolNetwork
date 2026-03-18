import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import StoryCarousel, { type Story } from '../shared/StoryCarousel';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 30) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

// Gradient backgrounds for stories without photos
const STORY_GRADIENTS = [
  'from-emerald-400 to-teal-500',
  'from-blue-400 to-indigo-500',
  'from-purple-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-red-500',
  'from-cyan-400 to-blue-500',
  'from-social-warm-400 to-social-community-500',
  'from-social-groups-400 to-social-friends-500',
];

function storyGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return STORY_GRADIENTS[Math.abs(hash) % STORY_GRADIENTS.length];
}

// ---------------------------------------------------------------------------
// Story Modal
// ---------------------------------------------------------------------------

function StoryModal({
  story,
  onClose,
}: {
  story: Story;
  onClose: () => void;
}) {
  // Auto-advance after 5 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const hasPhoto = !!story.photoUrl;
  const gradient = storyGradient(story.id);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Story content */}
        {hasPhoto ? (
          <img
            src={story.photoUrl}
            alt={story.caption || `${story.userName}'s story`}
            className="w-full aspect-[9/16] object-cover"
          />
        ) : (
          /* Gradient placeholder when no photo */
          <div
            className={`w-full aspect-[9/16] bg-gradient-to-br ${gradient} flex items-center justify-center`}
          >
            <div className="text-center px-8">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-white">
                  {getInitials(story.userName)}
                </span>
              </div>
              {story.caption && (
                <p className="text-white text-lg font-medium leading-relaxed">
                  {story.caption}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Progress bar at top */}
        <div className="absolute inset-x-0 top-0 px-3 pt-2">
          <div className="h-0.5 bg-white/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 8, ease: 'linear' }}
              className="h-full bg-white rounded-full"
            />
          </div>
        </div>

        {/* Top gradient overlay */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

        {/* User info */}
        <div className="absolute top-5 left-4 flex items-center gap-3">
          {story.userAvatar ? (
            <img
              src={story.userAvatar}
              alt={story.userName}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-white/60"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-semibold text-sm ring-2 ring-white/30">
              {getInitials(story.userName)}
            </div>
          )}
          <div>
            <p className="text-white text-sm font-semibold drop-shadow-sm">
              {story.userName}
            </p>
            <p className="text-white/70 text-xs">
              {relativeTime(story.createdAt)}
            </p>
          </div>
        </div>

        {/* Bottom caption overlay (only if photo exists and caption exists) */}
        {hasPhoto && story.caption && (
          <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
            <p className="text-white text-sm leading-relaxed drop-shadow-sm">
              {story.caption}
            </p>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          aria-label="Close story"
        >
          <span className="text-lg leading-none">&times;</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Story Carousel Widget
// ---------------------------------------------------------------------------

/** Skeleton for story bubbles while loading */
function StorySkeleton() {
  return (
    <div className="px-5 pb-3">
      <div className="flex items-start gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0 animate-pulse">
            <div className="w-[70px] h-[70px] rounded-full bg-gray-200" />
            <div className="w-12 h-2.5 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StoryCarouselWidget() {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);

  // ------------------------------------------------------------------
  // Fetch stories: recent completed rides within the last 24 hours
  // Each unique driver becomes a "story" entry
  // ------------------------------------------------------------------

  const loadStories = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data } = await supabase
        .from('ride_bookings')
        .select(`
          id, created_at, passenger_id,
          rides:ride_id (
            id, origin, destination, driver_id,
            profiles:driver_id (full_name, avatar_url, profile_photo_url)
          )
        `)
        .eq('status', 'completed')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        const seenUsers = new Set<string>();
        const storyItems: Story[] = [];

        for (const booking of data) {
          const ride: any = Array.isArray(booking.rides)
            ? booking.rides[0]
            : booking.rides;
          const profile = ride
            ? Array.isArray(ride.profiles)
              ? ride.profiles[0]
              : ride.profiles
            : null;
          const uid: string | undefined = ride?.driver_id;

          if (!uid || seenUsers.has(uid)) continue;
          seenUsers.add(uid);

          const avatarUrl =
            profile?.avatar_url || profile?.profile_photo_url || undefined;

          storyItems.push({
            id: booking.id,
            userId: uid,
            userName: profile?.full_name || 'Driver',
            userAvatar: avatarUrl,
            photoUrl: '', // No actual photo — modal will show gradient placeholder
            caption: `Completed a ride from ${ride?.origin || 'A'} to ${ride?.destination || 'B'}`,
            createdAt: booking.created_at,
            isViewed: false,
          });
        }

        setStories(storyItems);
      }
    } catch (err) {
      console.error('StoryCarouselWidget: failed to load stories', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const handleStoryClick = useCallback((story: Story) => {
    setViewingStory(story);
    // Mark as viewed
    setStories((prev) =>
      prev.map((s) => (s.id === story.id ? { ...s, isViewed: true } : s)),
    );
  }, []);

  const handleCloseStory = useCallback(() => {
    setViewingStory(null);
  }, []);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  // Show skeleton while loading
  if (loading) {
    return <StorySkeleton />;
  }

  // Don't render if no stories
  if (stories.length === 0) {
    return null;
  }

  return (
    <>
      <div className="px-5 pb-3">
        <StoryCarousel
          stories={stories}
          onStoryClick={handleStoryClick}
        />
      </div>

      {/* Story viewing modal */}
      <AnimatePresence>
        {viewingStory && (
          <StoryModal story={viewingStory} onClose={handleCloseStory} />
        )}
      </AnimatePresence>
    </>
  );
}

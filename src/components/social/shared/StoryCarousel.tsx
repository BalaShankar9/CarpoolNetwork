import { useRef } from 'react';
import { Plus } from 'lucide-react';

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  photoUrl: string;
  caption?: string;
  createdAt: string;
  isViewed?: boolean;
}

export interface StoryCarouselProps {
  stories: Story[];
  onStoryClick: (story: Story) => void;
  onCreateStory?: () => void;
}

function StoryBubble({
  story,
  onClick,
}: {
  story: Story;
  onClick: () => void;
}) {
  const initials = story.userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const truncatedName =
    story.userName.length > 8
      ? story.userName.slice(0, 8) + '\u2026'
      : story.userName;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
      aria-label={`View ${story.userName}'s story`}
    >
      {/* Ring container */}
      <div
        className={`
          p-[3px] rounded-full
          ${
            story.isViewed
              ? 'bg-gradient-to-br from-gray-200 to-gray-300'
              : 'bg-gradient-to-br from-social-warm-400 via-social-community-500 to-social-groups-500'
          }
        `}
      >
        <div className="w-16 h-16 rounded-full overflow-hidden bg-white p-[2px]">
          <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 group-hover:scale-105 transition-transform duration-200">
            {story.userAvatar ? (
              <img
                src={story.userAvatar}
                alt={story.userName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-social-warm-100 text-social-warm-600 font-semibold text-lg">
                {initials}
              </div>
            )}
          </div>
        </div>
      </div>
      <span className="text-[11px] text-gray-600 font-medium max-w-[68px] truncate">
        {truncatedName}
      </span>
    </button>
  );
}

function CreateStoryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
      aria-label="Create a story"
    >
      <div className="p-[3px] rounded-full bg-gradient-to-br from-social-warm-300 to-social-warm-500">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-white p-[2px]">
          <div className="w-full h-full rounded-full bg-social-warm-50 flex items-center justify-center group-hover:bg-social-warm-100 transition-colors duration-200">
            <Plus className="w-6 h-6 text-social-warm-500" />
          </div>
        </div>
      </div>
      <span className="text-[11px] text-gray-600 font-medium">Your story</span>
    </button>
  );
}

export default function StoryCarousel({
  stories,
  onStoryClick,
  onCreateStory,
}: StoryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex items-start gap-3 overflow-x-auto pb-2 -mx-1 px-1"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Hide webkit scrollbar via inline style since Tailwind v3 lacks scrollbar-hide */}
        <style>{`
          [data-story-carousel]::-webkit-scrollbar { display: none; }
        `}</style>

        {onCreateStory && <CreateStoryButton onClick={onCreateStory} />}

        {stories.map((story) => (
          <StoryBubble
            key={story.id}
            story={story}
            onClick={() => onStoryClick(story)}
          />
        ))}

        {stories.length === 0 && !onCreateStory && (
          <p className="text-sm text-gray-400 py-4 px-2">No stories yet</p>
        )}
      </div>
    </div>
  );
}

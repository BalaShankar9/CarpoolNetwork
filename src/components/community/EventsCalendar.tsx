// Events Calendar Component
// Browse and register for community events
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Video,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Check,
  Loader2,
  Star,
  Sparkles,
  Coffee,
  Heart,
  Trophy,
  Megaphone,
} from 'lucide-react';
import { challengeService, CommunityEvent } from '@/services/challengeService';
import { useAuth } from '@/contexts/AuthContext';

type ViewMode = 'calendar' | 'list';

const EVENT_TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  meetup: Coffee,
  webinar: Video,
  workshop: Sparkles,
  charity: Heart,
  competition: Trophy,
  celebration: Star,
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  meetup: 'bg-blue-500',
  webinar: 'bg-purple-500',
  workshop: 'bg-amber-500',
  charity: 'bg-pink-500',
  competition: 'bg-orange-500',
  celebration: 'bg-emerald-500',
};

export function EventsCalendar() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'registered'>('upcoming');

  useEffect(() => {
    loadEvents();
    if (user) {
      loadRegistrations();
    }
  }, [user, filter]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const options =
        filter === 'upcoming'
          ? { upcoming: true }
          : filter === 'all'
          ? {}
          : { upcoming: true };
      const data = await challengeService.getEvents(options);
      setEvents(data);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRegistrations = async () => {
    if (!user) return;
    try {
      const ids = await challengeService.getUserRegisteredEvents(user.id);
      setRegisteredIds(new Set(ids));
    } catch {
      // Ignore
    }
  };

  const handleRegister = async (eventId: string) => {
    if (!user) return;
    try {
      await challengeService.registerForEvent(user.id, eventId);
      setRegisteredIds((prev) => new Set([...prev, eventId]));
      loadEvents();
    } catch (error) {
      console.error('Failed to register:', error);
    }
  };

  const handleUnregister = async (eventId: string) => {
    if (!user || !confirm('Cancel your registration?')) return;
    try {
      await challengeService.unregisterFromEvent(user.id, eventId);
      setRegisteredIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
      loadEvents();
    } catch (error) {
      console.error('Failed to unregister:', error);
    }
  };

  const filteredEvents =
    filter === 'registered'
      ? events.filter((e) => registeredIds.has(e.id))
      : events;

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-500" />
            Community Events
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Connect with fellow carpoolers at local and virtual events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${
              viewMode === 'list'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Megaphone className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`p-2 rounded-lg ${
              viewMode === 'calendar'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Calendar className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['upcoming', 'all', 'registered'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === f
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            {f === 'upcoming' ? 'Upcoming' : f === 'all' ? 'All Events' : 'My Events'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarView
          events={filteredEvents}
          registeredIds={registeredIds}
          currentMonth={currentMonth}
          onNavigate={navigateMonth}
          onSelectEvent={setSelectedEvent}
        />
      ) : (
        <ListView
          events={filteredEvents}
          registeredIds={registeredIds}
          onSelect={setSelectedEvent}
        />
      )}

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <EventDetail
            event={selectedEvent}
            isRegistered={registeredIds.has(selectedEvent.id)}
            onClose={() => setSelectedEvent(null)}
            onRegister={() => handleRegister(selectedEvent.id)}
            onUnregister={() => handleUnregister(selectedEvent.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ListView({
  events,
  registeredIds,
  onSelect,
}: {
  events: CommunityEvent[];
  registeredIds: Set<string>;
  onSelect: (event: CommunityEvent) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Events Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Check back soon for upcoming community events!
        </p>
      </div>
    );
  }

  // Group by month
  const grouped = events.reduce((acc, event) => {
    const monthKey = event.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(event);
    return acc;
  }, {} as Record<string, CommunityEvent[]>);

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([month, monthEvents]) => (
        <div key={month}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{month}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {monthEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isRegistered={registeredIds.has(event.id)}
                onClick={() => onSelect(event)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EventCard({
  event,
  isRegistered,
  onClick,
}: {
  event: CommunityEvent;
  isRegistered: boolean;
  onClick: () => void;
}) {
  const TypeIcon = EVENT_TYPE_ICONS[event.type] || Calendar;
  const bgColor = EVENT_TYPE_COLORS[event.type] || 'bg-gray-500';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer"
    >
      {event.imageUrl && (
        <div className="h-32 bg-gray-200 dark:bg-gray-700">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${bgColor} text-white`}>
            <TypeIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">
                {event.title}
              </h3>
              {isRegistered && (
                <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-medium">
                  <Check className="w-3 h-3" />
                  Going
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
              {event.description}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>
              {event.date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}{' '}
              at{' '}
              {event.date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {event.isOnline ? (
              <>
                <Video className="w-4 h-4" />
                <span>Online Event</span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                <span className="truncate">{event.location?.name || 'TBA'}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Users className="w-4 h-4" />
            <span>
              {event.attendees} attending
              {event.maxAttendees && ` / ${event.maxAttendees} max`}
            </span>
          </div>
        </div>

        {event.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {event.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function CalendarView({
  events,
  registeredIds,
  currentMonth,
  onNavigate,
  onSelectEvent,
}: {
  events: CommunityEvent[];
  registeredIds: Set<string>;
  currentMonth: Date;
  onNavigate: (direction: 'prev' | 'next') => void;
  onSelectEvent: (event: CommunityEvent) => void;
}) {
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    return { daysInMonth, startingDay };
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);

  const getEventsForDay = (day: number) => {
    return events.filter((event) => {
      const eventDate = event.date;
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentMonth.getMonth() &&
        eventDate.getFullYear() === currentMonth.getFullYear()
      );
    });
  };

  const days = [];
  for (let i = 0; i < startingDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Month Navigation */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
        <button
          onClick={() => onNavigate('prev')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <button
          onClick={() => onNavigate('next')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-gray-600 dark:text-gray-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayEvents = day ? getEventsForDay(day) : [];
          const isToday =
            day === new Date().getDate() &&
            currentMonth.getMonth() === new Date().getMonth() &&
            currentMonth.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={index}
              className={`min-h-[100px] p-1 border-b border-r border-gray-100 dark:border-gray-700 ${
                day ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50' : 'bg-gray-50 dark:bg-gray-800/50'
              }`}
            >
              {day && (
                <>
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 text-sm ${
                      isToday
                        ? 'bg-emerald-500 text-white rounded-full font-bold'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {day}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 2).map((event) => {
                      const bgColor = EVENT_TYPE_COLORS[event.type] || 'bg-gray-500';
                      return (
                        <button
                          key={event.id}
                          onClick={() => onSelectEvent(event)}
                          className={`w-full text-left px-1.5 py-0.5 ${bgColor} text-white text-xs rounded truncate`}
                        >
                          {event.title}
                        </button>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <p className="text-xs text-gray-500 px-1">+{dayEvents.length - 2} more</p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventDetail({
  event,
  isRegistered,
  onClose,
  onRegister,
  onUnregister,
}: {
  event: CommunityEvent;
  isRegistered: boolean;
  onClose: () => void;
  onRegister: () => void;
  onUnregister: () => void;
}) {
  const TypeIcon = EVENT_TYPE_ICONS[event.type] || Calendar;
  const bgColor = EVENT_TYPE_COLORS[event.type] || 'bg-gray-500';
  const isFull = event.maxAttendees ? event.attendees >= event.maxAttendees : false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        {event.imageUrl ? (
          <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className={`h-32 ${bgColor} relative flex items-center justify-center`}>
            <TypeIcon className="w-16 h-16 text-white/30" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Title & Type */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 ${bgColor} text-white text-xs font-medium rounded-full capitalize`}>
                {event.type}
              </span>
              {event.isOnline && (
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 text-xs font-medium rounded-full">
                  Online
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{event.title}</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{event.description}</p>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <Clock className="w-5 h-5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {event.date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-sm">
                  {event.date.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {event.endDate &&
                    ` - ${event.endDate.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}`}
                </p>
              </div>
            </div>

            {event.isOnline ? (
              event.onlineLink && (
                <a
                  href={event.onlineLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-emerald-600 hover:text-emerald-700"
                >
                  <Video className="w-5 h-5" />
                  <span className="font-medium">Join Online</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )
            ) : event.location ? (
              <div className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
                <MapPin className="w-5 h-5 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{event.location.name}</p>
                  <p className="text-sm">{event.location.address}</p>
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <Users className="w-5 h-5" />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {event.attendees} attending
                </span>
                {event.maxAttendees && (
                  <span className="text-sm"> / {event.maxAttendees} spots</span>
                )}
              </div>
            </div>
          </div>

          {/* Organizer */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            {event.organizer.avatar ? (
              <img
                src={event.organizer.avatar}
                alt={event.organizer.name}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Organized by</p>
              <p className="font-medium text-gray-900 dark:text-white">{event.organizer.name}</p>
            </div>
          </div>

          {/* Tags */}
          {event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Action Button */}
          {isRegistered ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-medium">
                <Check className="w-5 h-5" />
                You're going!
              </div>
              <button
                onClick={onUnregister}
                className="w-full py-2 text-red-500 hover:text-red-600 text-sm font-medium"
              >
                Cancel Registration
              </button>
            </div>
          ) : isFull ? (
            <div className="py-3 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-xl font-medium text-center">
              Event is Full
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onRegister}
              className={`w-full py-3 ${bgColor} text-white font-semibold rounded-xl`}
            >
              Register for Event
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default EventsCalendar;

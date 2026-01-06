import React, { useState, useEffect } from 'react';
import {
    Calendar,
    MapPin,
    Users,
    Clock,
    ExternalLink,
    ChevronRight,
    Sparkles,
    Car,
    TreePine
} from 'lucide-react';

interface LocalEvent {
    id: string;
    title: string;
    description: string;
    date: string;
    time?: string;
    location: string;
    type: 'meetup' | 'cleanup' | 'carpool_day' | 'workshop' | 'celebration';
    attendees?: number;
    maxAttendees?: number;
    link?: string;
    isVirtual?: boolean;
}

interface LocalEventsProps {
    className?: string;
}

// Sample events - in production these would come from a database
const SAMPLE_EVENTS: LocalEvent[] = [
    {
        id: '1',
        title: 'Community Carpool Day',
        description: 'Join fellow carpoolers for our monthly meetup! Share tips, meet new carpool partners, and enjoy refreshments.',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '10:00 AM',
        location: 'Central Park Pavilion',
        type: 'meetup',
        attendees: 24,
        maxAttendees: 50,
    },
    {
        id: '2',
        title: 'Green Commute Challenge',
        description: 'Week-long challenge! Carpool every day this week and earn special badges.',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        location: 'Online',
        type: 'carpool_day',
        isVirtual: true,
        attendees: 156,
    },
    {
        id: '3',
        title: 'Carpooling 101 Workshop',
        description: 'New to carpooling? Learn tips and tricks from experienced members.',
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '6:00 PM',
        location: 'Community Center, Room 4B',
        type: 'workshop',
        attendees: 12,
        maxAttendees: 30,
    },
];

export const LocalEvents: React.FC<LocalEventsProps> = ({ className = '' }) => {
    const [events, setEvents] = useState<LocalEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // In production, fetch from API/database
        setTimeout(() => {
            setEvents(SAMPLE_EVENTS);
            setIsLoading(false);
        }, 500);
    }, []);

    const getEventTypeConfig = (type: LocalEvent['type']) => {
        const configs = {
            meetup: { icon: Users, color: 'blue', label: 'Meetup' },
            cleanup: { icon: TreePine, color: 'green', label: 'Cleanup' },
            carpool_day: { icon: Car, color: 'purple', label: 'Challenge' },
            workshop: { icon: Sparkles, color: 'amber', label: 'Workshop' },
            celebration: { icon: Sparkles, color: 'pink', label: 'Celebration' },
        };
        return configs[type];
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 ${className}`}>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
                <div className="space-y-4">
                    {[1, 2].map(i => (
                        <div key={i} className="animate-pulse">
                            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    Upcoming Events
                </h3>
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    View All
                </button>
            </div>

            {events.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No upcoming events</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {events.map(event => {
                        const typeConfig = getEventTypeConfig(event.type);
                        const Icon = typeConfig.icon;

                        const colorClasses: Record<string, string> = {
                            blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                            green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                            purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                            amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
                            pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
                        };

                        return (
                            <div
                                key={event.id}
                                className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                            >
                                <div className="flex items-start gap-3">
                                    {/* Type Icon */}
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[typeConfig.color]}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="font-medium text-gray-900 dark:text-white">
                                                {event.title}
                                            </h4>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${colorClasses[typeConfig.color]}`}>
                                                {typeConfig.label}
                                            </span>
                                        </div>

                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                            {event.description}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(event.date)}
                                                {event.time && ` at ${event.time}`}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {event.location}
                                                {event.isVirtual && ' 🌐'}
                                            </span>
                                            {event.attendees !== undefined && (
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {event.attendees}
                                                    {event.maxAttendees && `/${event.maxAttendees}`} going
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// Mini version for sidebars
export const LocalEventsMini: React.FC<{ className?: string }> = ({ className = '' }) => {
    const nextEvent = SAMPLE_EVENTS[0];

    if (!nextEvent) return null;

    const typeConfig = {
        meetup: { icon: Users, color: 'blue' },
        cleanup: { icon: TreePine, color: 'green' },
        carpool_day: { icon: Car, color: 'purple' },
        workshop: { icon: Sparkles, color: 'amber' },
        celebration: { icon: Sparkles, color: 'pink' },
    }[nextEvent.type];

    const Icon = typeConfig.icon;

    return (
        <div className={`p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800 ${className}`}>
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                <Calendar className="w-3 h-3" />
                NEXT EVENT
            </div>
            <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white text-sm">
                    {nextEvent.title}
                </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {new Date(nextEvent.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {nextEvent.time && ` • ${nextEvent.time}`}
            </div>
        </div>
    );
};

export default LocalEvents;

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Circle, Clock, User, ChevronRight } from 'lucide-react';
import { Waypoint } from '@/services/multiStopRouteService';

interface RouteTimelineProps {
    waypoints: Waypoint[];
    passengers?: {
        waypointId: string;
        name: string;
        avatar?: string;
        action: 'pickup' | 'dropoff';
    }[];
    currentWaypointIndex?: number;
    showETAs?: boolean;
    compact?: boolean;
}

export function RouteTimeline({
    waypoints,
    passengers = [],
    currentWaypointIndex,
    showETAs = true,
    compact = false
}: RouteTimelineProps) {
    const getPassengersAtWaypoint = (waypointId: string) => {
        return passengers.filter(p => p.waypointId === waypointId);
    };

    const getStopIcon = (waypoint: Waypoint, index: number) => {
        const isFirst = index === 0;
        const isLast = index === waypoints.length - 1;
        const isCurrent = index === currentWaypointIndex;

        const baseClasses = 'w-8 h-8 rounded-full flex items-center justify-center';

        if (isFirst) {
            return (
                <div className={`${baseClasses} ${isCurrent ? 'bg-emerald-500' : 'bg-emerald-500/20'}`}>
                    <Navigation className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-emerald-400'}`} />
                </div>
            );
        }

        if (isLast) {
            return (
                <div className={`${baseClasses} ${isCurrent ? 'bg-red-500' : 'bg-red-500/20'}`}>
                    <MapPin className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-red-400'}`} />
                </div>
            );
        }

        return (
            <div className={`${baseClasses} ${isCurrent ? 'bg-blue-500' : 'bg-blue-500/20'}`}>
                <Circle className={`w-3 h-3 ${isCurrent ? 'text-white fill-white' : 'text-blue-400 fill-blue-400'}`} />
            </div>
        );
    };

    const getLineStatus = (index: number) => {
        if (currentWaypointIndex === undefined) return 'pending';
        if (index < currentWaypointIndex) return 'completed';
        return 'pending';
    };

    if (compact) {
        return (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {waypoints.map((wp, index) => (
                    <React.Fragment key={wp.id}>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {getStopIcon(wp, index)}
                            <span className="text-xs text-slate-400 max-w-20 truncate">
                                {wp.location.split(',')[0]}
                            </span>
                        </div>
                        {index < waypoints.length - 1 && (
                            <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    }

    return (
        <div className="relative">
            {waypoints.map((waypoint, index) => {
                const waypointPassengers = getPassengersAtWaypoint(waypoint.id);
                const lineStatus = getLineStatus(index);
                const isCompleted = currentWaypointIndex !== undefined && index < currentWaypointIndex;
                const isCurrent = index === currentWaypointIndex;

                return (
                    <div key={waypoint.id} className="relative">
                        {/* Connecting Line */}
                        {index < waypoints.length - 1 && (
                            <div className="absolute left-4 top-8 bottom-0 w-0.5">
                                <div
                                    className={`h-full transition-colors ${lineStatus === 'completed' ? 'bg-emerald-500' : 'bg-slate-700'
                                        }`}
                                />
                            </div>
                        )}

                        {/* Waypoint */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative flex gap-4 pb-6 ${isCurrent ? 'opacity-100' : isCompleted ? 'opacity-60' : 'opacity-100'
                                }`}
                        >
                            {/* Icon */}
                            <div className="flex-shrink-0 z-10">
                                {getStopIcon(waypoint, index)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 pt-0.5">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className={`font-medium ${isCurrent ? 'text-white' : 'text-slate-300'}`}>
                                            {waypoint.location}
                                        </h4>
                                        {waypoint.notes && (
                                            <p className="text-xs text-slate-500 mt-0.5">{waypoint.notes}</p>
                                        )}
                                    </div>

                                    {showETAs && waypoint.estimatedTime && (
                                        <div className="flex items-center gap-1 text-sm text-slate-400">
                                            <Clock className="w-3.5 h-3.5" />
                                            {waypoint.estimatedTime.toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Flexible Zone Indicator */}
                                {waypoint.flexibleRadius && waypoint.flexibleRadius > 0 && (
                                    <div className="mt-1 text-xs text-purple-400">
                                        ±{waypoint.flexibleRadius}m flexible pickup zone
                                    </div>
                                )}

                                {/* Passengers at this stop */}
                                {waypointPassengers.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {waypointPassengers.map((passenger, pIdx) => (
                                            <div
                                                key={pIdx}
                                                className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs ${passenger.action === 'pickup'
                                                        ? 'bg-emerald-500/20 text-emerald-400'
                                                        : 'bg-red-500/20 text-red-400'
                                                    }`}
                                            >
                                                {passenger.avatar ? (
                                                    <img
                                                        src={passenger.avatar}
                                                        alt={passenger.name}
                                                        className="w-4 h-4 rounded-full"
                                                    />
                                                ) : (
                                                    <User className="w-3 h-3" />
                                                )}
                                                {passenger.name}
                                                <span className="opacity-70">
                                                    ({passenger.action === 'pickup' ? 'getting in' : 'getting out'})
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                );
            })}
        </div>
    );
}

export default RouteTimeline;

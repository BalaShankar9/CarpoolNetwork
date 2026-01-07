import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
    MapPin, Plus, Trash2, GripVertical, Clock, Route,
    Zap, ChevronDown, ChevronUp, Navigation, Circle,
    AlertCircle
} from 'lucide-react';
import { multiStopRouteService, Waypoint, RouteOptimizationResult } from '@/services/multiStopRouteService';

interface WaypointEditorProps {
    initialWaypoints?: Waypoint[];
    onWaypointsChange: (waypoints: Waypoint[]) => void;
    departureTime?: Date;
    maxWaypoints?: number;
    showOptimization?: boolean;
}

export function WaypointEditor({
    initialWaypoints = [],
    onWaypointsChange,
    departureTime,
    maxWaypoints = 5,
    showOptimization = true
}: WaypointEditorProps) {
    const [waypoints, setWaypoints] = useState<Waypoint[]>(initialWaypoints);
    const [optimization, setOptimization] = useState<RouteOptimizationResult | null>(null);
    const [expanded, setExpanded] = useState(true);

    useEffect(() => {
        if (waypoints.length >= 3 && showOptimization) {
            const result = multiStopRouteService.optimizeRoute(waypoints);
            if (result.applied) {
                setOptimization(result);
            } else {
                setOptimization(null);
            }
        } else {
            setOptimization(null);
        }
    }, [waypoints, showOptimization]);

    const addWaypoint = () => {
        if (waypoints.length >= maxWaypoints) return;

        const newWaypoint: Waypoint = {
            id: multiStopRouteService.generateWaypointId(),
            location: '',
            lat: 0,
            lng: 0,
            order: waypoints.length,
            type: 'both'
        };

        const updated = [...waypoints, newWaypoint];
        setWaypoints(updated);
        onWaypointsChange(updated);
    };

    const removeWaypoint = (id: string) => {
        const updated = waypoints
            .filter(wp => wp.id !== id)
            .map((wp, idx) => ({ ...wp, order: idx }));
        setWaypoints(updated);
        onWaypointsChange(updated);
    };

    const updateWaypoint = (id: string, updates: Partial<Waypoint>) => {
        const updated = waypoints.map(wp =>
            wp.id === id ? { ...wp, ...updates } : wp
        );
        setWaypoints(updated);
        onWaypointsChange(updated);
    };

    const handleReorder = (reordered: Waypoint[]) => {
        const updated = reordered.map((wp, idx) => ({ ...wp, order: idx }));
        setWaypoints(updated);
        onWaypointsChange(updated);
    };

    const applyOptimization = () => {
        if (optimization?.optimizedRoute) {
            setWaypoints(optimization.optimizedRoute);
            onWaypointsChange(optimization.optimizedRoute);
            setOptimization(null);
        }
    };

    const totalDistance = multiStopRouteService.calculateRouteDistance(waypoints);
    const totalDuration = multiStopRouteService.estimateDuration(totalDistance);

    const waypointsWithETAs = departureTime
        ? multiStopRouteService.calculateWaypointETAs(waypoints, departureTime)
        : waypoints;

    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-4 flex items-center justify-between text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                        <Route className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Route Stops</h3>
                        <p className="text-sm text-slate-400">
                            {waypoints.length} stop{waypoints.length !== 1 ? 's' : ''} • {totalDistance} km • ~{totalDuration} min
                        </p>
                    </div>
                </div>
                {expanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 pt-0 space-y-4">
                            {/* Optimization Suggestion */}
                            {optimization && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Zap className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium text-emerald-300">Route Optimization Available</h4>
                                            <p className="text-sm text-emerald-400/80 mt-1">
                                                Save {optimization.distanceSaved} km ({optimization.timeSaved} min) by reordering stops
                                            </p>
                                        </div>
                                        <button
                                            onClick={applyOptimization}
                                            className="px-3 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Waypoint List */}
                            <Reorder.Group
                                axis="y"
                                values={waypoints}
                                onReorder={handleReorder}
                                className="space-y-2"
                            >
                                {waypointsWithETAs.map((waypoint, index) => (
                                    <WaypointItem
                                        key={waypoint.id}
                                        waypoint={waypoint}
                                        index={index}
                                        isFirst={index === 0}
                                        isLast={index === waypoints.length - 1}
                                        onUpdate={(updates) => updateWaypoint(waypoint.id, updates)}
                                        onRemove={() => removeWaypoint(waypoint.id)}
                                        canRemove={waypoints.length > 2}
                                        showETA={!!departureTime}
                                    />
                                ))}
                            </Reorder.Group>

                            {/* Add Stop Button */}
                            {waypoints.length < maxWaypoints && (
                                <button
                                    onClick={addWaypoint}
                                    className="w-full py-3 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-slate-500 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Stop
                                </button>
                            )}

                            {waypoints.length >= maxWaypoints && (
                                <div className="flex items-center gap-2 text-amber-400 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    Maximum {maxWaypoints} stops allowed
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface WaypointItemProps {
    waypoint: Waypoint;
    index: number;
    isFirst: boolean;
    isLast: boolean;
    onUpdate: (updates: Partial<Waypoint>) => void;
    onRemove: () => void;
    canRemove: boolean;
    showETA: boolean;
}

function WaypointItem({
    waypoint,
    index,
    isFirst,
    isLast,
    onUpdate,
    onRemove,
    canRemove,
    showETA
}: WaypointItemProps) {
    const [showOptions, setShowOptions] = useState(false);

    const getIcon = () => {
        if (isFirst) return <Navigation className="w-4 h-4 text-emerald-400" />;
        if (isLast) return <MapPin className="w-4 h-4 text-red-400" />;
        return <Circle className="w-3 h-3 text-blue-400 fill-blue-400" />;
    };

    const getLabel = () => {
        if (isFirst) return 'Start';
        if (isLast) return 'End';
        return `Stop ${index}`;
    };

    return (
        <Reorder.Item
            value={waypoint}
            className="bg-slate-700/50 rounded-xl overflow-hidden"
        >
            <div className="p-3 flex items-center gap-3">
                {/* Drag Handle */}
                <div className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300">
                    <GripVertical className="w-4 h-4" />
                </div>

                {/* Icon */}
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                    {getIcon()}
                </div>

                {/* Location Input */}
                <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-0.5">{getLabel()}</div>
                    <input
                        type="text"
                        value={waypoint.location}
                        onChange={(e) => onUpdate({ location: e.target.value })}
                        placeholder="Enter location..."
                        className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
                    />
                </div>

                {/* ETA */}
                {showETA && waypoint.estimatedTime && (
                    <div className="text-right">
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            {waypoint.estimatedTime.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                    </div>
                )}

                {/* Options Toggle */}
                <button
                    onClick={() => setShowOptions(!showOptions)}
                    className="p-1.5 text-slate-500 hover:text-white transition-colors"
                >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
                </button>

                {/* Remove Button */}
                {canRemove && !isFirst && !isLast && (
                    <button
                        onClick={onRemove}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Expanded Options */}
            <AnimatePresence>
                {showOptions && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-600/50"
                    >
                        <div className="p-3 space-y-3">
                            {/* Stop Type */}
                            <div>
                                <label className="text-xs text-slate-400 block mb-1.5">Stop Type</label>
                                <div className="flex gap-2">
                                    {(['pickup', 'dropoff', 'both'] as const).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => onUpdate({ type })}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${waypoint.type === type
                                                    ? 'bg-purple-500 text-white'
                                                    : 'bg-slate-700 text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            {type === 'both' ? 'Both' : type.charAt(0).toUpperCase() + type.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Flexible Radius */}
                            <div>
                                <label className="text-xs text-slate-400 block mb-1.5">
                                    Flexible Pickup Radius: {waypoint.flexibleRadius || 0}m
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1000"
                                    step="100"
                                    value={waypoint.flexibleRadius || 0}
                                    onChange={(e) => onUpdate({ flexibleRadius: parseInt(e.target.value) })}
                                    className="w-full accent-purple-500"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>Exact</span>
                                    <span>1km</span>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-xs text-slate-400 block mb-1.5">Notes (optional)</label>
                                <input
                                    type="text"
                                    value={waypoint.notes || ''}
                                    onChange={(e) => onUpdate({ notes: e.target.value })}
                                    placeholder="e.g., Near the coffee shop..."
                                    className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Reorder.Item>
    );
}

export default WaypointEditor;

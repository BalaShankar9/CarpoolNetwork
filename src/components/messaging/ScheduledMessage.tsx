import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar, Send, X, ChevronDown, Check } from 'lucide-react';

interface ScheduledMessageProps {
    message: string;
    recipientName: string;
    onSchedule: (scheduledTime: Date) => void;
    onCancel: () => void;
}

export function ScheduledMessage({
    message,
    recipientName,
    onSchedule,
    onCancel
}: ScheduledMessageProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTime, setSelectedTime] = useState('09:00');
    const [showQuickOptions, setShowQuickOptions] = useState(true);

    const quickOptions = [
        { label: 'In 1 hour', getTime: () => new Date(Date.now() + 60 * 60 * 1000) },
        {
            label: 'Tomorrow morning', getTime: () => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                d.setHours(9, 0, 0, 0);
                return d;
            }
        },
        {
            label: 'Tomorrow evening', getTime: () => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                d.setHours(18, 0, 0, 0);
                return d;
            }
        },
        {
            label: 'This weekend', getTime: () => {
                const d = new Date();
                const daysUntilSaturday = (6 - d.getDay() + 7) % 7 || 7;
                d.setDate(d.getDate() + daysUntilSaturday);
                d.setHours(10, 0, 0, 0);
                return d;
            }
        },
    ];

    const handleQuickOption = (getTime: () => Date) => {
        const scheduledTime = getTime();
        onSchedule(scheduledTime);
    };

    const handleCustomSchedule = () => {
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const scheduledTime = new Date(selectedDate);
        scheduledTime.setHours(hours, minutes, 0, 0);

        if (scheduledTime <= new Date()) {
            alert('Please select a future time');
            return;
        }

        onSchedule(scheduledTime);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Generate date options for next 7 days
    const dateOptions = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return date;
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
        >
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Clock className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="font-medium text-white">Schedule Message</h3>
                        <p className="text-sm text-slate-400">To {recipientName}</p>
                    </div>
                </div>
                <button
                    onClick={onCancel}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5 text-slate-400" />
                </button>
            </div>

            {/* Message Preview */}
            <div className="p-4 bg-slate-900/50">
                <p className="text-sm text-slate-300 line-clamp-2">"{message}"</p>
            </div>

            {/* Quick Options */}
            <div className="p-4 border-b border-slate-700">
                <button
                    onClick={() => setShowQuickOptions(!showQuickOptions)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3"
                >
                    <span>Quick options</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showQuickOptions ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                    {showQuickOptions && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="grid grid-cols-2 gap-2"
                        >
                            {quickOptions.map((option) => (
                                <button
                                    key={option.label}
                                    onClick={() => handleQuickOption(option.getTime)}
                                    className="p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-left transition-colors group"
                                >
                                    <span className="text-sm text-white group-hover:text-purple-400 transition-colors">
                                        {option.label}
                                    </span>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {formatDate(option.getTime())} at {formatTime(option.getTime())}
                                    </p>
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Custom Time */}
            <div className="p-4">
                <h4 className="text-sm font-medium text-slate-300 mb-3">Or choose custom time</h4>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Date Selector */}
                    <div>
                        <label className="text-xs text-slate-400 block mb-1.5">Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                value={selectedDate.toDateString()}
                                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                                className="w-full pl-10 pr-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                            >
                                {dateOptions.map((date) => (
                                    <option key={date.toDateString()} value={date.toDateString()}>
                                        {formatDate(date)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Time Selector */}
                    <div>
                        <label className="text-xs text-slate-400 block mb-1.5">Time</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="time"
                                value={selectedTime}
                                onChange={(e) => setSelectedTime(e.target.value)}
                                className="w-full pl-10 pr-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Schedule Button */}
                <button
                    onClick={handleCustomSchedule}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                    <Send className="w-4 h-4" />
                    Schedule Message
                </button>
            </div>
        </motion.div>
    );
}

// Display component for scheduled messages list
interface ScheduledMessageItemProps {
    id: string;
    message: string;
    recipientName: string;
    scheduledTime: Date;
    onCancel: (id: string) => void;
    onSendNow: (id: string) => void;
}

export function ScheduledMessageItem({
    id,
    message,
    recipientName,
    scheduledTime,
    onCancel,
    onSendNow
}: ScheduledMessageItemProps) {
    const formatDateTime = (date: Date) => {
        return date.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTimeUntil = (date: Date) => {
        const diff = date.getTime() - Date.now();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `in ${days} day${days > 1 ? 's' : ''}`;
        }
        if (hours > 0) {
            return `in ${hours}h ${minutes}m`;
        }
        return `in ${minutes}m`;
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-white">To {recipientName}</span>
                </div>
                <span className="text-xs text-purple-400">{getTimeUntil(scheduledTime)}</span>
            </div>

            <p className="text-sm text-slate-300 mb-2 line-clamp-2">{message}</p>

            <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{formatDateTime(scheduledTime)}</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onSendNow(id)}
                        className="px-3 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                    >
                        Send Now
                    </button>
                    <button
                        onClick={() => onCancel(id)}
                        className="px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

export default ScheduledMessage;

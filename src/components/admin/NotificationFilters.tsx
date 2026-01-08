import { useState } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

export interface NotificationFiltersType {
    search: string;
    type: string;
    status: string;
    priority: string;
    dateFrom: string;
    dateTo: string;
}

export const DEFAULT_NOTIFICATION_FILTERS: NotificationFiltersType = {
    search: '',
    type: '',
    status: '',
    priority: '',
    dateFrom: '',
    dateTo: '',
};

interface NotificationFiltersProps {
    filters: NotificationFiltersType;
    onChange: (filters: NotificationFiltersType) => void;
    onClear: () => void;
    isExpanded: boolean;
    onToggle: () => void;
}

const NOTIFICATION_TYPES = [
    { value: 'info', label: 'Info' },
    { value: 'success', label: 'Success' },
    { value: 'warning', label: 'Warning' },
    { value: 'error', label: 'Error' },
    { value: 'booking', label: 'Booking' },
    { value: 'ride', label: 'Ride' },
    { value: 'message', label: 'Message' },
    { value: 'safety', label: 'Safety' },
    { value: 'community', label: 'Community' },
];

const PRIORITIES = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

export default function NotificationFilters({
    filters,
    onChange,
    onClear,
    isExpanded,
    onToggle,
}: NotificationFiltersProps) {
    const activeFilterCount = Object.entries(filters).filter(
        ([key, value]) => value && key !== 'search'
    ).length;

    const handleChange = (key: keyof NotificationFiltersType, value: string) => {
        onChange({ ...filters, [key]: value });
    };

    return (
        <div className="border-b border-gray-200">
            {/* Search Bar */}
            <div className="px-4 py-3 flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => handleChange('search', e.target.value)}
                        placeholder="Search notifications by title, body, or user..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                </div>
                <button
                    onClick={onToggle}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${isExpanded || activeFilterCount > 0
                            ? 'border-blue-300 bg-blue-50 text-blue-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    <Filter className="w-4 h-4" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                            {activeFilterCount}
                        </span>
                    )}
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Expanded Filters */}
            {isExpanded && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Type */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                            <select
                                value={filters.type}
                                onChange={(e) => handleChange('type', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Types</option>
                                {NOTIFICATION_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => handleChange('status', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Status</option>
                                <option value="read">Read</option>
                                <option value="unread">Unread</option>
                            </select>
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                            <select
                                value={filters.priority}
                                onChange={(e) => handleChange('priority', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Priorities</option>
                                {PRIORITIES.map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date From */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => handleChange('dateFrom', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Date To */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => handleChange('dateTo', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Clear Button */}
                    {activeFilterCount > 0 && (
                        <div className="mt-3 flex justify-end">
                            <button
                                onClick={onClear}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Clear all filters
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Active Filter Chips */}
            {!isExpanded && activeFilterCount > 0 && (
                <div className="px-4 pb-3 flex flex-wrap gap-2">
                    {filters.type && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            Type: {filters.type}
                            <button onClick={() => handleChange('type', '')}>
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}
                    {filters.status && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            Status: {filters.status}
                            <button onClick={() => handleChange('status', '')}>
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}
                    {filters.priority && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            Priority: {filters.priority}
                            <button onClick={() => handleChange('priority', '')}>
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}
                    {(filters.dateFrom || filters.dateTo) && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            <Calendar className="w-3 h-3" />
                            {filters.dateFrom && filters.dateTo
                                ? `${filters.dateFrom} - ${filters.dateTo}`
                                : filters.dateFrom
                                    ? `From ${filters.dateFrom}`
                                    : `Until ${filters.dateTo}`}
                            <button
                                onClick={() => {
                                    handleChange('dateFrom', '');
                                    handleChange('dateTo', '');
                                }}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

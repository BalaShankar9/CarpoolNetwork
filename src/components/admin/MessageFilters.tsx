import { useState } from 'react';
import {
    Filter,
    X,
    Search,
    Calendar,
    Flag,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

export interface MessageFiltersType {
    search: string;
    dateFrom: string;
    dateTo: string;
    hasFlags: 'all' | 'yes' | 'no';
    flagType: string;
    flagStatus: string;
}

export const DEFAULT_MESSAGE_FILTERS: MessageFiltersType = {
    search: '',
    dateFrom: '',
    dateTo: '',
    hasFlags: 'all',
    flagType: 'all',
    flagStatus: 'pending',
};

interface MessageFiltersProps {
    filters: MessageFiltersType;
    onChange: (filters: MessageFiltersType) => void;
    onClear: () => void;
    isExpanded: boolean;
    onToggle: () => void;
    showFlagFilters?: boolean;
}

export default function MessageFilters({
    filters,
    onChange,
    onClear,
    isExpanded,
    onToggle,
    showFlagFilters = false,
}: MessageFiltersProps) {
    const handleChange = (field: keyof MessageFiltersType, value: string) => {
        onChange({ ...filters, [field]: value });
    };

    const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
        if (key === 'hasFlags' && value === 'all') return false;
        if (key === 'flagType' && value === 'all') return false;
        if (key === 'flagStatus' && value === 'pending' && !showFlagFilters) return false;
        return value !== '' && value !== DEFAULT_MESSAGE_FILTERS[key as keyof MessageFiltersType];
    }).length;

    const flagTypes = [
        { value: 'all', label: 'All Types' },
        { value: 'spam', label: 'Spam' },
        { value: 'harassment', label: 'Harassment' },
        { value: 'inappropriate', label: 'Inappropriate' },
        { value: 'scam', label: 'Scam' },
        { value: 'other', label: 'Other' },
    ];

    const flagStatuses = [
        { value: 'all', label: 'All Statuses' },
        { value: 'pending', label: 'Pending' },
        { value: 'reviewed', label: 'Reviewed' },
        { value: 'dismissed', label: 'Dismissed' },
        { value: 'actioned', label: 'Actioned' },
    ];

    return (
        <div className="bg-white rounded-xl border border-gray-200 mb-4">
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl"
            >
                <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-500" />
                    <span className="font-medium text-gray-700">Advanced Filters</span>
                    {activeFilterCount > 0 && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            {activeFilterCount} active
                        </span>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
            </button>

            {/* Filters Panel */}
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                        {/* Search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Search Users
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => handleChange('search', e.target.value)}
                                    placeholder="Name or email..."
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                            </div>
                        </div>

                        {/* Date From */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date From
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => handleChange('dateFrom', e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                            </div>
                        </div>

                        {/* Date To */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date To
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) => handleChange('dateTo', e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                            </div>
                        </div>

                        {/* Has Flags */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Flagged Messages
                            </label>
                            <div className="relative">
                                <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select
                                    value={filters.hasFlags}
                                    onChange={(e) => handleChange('hasFlags', e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none"
                                >
                                    <option value="all">All Conversations</option>
                                    <option value="yes">Has Flags</option>
                                    <option value="no">No Flags</option>
                                </select>
                            </div>
                        </div>

                        {/* Flag Type (conditional) */}
                        {showFlagFilters && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Flag Type
                                </label>
                                <select
                                    value={filters.flagType}
                                    onChange={(e) => handleChange('flagType', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                >
                                    {flagTypes.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Flag Status (conditional) */}
                        {showFlagFilters && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Flag Status
                                </label>
                                <select
                                    value={filters.flagStatus}
                                    onChange={(e) => handleChange('flagStatus', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                >
                                    {flagStatuses.map((status) => (
                                        <option key={status.value} value={status.value}>
                                            {status.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Active Filters & Clear */}
                    {activeFilterCount > 0 && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                            <span className="text-sm text-gray-500">Active:</span>
                            <div className="flex flex-wrap gap-2">
                                {filters.search && (
                                    <FilterChip
                                        label={`Search: "${filters.search}"`}
                                        onRemove={() => handleChange('search', '')}
                                    />
                                )}
                                {filters.dateFrom && (
                                    <FilterChip
                                        label={`From: ${filters.dateFrom}`}
                                        onRemove={() => handleChange('dateFrom', '')}
                                    />
                                )}
                                {filters.dateTo && (
                                    <FilterChip
                                        label={`To: ${filters.dateTo}`}
                                        onRemove={() => handleChange('dateTo', '')}
                                    />
                                )}
                                {filters.hasFlags !== 'all' && (
                                    <FilterChip
                                        label={filters.hasFlags === 'yes' ? 'Has Flags' : 'No Flags'}
                                        onRemove={() => handleChange('hasFlags', 'all')}
                                    />
                                )}
                                {showFlagFilters && filters.flagType !== 'all' && (
                                    <FilterChip
                                        label={`Type: ${filters.flagType}`}
                                        onRemove={() => handleChange('flagType', 'all')}
                                    />
                                )}
                            </div>
                            <button
                                onClick={onClear}
                                className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                                Clear All
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
            {label}
            <button onClick={onRemove} className="hover:text-blue-900">
                <X className="w-3 h-3" />
            </button>
        </span>
    );
}

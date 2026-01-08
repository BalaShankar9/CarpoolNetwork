import { useState } from 'react';
import { ChevronDown, ChevronUp, X, Filter, Search } from 'lucide-react';

export interface PostFiltersType {
    search: string;
    category: string;
    hasFlags: 'all' | 'yes' | 'no';
    isPinned: 'all' | 'yes' | 'no';
    isLocked: 'all' | 'yes' | 'no';
    isHidden: 'all' | 'yes' | 'no';
    flagStatus: string;
}

export const DEFAULT_POST_FILTERS: PostFiltersType = {
    search: '',
    category: '',
    hasFlags: 'all',
    isPinned: 'all',
    isLocked: 'all',
    isHidden: 'all',
    flagStatus: 'pending',
};

interface PostFiltersProps {
    filters: PostFiltersType;
    onChange: (filters: PostFiltersType) => void;
    onClear: () => void;
    isExpanded: boolean;
    onToggle: () => void;
    showFlagFilters?: boolean;
    categories?: string[];
}

export default function PostFilters({
    filters,
    onChange,
    onClear,
    isExpanded,
    onToggle,
    showFlagFilters = false,
    categories = ['general', 'tips', 'routes', 'events', 'feedback', 'other'],
}: PostFiltersProps) {
    const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
        if (key === 'search') return value !== '';
        if (key === 'category') return value !== '';
        if (key === 'flagStatus') return value !== 'pending';
        return value !== 'all';
    }).length;

    const updateFilter = <K extends keyof PostFiltersType>(key: K, value: PostFiltersType[K]) => {
        onChange({ ...filters, [key]: value });
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 mb-4">
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl"
            >
                <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-900">Filters</span>
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

            {/* Expanded Filters */}
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                        {/* Search */}
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => updateFilter('search', e.target.value)}
                                    placeholder="Search posts by title or content..."
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select
                                value={filters.category}
                                onChange={(e) => updateFilter('category', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All categories</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Has Flags */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Has Flags</label>
                            <select
                                value={filters.hasFlags}
                                onChange={(e) => updateFilter('hasFlags', e.target.value as 'all' | 'yes' | 'no')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All posts</option>
                                <option value="yes">Flagged only</option>
                                <option value="no">No flags</option>
                            </select>
                        </div>

                        {/* Is Pinned */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pinned</label>
                            <select
                                value={filters.isPinned}
                                onChange={(e) => updateFilter('isPinned', e.target.value as 'all' | 'yes' | 'no')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All</option>
                                <option value="yes">Pinned only</option>
                                <option value="no">Not pinned</option>
                            </select>
                        </div>

                        {/* Is Locked */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Locked</label>
                            <select
                                value={filters.isLocked}
                                onChange={(e) => updateFilter('isLocked', e.target.value as 'all' | 'yes' | 'no')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All</option>
                                <option value="yes">Locked only</option>
                                <option value="no">Not locked</option>
                            </select>
                        </div>

                        {/* Is Hidden */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hidden</label>
                            <select
                                value={filters.isHidden}
                                onChange={(e) => updateFilter('isHidden', e.target.value as 'all' | 'yes' | 'no')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All</option>
                                <option value="yes">Hidden only</option>
                                <option value="no">Visible only</option>
                            </select>
                        </div>

                        {/* Flag Status (for flagged posts tab) */}
                        {showFlagFilters && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Flag Status</label>
                                <select
                                    value={filters.flagStatus}
                                    onChange={(e) => updateFilter('flagStatus', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="reviewed">Reviewed</option>
                                    <option value="dismissed">Dismissed</option>
                                    <option value="actioned">Actioned</option>
                                    <option value="all">All statuses</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Clear Filters */}
                    {activeFilterCount > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={onClear}
                                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-4 h-4" />
                                Clear all filters
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Active Filter Chips (shown when collapsed) */}
            {!isExpanded && activeFilterCount > 0 && (
                <div className="px-4 pb-3 flex flex-wrap gap-2">
                    {filters.search && (
                        <FilterChip label={`Search: ${filters.search}`} onRemove={() => updateFilter('search', '')} />
                    )}
                    {filters.category && (
                        <FilterChip label={`Category: ${filters.category}`} onRemove={() => updateFilter('category', '')} />
                    )}
                    {filters.hasFlags !== 'all' && (
                        <FilterChip
                            label={filters.hasFlags === 'yes' ? 'Has flags' : 'No flags'}
                            onRemove={() => updateFilter('hasFlags', 'all')}
                        />
                    )}
                    {filters.isPinned !== 'all' && (
                        <FilterChip
                            label={filters.isPinned === 'yes' ? 'Pinned' : 'Not pinned'}
                            onRemove={() => updateFilter('isPinned', 'all')}
                        />
                    )}
                    {filters.isLocked !== 'all' && (
                        <FilterChip
                            label={filters.isLocked === 'yes' ? 'Locked' : 'Not locked'}
                            onRemove={() => updateFilter('isLocked', 'all')}
                        />
                    )}
                    {filters.isHidden !== 'all' && (
                        <FilterChip
                            label={filters.isHidden === 'yes' ? 'Hidden' : 'Visible'}
                            onRemove={() => updateFilter('isHidden', 'all')}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
            {label}
            <button onClick={onRemove} className="hover:text-gray-900">
                <X className="w-3 h-3" />
            </button>
        </span>
    );
}

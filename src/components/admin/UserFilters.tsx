import { useState } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

export interface UserFilterValues {
    search: string;
    status: string;
    verifiedOnly: boolean | null;
    flaggedOnly: boolean;
    hasWarnings: boolean | null;
    minTrustScore: number | null;
    maxTrustScore: number | null;
    joinedFrom: string;
    joinedTo: string;
    lastActiveFrom: string;
    lastActiveTo: string;
    sortBy: string;
    sortOrder: string;
}

interface UserFiltersProps {
    filters: UserFilterValues;
    onChange: (filters: UserFilterValues) => void;
    onClear: () => void;
    isExpanded: boolean;
    onToggle: () => void;
}

const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'banned', label: 'Banned' },
    { value: 'restricted', label: 'Restricted' },
    { value: 'pending_verification', label: 'Pending Verification' },
    { value: 'deactivated', label: 'Deactivated' },
];

const sortOptions = [
    { value: 'created_at', label: 'Join Date' },
    { value: 'last_active_at', label: 'Last Active' },
    { value: 'full_name', label: 'Name' },
    { value: 'trust_score', label: 'Trust Score' },
    { value: 'warning_count', label: 'Warning Count' },
];

export function UserFilters({ filters, onChange, onClear, isExpanded, onToggle }: UserFiltersProps) {
    const updateFilter = <K extends keyof UserFilterValues>(key: K, value: UserFilterValues[K]) => {
        onChange({ ...filters, [key]: value });
    };

    const hasActiveFilters =
        filters.search ||
        filters.status ||
        filters.verifiedOnly !== null ||
        filters.flaggedOnly ||
        filters.hasWarnings !== null ||
        filters.minTrustScore !== null ||
        filters.maxTrustScore !== null ||
        filters.joinedFrom ||
        filters.joinedTo ||
        filters.lastActiveFrom ||
        filters.lastActiveTo;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            {/* Search Bar and Toggle */}
            <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={filters.search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <button
                    onClick={onToggle}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <Filter className="w-5 h-5" />
                    <span>Filters</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {hasActiveFilters && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                </button>

                {hasActiveFilters && (
                    <button
                        onClick={onClear}
                        className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                        Clear
                    </button>
                )}
            </div>

            {/* Expanded Filters */}
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    {/* Row 1: Status, Verification, Flags */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Account Status
                            </label>
                            <select
                                value={filters.status}
                                onChange={(e) => updateFilter('status', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                {statusOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Verification
                            </label>
                            <select
                                value={filters.verifiedOnly === null ? '' : filters.verifiedOnly ? 'verified' : 'unverified'}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    updateFilter('verifiedOnly', val === '' ? null : val === 'verified');
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">All Users</option>
                                <option value="verified">Verified Only</option>
                                <option value="unverified">Unverified Only</option>
                            </select>
                        </div>

                        <div className="flex items-end gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.flaggedOnly}
                                    onChange={(e) => updateFilter('flaggedOnly', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Flagged Only</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.hasWarnings === true}
                                    onChange={(e) => updateFilter('hasWarnings', e.target.checked ? true : null)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Has Warnings</span>
                            </label>
                        </div>
                    </div>

                    {/* Row 2: Trust Score */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Trust Score Range
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="Min"
                                    value={filters.minTrustScore ?? ''}
                                    onChange={(e) => updateFilter('minTrustScore', e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <span className="text-gray-500">to</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="Max"
                                    value={filters.maxTrustScore ?? ''}
                                    onChange={(e) => updateFilter('maxTrustScore', e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Sort By
                            </label>
                            <div className="flex gap-2">
                                <select
                                    value={filters.sortBy}
                                    onChange={(e) => updateFilter('sortBy', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    {sortOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <select
                                    value={filters.sortOrder}
                                    onChange={(e) => updateFilter('sortOrder', e.target.value)}
                                    className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="desc">Newest</option>
                                    <option value="asc">Oldest</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Date Ranges */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                Join Date Range
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={filters.joinedFrom}
                                    onChange={(e) => updateFilter('joinedFrom', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <span className="text-gray-500">to</span>
                                <input
                                    type="date"
                                    value={filters.joinedTo}
                                    onChange={(e) => updateFilter('joinedTo', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                Last Active Range
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={filters.lastActiveFrom}
                                    onChange={(e) => updateFilter('lastActiveFrom', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <span className="text-gray-500">to</span>
                                <input
                                    type="date"
                                    value={filters.lastActiveTo}
                                    onChange={(e) => updateFilter('lastActiveTo', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export const defaultUserFilters: UserFilterValues = {
    search: '',
    status: '',
    verifiedOnly: null,
    flaggedOnly: false,
    hasWarnings: null,
    minTrustScore: null,
    maxTrustScore: null,
    joinedFrom: '',
    joinedTo: '',
    lastActiveFrom: '',
    lastActiveTo: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
};

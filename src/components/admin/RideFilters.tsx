import { useState } from 'react';
import {
    Filter,
    X,
    ChevronDown,
    ChevronUp,
    Calendar,
    MapPin,
    Users,
    DollarSign,
    Search,
} from 'lucide-react';

export interface RideFiltersType {
    // CANONICAL ride states: active, in-progress, completed, cancelled
    status: 'all' | 'active' | 'completed' | 'cancelled' | 'in-progress';
    dateFrom: string;
    dateTo: string;
    driverSearch: string;
    originSearch: string;
    destinationSearch: string;
    minSeats: string;
    maxSeats: string;
    minPrice: string;
    maxPrice: string;
    hasBookings: 'all' | 'yes' | 'no';
    isRecurring: 'all' | 'yes' | 'no';
}

interface RideFiltersProps {
    filters: RideFiltersType;
    onChange: (filters: RideFiltersType) => void;
    onClear: () => void;
    isExpanded: boolean;
    onToggle: () => void;
}

export const DEFAULT_RIDE_FILTERS: RideFiltersType = {
    status: 'all',
    dateFrom: '',
    dateTo: '',
    driverSearch: '',
    originSearch: '',
    destinationSearch: '',
    minSeats: '',
    maxSeats: '',
    minPrice: '',
    maxPrice: '',
    hasBookings: 'all',
    isRecurring: 'all',
};

export default function RideFilters({
    filters,
    onChange,
    onClear,
    isExpanded,
    onToggle,
}: RideFiltersProps) {
    const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
        if (key === 'status' && value === 'all') return false;
        if (key === 'hasBookings' && value === 'all') return false;
        if (key === 'isRecurring' && value === 'all') return false;
        return value !== '' && value !== 'all';
    }).length;

    const updateFilter = <K extends keyof RideFiltersType>(
        key: K,
        value: RideFiltersType[K]
    ) => {
        onChange({ ...filters, [key]: value });
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-900">Filters</span>
                    {activeFilterCount > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                            {activeFilterCount} active
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {activeFilterCount > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClear();
                            }}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Clear all
                        </button>
                    )}
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                </div>
            </button>

            {/* Filter Content */}
            {isExpanded && (
                <div className="border-t border-gray-200 p-4 space-y-4">
                    {/* Row 1: Status, Date Range */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={filters.status}
                                onChange={(e) => updateFilter('status', e.target.value as RideFiltersType['status'])}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        {/* Date From */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                From Date
                            </label>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>

                        {/* Date To */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                To Date
                            </label>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => updateFilter('dateTo', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>

                        {/* Driver Search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Search className="w-4 h-4 inline mr-1" />
                                Driver
                            </label>
                            <input
                                type="text"
                                value={filters.driverSearch}
                                onChange={(e) => updateFilter('driverSearch', e.target.value)}
                                placeholder="Search by name or email..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>
                    </div>

                    {/* Row 2: Route Search */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Origin */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <MapPin className="w-4 h-4 inline mr-1 text-green-500" />
                                Origin
                            </label>
                            <input
                                type="text"
                                value={filters.originSearch}
                                onChange={(e) => updateFilter('originSearch', e.target.value)}
                                placeholder="Search origin location..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>

                        {/* Destination */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <MapPin className="w-4 h-4 inline mr-1 text-red-500" />
                                Destination
                            </label>
                            <input
                                type="text"
                                value={filters.destinationSearch}
                                onChange={(e) => updateFilter('destinationSearch', e.target.value)}
                                placeholder="Search destination..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>
                    </div>

                    {/* Row 3: Seats, Price, Toggles */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        {/* Min Seats */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Users className="w-4 h-4 inline mr-1" />
                                Min Seats
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                value={filters.minSeats}
                                onChange={(e) => updateFilter('minSeats', e.target.value)}
                                placeholder="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>

                        {/* Max Seats */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max Seats
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                value={filters.maxSeats}
                                onChange={(e) => updateFilter('maxSeats', e.target.value)}
                                placeholder="10"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>

                        {/* Min Price */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <DollarSign className="w-4 h-4 inline mr-1" />
                                Min Price
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={filters.minPrice}
                                onChange={(e) => updateFilter('minPrice', e.target.value)}
                                placeholder="£0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>

                        {/* Max Price */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max Price
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={filters.maxPrice}
                                onChange={(e) => updateFilter('maxPrice', e.target.value)}
                                placeholder="£999"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>

                        {/* Has Bookings */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Has Bookings
                            </label>
                            <select
                                value={filters.hasBookings}
                                onChange={(e) => updateFilter('hasBookings', e.target.value as RideFiltersType['hasBookings'])}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                                <option value="all">All</option>
                                <option value="yes">With Bookings</option>
                                <option value="no">No Bookings</option>
                            </select>
                        </div>

                        {/* Is Recurring */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Recurring
                            </label>
                            <select
                                value={filters.isRecurring}
                                onChange={(e) => updateFilter('isRecurring', e.target.value as RideFiltersType['isRecurring'])}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                                <option value="all">All</option>
                                <option value="yes">Recurring Only</option>
                                <option value="no">One-time Only</option>
                            </select>
                        </div>
                    </div>

                    {/* Active Filters Summary */}
                    {activeFilterCount > 0 && (
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                            {filters.status !== 'all' && (
                                <FilterChip
                                    label={`Status: ${filters.status}`}
                                    onRemove={() => updateFilter('status', 'all')}
                                />
                            )}
                            {filters.dateFrom && (
                                <FilterChip
                                    label={`From: ${filters.dateFrom}`}
                                    onRemove={() => updateFilter('dateFrom', '')}
                                />
                            )}
                            {filters.dateTo && (
                                <FilterChip
                                    label={`To: ${filters.dateTo}`}
                                    onRemove={() => updateFilter('dateTo', '')}
                                />
                            )}
                            {filters.driverSearch && (
                                <FilterChip
                                    label={`Driver: ${filters.driverSearch}`}
                                    onRemove={() => updateFilter('driverSearch', '')}
                                />
                            )}
                            {filters.originSearch && (
                                <FilterChip
                                    label={`Origin: ${filters.originSearch}`}
                                    onRemove={() => updateFilter('originSearch', '')}
                                />
                            )}
                            {filters.destinationSearch && (
                                <FilterChip
                                    label={`Dest: ${filters.destinationSearch}`}
                                    onRemove={() => updateFilter('destinationSearch', '')}
                                />
                            )}
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
            <button
                onClick={onRemove}
                className="hover:bg-blue-100 rounded-full p-0.5"
            >
                <X className="w-3 h-3" />
            </button>
        </span>
    );
}

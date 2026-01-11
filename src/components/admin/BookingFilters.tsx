import { useState } from 'react';
import {
    Filter,
    X,
    ChevronDown,
    ChevronUp,
    Calendar,
    Search,
    Users,
    AlertTriangle,
} from 'lucide-react';

export interface BookingFiltersType {
    // CANONICAL booking states only - 'declined' is display-only
    status: 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';
    passengerSearch: string;
    driverSearch: string;
    rideSearch: string;
    dateFrom: string;
    dateTo: string;
    seatsMin: string;
    seatsMax: string;
    isLastMinute: 'all' | 'yes' | 'no';
    hasDispute: 'all' | 'yes' | 'no';
}

interface BookingFiltersProps {
    filters: BookingFiltersType;
    onChange: (filters: BookingFiltersType) => void;
    onClear: () => void;
    isExpanded: boolean;
    onToggle: () => void;
}

export const DEFAULT_BOOKING_FILTERS: BookingFiltersType = {
    status: 'all',
    passengerSearch: '',
    driverSearch: '',
    rideSearch: '',
    dateFrom: '',
    dateTo: '',
    seatsMin: '',
    seatsMax: '',
    isLastMinute: 'all',
    hasDispute: 'all',
};

export default function BookingFilters({
    filters,
    onChange,
    onClear,
    isExpanded,
    onToggle,
}: BookingFiltersProps) {
    const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
        if (key === 'status' && value === 'all') return false;
        if (key === 'isLastMinute' && value === 'all') return false;
        if (key === 'hasDispute' && value === 'all') return false;
        return value !== '' && value !== 'all';
    }).length;

    const updateFilter = <K extends keyof BookingFiltersType>(
        key: K,
        value: BookingFiltersType[K]
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
                    {/* Row 1: Status, Passenger, Driver, Ride */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={filters.status}
                                onChange={(e) => updateFilter('status', e.target.value as BookingFiltersType['status'])}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                                <option value="all">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="declined">Declined</option>
                            </select>
                        </div>

                        {/* Passenger Search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Search className="w-4 h-4 inline mr-1" />
                                Passenger
                            </label>
                            <input
                                type="text"
                                value={filters.passengerSearch}
                                onChange={(e) => updateFilter('passengerSearch', e.target.value)}
                                placeholder="Name or email..."
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
                                placeholder="Name or email..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>

                        {/* Ride Search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Search className="w-4 h-4 inline mr-1" />
                                Ride
                            </label>
                            <input
                                type="text"
                                value={filters.rideSearch}
                                onChange={(e) => updateFilter('rideSearch', e.target.value)}
                                placeholder="Route or ride ID..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>
                    </div>

                    {/* Row 2: Date Range, Seats, Toggles */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
                                To Date
                            </label>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => updateFilter('dateTo', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>

                        {/* Min Seats */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Users className="w-4 h-4 inline mr-1" />
                                Min Seats
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={filters.seatsMin}
                                onChange={(e) => updateFilter('seatsMin', e.target.value)}
                                placeholder="1"
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
                                min="1"
                                max="10"
                                value={filters.seatsMax}
                                onChange={(e) => updateFilter('seatsMax', e.target.value)}
                                placeholder="10"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>

                        {/* Last Minute */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <AlertTriangle className="w-4 h-4 inline mr-1 text-orange-500" />
                                Last Minute
                            </label>
                            <select
                                value={filters.isLastMinute}
                                onChange={(e) => updateFilter('isLastMinute', e.target.value as BookingFiltersType['isLastMinute'])}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                                <option value="all">All</option>
                                <option value="yes">Last Minute Only</option>
                                <option value="no">Not Last Minute</option>
                            </select>
                        </div>

                        {/* Has Dispute */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Disputed
                            </label>
                            <select
                                value={filters.hasDispute}
                                onChange={(e) => updateFilter('hasDispute', e.target.value as BookingFiltersType['hasDispute'])}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                                <option value="all">All</option>
                                <option value="yes">With Disputes</option>
                                <option value="no">No Disputes</option>
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
                            {filters.passengerSearch && (
                                <FilterChip
                                    label={`Passenger: ${filters.passengerSearch}`}
                                    onRemove={() => updateFilter('passengerSearch', '')}
                                />
                            )}
                            {filters.driverSearch && (
                                <FilterChip
                                    label={`Driver: ${filters.driverSearch}`}
                                    onRemove={() => updateFilter('driverSearch', '')}
                                />
                            )}
                            {filters.rideSearch && (
                                <FilterChip
                                    label={`Ride: ${filters.rideSearch}`}
                                    onRemove={() => updateFilter('rideSearch', '')}
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
                            {filters.isLastMinute !== 'all' && (
                                <FilterChip
                                    label={`Last Minute: ${filters.isLastMinute}`}
                                    onRemove={() => updateFilter('isLastMinute', 'all')}
                                />
                            )}
                            {filters.hasDispute !== 'all' && (
                                <FilterChip
                                    label={`Disputed: ${filters.hasDispute}`}
                                    onRemove={() => updateFilter('hasDispute', 'all')}
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

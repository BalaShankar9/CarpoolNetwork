import { useState } from 'react';
import {
    Calculator,
    PoundSterling,
    Fuel,
    Car,
    Users,
    Leaf,
    TrendingUp,
} from 'lucide-react';

interface SavingsCalculatorProps {
    defaultDistance?: number;
    defaultDaysPerWeek?: number;
    defaultPassengers?: number;
}

// Average costs in UK
const AVG_FUEL_COST_PER_LITRE = 1.45; // £
const AVG_FUEL_CONSUMPTION = 7; // L/100km
const AVG_CAR_RUNNING_COST = 0.45; // £/km (fuel, maintenance, depreciation)
const CO2_PER_KM = 0.12; // kg CO2 per km

export function SavingsCalculator({
    defaultDistance = 20,
    defaultDaysPerWeek = 5,
    defaultPassengers = 2,
}: SavingsCalculatorProps) {
    const [distance, setDistance] = useState(defaultDistance);
    const [daysPerWeek, setDaysPerWeek] = useState(defaultDaysPerWeek);
    const [passengers, setPassengers] = useState(defaultPassengers);
    const [showDetails, setShowDetails] = useState(false);

    // Calculate savings
    const weeklyDistance = distance * 2 * daysPerWeek; // Round trip
    const monthlyDistance = weeklyDistance * 4.33;
    const yearlyDistance = weeklyDistance * 52;

    // Cost without carpooling
    const yearlyCostAlone = yearlyDistance * AVG_CAR_RUNNING_COST;

    // Cost with carpooling (shared among passengers + driver)
    const costPerPerson = yearlyCostAlone / (passengers + 1);
    const yearlySavings = yearlyCostAlone - costPerPerson;

    // For drivers who take passengers
    const driverSavings = (yearlyCostAlone / (passengers + 1)) * passengers;

    // Environmental impact
    const yearlyCO2Saved = yearlyDistance * CO2_PER_KM * (passengers / (passengers + 1));
    const treesEquivalent = yearlyCO2Saved / 21; // A tree absorbs ~21kg CO2/year
    const fuelSaved = (yearlyDistance * AVG_FUEL_CONSUMPTION / 100) * (passengers / (passengers + 1));

    return (
        <div className="bg-white border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <Calculator className="h-6 w-6" />
                    <h3 className="text-lg font-semibold">Savings Calculator</h3>
                </div>
                <p className="text-sm text-green-100">
                    See how much you could save by carpooling
                </p>
            </div>

            {/* Input Controls */}
            <div className="p-6 space-y-6">
                {/* Distance */}
                <div>
                    <label className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                            One-way distance
                        </span>
                        <span className="text-sm font-bold text-gray-900">{distance} km</span>
                    </label>
                    <input
                        type="range"
                        min="5"
                        max="100"
                        value={distance}
                        onChange={e => setDistance(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
                     accent-green-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>5 km</span>
                        <span>100 km</span>
                    </div>
                </div>

                {/* Days per week */}
                <div>
                    <label className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                            Days per week
                        </span>
                        <span className="text-sm font-bold text-gray-900">{daysPerWeek} days</span>
                    </label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5, 6, 7].map(day => (
                            <button
                                key={day}
                                onClick={() => setDaysPerWeek(day)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${daysPerWeek === day
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Number of passengers */}
                <div>
                    <label className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                            Carpool size (excluding driver)
                        </span>
                        <span className="text-sm font-bold text-gray-900">{passengers} passengers</span>
                    </label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map(p => (
                            <button
                                key={p}
                                onClick={() => setPassengers(p)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${passengers === p
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="bg-green-50 p-6 space-y-4">
                <h4 className="font-semibold text-green-900">Your Annual Savings</h4>

                {/* Main savings figure */}
                <div className="text-center py-4 bg-white rounded-xl shadow-sm">
                    <div className="flex items-center justify-center gap-1 text-4xl font-bold text-green-600">
                        <PoundSterling className="h-8 w-8" />
                        {Math.round(yearlySavings).toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">per year as a passenger</p>
                </div>

                {/* Driver savings */}
                <div className="p-4 bg-white rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Car className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-gray-500">As a driver with {passengers} passengers</p>
                            <p className="font-semibold text-gray-900">
                                Save £{Math.round(driverSavings).toLocaleString()}/year
                            </p>
                        </div>
                    </div>
                </div>

                {/* Environmental impact */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-white rounded-xl text-center">
                        <Leaf className="h-5 w-5 text-green-600 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900">{Math.round(yearlyCO2Saved)}</p>
                        <p className="text-xs text-gray-500">kg CO₂ saved</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl text-center">
                        <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900">{Math.round(treesEquivalent)}</p>
                        <p className="text-xs text-gray-500">trees worth</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl text-center">
                        <Fuel className="h-5 w-5 text-orange-600 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900">{Math.round(fuelSaved)}</p>
                        <p className="text-xs text-gray-500">litres saved</p>
                    </div>
                </div>

                {/* Details toggle */}
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full text-sm text-green-700 hover:text-green-800"
                >
                    {showDetails ? 'Hide calculation details' : 'Show calculation details'}
                </button>

                {showDetails && (
                    <div className="p-4 bg-white rounded-xl text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Weekly distance (round trip)</span>
                            <span className="font-medium">{weeklyDistance} km</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Annual distance</span>
                            <span className="font-medium">{yearlyDistance.toLocaleString()} km</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Cost per km (fuel, wear, etc.)</span>
                            <span className="font-medium">£{AVG_CAR_RUNNING_COST.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                            <span className="text-gray-500">Annual cost driving alone</span>
                            <span className="font-medium">£{Math.round(yearlyCostAlone).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Your share when carpooling</span>
                            <span className="font-medium text-green-600">£{Math.round(costPerPerson).toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

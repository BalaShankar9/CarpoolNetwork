import { useState, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Car } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface RideHistoryChartProps {
    months?: number;
}

interface MonthData {
    month: string;
    year: number;
    asDriver: number;
    asPassenger: number;
    total: number;
}

export function RideHistoryChart({ months = 6 }: RideHistoryChartProps) {
    const { user } = useAuth();
    const [data, setData] = useState<MonthData[]>([]);
    const [loading, setLoading] = useState(true);
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user, offset, months]);

    const loadData = async () => {
        if (!user) return;

        try {
            setLoading(true);

            const now = new Date();
            // Calculate the full date range for all months at once
            const oldestMonth = new Date(now.getFullYear(), now.getMonth() - (months - 1) - offset, 1);
            const newestMonth = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0);
            const rangeStart = oldestMonth.toISOString();
            const rangeEnd = newestMonth.toISOString();

            // Two queries instead of 2*months queries
            const [driverResult, passengerResult] = await Promise.all([
                supabase
                    .from('rides')
                    .select('departure_time')
                    .eq('driver_id', user.id)
                    .eq('status', 'completed')
                    .gte('departure_time', rangeStart)
                    .lte('departure_time', rangeEnd),
                supabase
                    .from('ride_bookings')
                    .select('created_at')
                    .eq('passenger_id', user.id)
                    .eq('status', 'completed')
                    .gte('created_at', rangeStart)
                    .lte('created_at', rangeEnd),
            ]);

            // Group results by month on the client
            const driverByMonth: Record<string, number> = {};
            const passengerByMonth: Record<string, number> = {};

            driverResult.data?.forEach((row: any) => {
                const d = new Date(row.departure_time);
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                driverByMonth[key] = (driverByMonth[key] || 0) + 1;
            });

            passengerResult.data?.forEach((row: any) => {
                const d = new Date(row.created_at);
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                passengerByMonth[key] = (passengerByMonth[key] || 0) + 1;
            });

            const monthsData: MonthData[] = [];
            for (let i = months - 1; i >= 0; i--) {
                const targetMonth = new Date(now.getFullYear(), now.getMonth() - i - offset, 1);
                const key = `${targetMonth.getFullYear()}-${targetMonth.getMonth()}`;
                const asDriver = driverByMonth[key] || 0;
                const asPassenger = passengerByMonth[key] || 0;
                monthsData.push({
                    month: targetMonth.toLocaleString('default', { month: 'short' }),
                    year: targetMonth.getFullYear(),
                    asDriver,
                    asPassenger,
                    total: asDriver + asPassenger,
                });
            }

            setData(monthsData);
        } catch (err) {
            console.error('Error loading ride history:', err);
        } finally {
            setLoading(false);
        }
    };

    const maxValue = useMemo(() => Math.max(...data.map(d => d.total), 1), [data]);

    if (loading) {
        return (
            <div className="bg-white border rounded-xl p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 w-40 bg-gray-200 rounded" />
                    <div className="h-48 bg-gray-100 rounded" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Ride History
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setOffset(o => o + months)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <button
                        onClick={() => setOffset(o => Math.max(0, o - months))}
                        disabled={offset === 0}
                        className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                    >
                        <ChevronRight className="h-5 w-5 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Chart */}
            <div className="relative h-48">
                <div className="absolute inset-0 flex items-end gap-2">
                    {data.map((month, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1">
                            {/* Bar */}
                            <div className="w-full flex flex-col gap-0.5" style={{ height: '100%' }}>
                                <div className="flex-1 flex flex-col justify-end">
                                    {/* Passenger portion */}
                                    <div
                                        className="w-full bg-green-500 rounded-t transition-all duration-500"
                                        style={{
                                            height: `${(month.asPassenger / maxValue) * 100}%`,
                                            minHeight: month.asPassenger > 0 ? '4px' : '0px',
                                        }}
                                    />
                                    {/* Driver portion */}
                                    <div
                                        className="w-full bg-blue-500 transition-all duration-500"
                                        style={{
                                            height: `${(month.asDriver / maxValue) * 100}%`,
                                            minHeight: month.asDriver > 0 ? '4px' : '0px',
                                            borderRadius: month.asPassenger > 0 ? '0' : '4px 4px 0 0',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Label */}
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                {month.month}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Y-axis lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[0, 1, 2, 3].map(i => (
                        <div
                            key={i}
                            className="border-b border-gray-100"
                            style={{ marginBottom: i === 3 ? '24px' : 0 }}
                        />
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded" />
                    <span className="text-sm text-gray-600">As Driver</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded" />
                    <span className="text-sm text-gray-600">As Passenger</span>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                <div>
                    <p className="text-2xl font-bold text-gray-900">
                        {data.reduce((sum, d) => sum + d.total, 0)}
                    </p>
                    <p className="text-xs text-gray-500">Total Rides</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-blue-600">
                        {data.reduce((sum, d) => sum + d.asDriver, 0)}
                    </p>
                    <p className="text-xs text-gray-500">As Driver</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-green-600">
                        {data.reduce((sum, d) => sum + d.asPassenger, 0)}
                    </p>
                    <p className="text-xs text-gray-500">As Passenger</p>
                </div>
            </div>
        </div>
    );
}

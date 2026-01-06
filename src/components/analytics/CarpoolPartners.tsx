import { useState, useEffect } from 'react';
import { Users, Star, Car, Calendar, MessageCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Partner {
    id: string;
    full_name: string;
    avatar_url?: string;
    profile_photo_url?: string;
    average_rating?: number;
    rideCount: number;
    lastRideDate?: string;
    type: 'driver' | 'passenger' | 'both';
}

export function CarpoolPartners() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadPartners();
        }
    }, [user]);

    const loadPartners = async () => {
        if (!user) return;

        try {
            setLoading(true);

            // Get all completed rides as driver
            const { data: driverRides } = await supabase
                .from('rides')
                .select(`
          id,
          departure_time,
          bookings:ride_bookings(
            passenger_id,
            status,
            passenger:profiles!ride_bookings_passenger_id_fkey(
              id,
              full_name,
              avatar_url,
              profile_photo_url,
              average_rating
            )
          )
        `)
                .eq('driver_id', user.id)
                .eq('status', 'completed');

            // Get all completed bookings as passenger
            const { data: passengerBookings } = await supabase
                .from('ride_bookings')
                .select(`
          ride:rides!inner(
            id,
            departure_time,
            driver_id,
            status,
            driver:profiles!rides_driver_id_fkey(
              id,
              full_name,
              avatar_url,
              profile_photo_url,
              average_rating
            )
          )
        `)
                .eq('passenger_id', user.id)
                .eq('status', 'completed');

            // Aggregate partner data
            const partnerMap = new Map<string, Partner>();

            // Process passengers from rides I drove
            driverRides?.forEach(ride => {
                ride.bookings?.forEach((booking: any) => {
                    if (booking.status !== 'completed' || !booking.passenger) return;

                    const passenger = booking.passenger;
                    const existing = partnerMap.get(passenger.id);

                    if (existing) {
                        existing.rideCount++;
                        if (ride.departure_time > (existing.lastRideDate || '')) {
                            existing.lastRideDate = ride.departure_time;
                        }
                        if (existing.type === 'driver') {
                            existing.type = 'both';
                        }
                    } else {
                        partnerMap.set(passenger.id, {
                            id: passenger.id,
                            full_name: passenger.full_name,
                            avatar_url: passenger.avatar_url,
                            profile_photo_url: passenger.profile_photo_url,
                            average_rating: passenger.average_rating,
                            rideCount: 1,
                            lastRideDate: ride.departure_time,
                            type: 'passenger',
                        });
                    }
                });
            });

            // Process drivers from rides I was a passenger in
            passengerBookings?.forEach((booking: any) => {
                if (!booking.ride?.driver) return;

                const driver = booking.ride.driver;
                const existing = partnerMap.get(driver.id);

                if (existing) {
                    existing.rideCount++;
                    if (booking.ride.departure_time > (existing.lastRideDate || '')) {
                        existing.lastRideDate = booking.ride.departure_time;
                    }
                    if (existing.type === 'passenger') {
                        existing.type = 'both';
                    }
                } else {
                    partnerMap.set(driver.id, {
                        id: driver.id,
                        full_name: driver.full_name,
                        avatar_url: driver.avatar_url,
                        profile_photo_url: driver.profile_photo_url,
                        average_rating: driver.average_rating,
                        rideCount: 1,
                        lastRideDate: booking.ride.departure_time,
                        type: 'driver',
                    });
                }
            });

            // Sort by ride count
            const sortedPartners = Array.from(partnerMap.values()).sort(
                (a, b) => b.rideCount - a.rideCount
            );

            setPartners(sortedPartners);
        } catch (err) {
            console.error('Error loading carpool partners:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white border rounded-xl p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 w-40 bg-gray-200 rounded" />
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-gray-100 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Carpool Partners
                </h3>
                <span className="text-sm text-gray-500">{partners.length} total</span>
            </div>

            {partners.length === 0 ? (
                <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No carpool partners yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                        Complete rides to build your network
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {partners.slice(0, 5).map(partner => (
                        <button
                            key={partner.id}
                            onClick={() => navigate(`/user/${partner.id}`)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50
                       transition-colors text-left"
                        >
                            <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                                {(partner.profile_photo_url || partner.avatar_url) ? (
                                    <img
                                        src={partner.profile_photo_url || partner.avatar_url}
                                        alt={partner.full_name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <Users className="h-6 w-6" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{partner.full_name}</p>
                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Car className="h-3 w-3" />
                                        {partner.rideCount} rides
                                    </span>
                                    {partner.average_rating && (
                                        <span className="flex items-center gap-1">
                                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                            {partner.average_rating.toFixed(1)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <span
                                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${partner.type === 'both'
                                            ? 'bg-purple-100 text-purple-700'
                                            : partner.type === 'driver'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-green-100 text-green-700'
                                        }`}
                                >
                                    {partner.type === 'both'
                                        ? 'Both'
                                        : partner.type === 'driver'
                                            ? 'Driver'
                                            : 'Passenger'}
                                </span>
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                        </button>
                    ))}

                    {partners.length > 5 && (
                        <button
                            onClick={() => navigate('/friends')}
                            className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            View all {partners.length} partners
                        </button>
                    )}
                </div>
            )}

            {/* Top partner highlight */}
            {partners.length > 0 && partners[0].rideCount >= 3 && (
                <div className="mt-4 p-4 bg-purple-50 rounded-xl">
                    <div className="flex items-center gap-2 text-purple-700 text-sm font-medium mb-1">
                        <Star className="h-4 w-4" />
                        Top Carpool Buddy
                    </div>
                    <p className="text-sm text-purple-600">
                        You've shared {partners[0].rideCount} rides with {partners[0].full_name}!
                    </p>
                </div>
            )}
        </div>
    );
}

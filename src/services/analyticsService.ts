// User Analytics Service
// Personal statistics, environmental impact, and reporting

import { supabase } from '@/lib/supabase';

export interface UserStats {
  userId: string;
  period: 'week' | 'month' | 'year' | 'all';
  ridesGiven: number;
  ridesTaken: number;
  totalDistance: number; // km
  totalDuration: number; // minutes
  moneySaved: number;
  moneyEarned: number;
  co2Saved: number; // kg
  treesEquivalent: number;
  averageRating: number;
  totalReviews: number;
  topRoutes: RouteStats[];
  frequentPartners: PartnerStats[];
  peakTimes: TimeStats[];
}

export interface RouteStats {
  origin: string;
  destination: string;
  count: number;
  totalDistance: number;
  averageDuration: number;
}

export interface PartnerStats {
  userId: string;
  name: string;
  avatar?: string;
  ridesShared: number;
  lastRide: Date;
}

export interface TimeStats {
  hour: number;
  dayOfWeek: number;
  rideCount: number;
}

export interface TrendData {
  date: string;
  ridesGiven: number;
  ridesTaken: number;
  co2Saved: number;
  distance: number;
  earnings: number;
  savings: number;
}

export interface EnvironmentalImpact {
  totalCo2Saved: number;
  treesEquivalent: number;
  gallonsSaved: number;
  milesSaved: number;
  carsOffRoad: number; // equivalent days
  monthlyTrend: { month: string; co2Saved: number }[];
  comparison: {
    averageUser: number;
    yourSavings: number;
    percentile: number;
  };
}

export interface ReportData {
  generatedAt: Date;
  period: { start: Date; end: Date };
  stats: UserStats;
  trends: TrendData[];
  impact: EnvironmentalImpact;
}

// Constants for calculations
const CO2_PER_KM_CAR = 0.21; // kg CO2 per km for average car
const FUEL_PRICE_PER_LITER = 1.45; // GBP
const FUEL_EFFICIENCY = 12; // km per liter
const CO2_PER_TREE_PER_YEAR = 21; // kg CO2 absorbed by one tree per year
const LITERS_PER_GALLON = 3.785;
const KM_PER_MILE = 1.609;

class AnalyticsService {
  // Get comprehensive user statistics
  async getUserStats(
    userId: string,
    period: 'week' | 'month' | 'year' | 'all' = 'month'
  ): Promise<UserStats> {
    const dateRange = this.getDateRange(period);

    // Fetch rides as driver
    const { data: ridesAsDriver } = await supabase
      .from('rides')
      .select(`
        id,
        origin,
        destination,
        origin_lat,
        origin_lng,
        destination_lat,
        destination_lng,
        departure_time,
        distance_km,
        duration_minutes,
        price_per_seat,
        ride_bookings(id, passenger_id, status)
      `)
      .eq('driver_id', userId)
      .gte('departure_time', dateRange.start.toISOString())
      .lte('departure_time', dateRange.end.toISOString());

    // Fetch rides as passenger
    const { data: ridesAsPassenger } = await supabase
      .from('ride_bookings')
      .select(`
        id,
        status,
        seats_booked,
        ride:rides(
          id,
          origin,
          destination,
          departure_time,
          distance_km,
          duration_minutes,
          price_per_seat,
          driver_id
        )
      `)
      .eq('passenger_id', userId)
      .eq('status', 'confirmed')
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());

    // Fetch reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', userId);

    // Calculate statistics
    const completedDriverRides = ridesAsDriver?.filter(
      (r) => r.ride_bookings && r.ride_bookings.some((b: any) => b.status === 'confirmed')
    ) || [];

    const completedPassengerRides = ridesAsPassenger?.filter(
      (r) => r.ride && r.status === 'confirmed'
    ) || [];

    const totalDistanceDriver = completedDriverRides.reduce(
      (sum, r) => sum + (r.distance_km || 0),
      0
    );
    const totalDistancePassenger = completedPassengerRides.reduce(
      (sum, r) => sum + ((r.ride as any)?.distance_km || 0),
      0
    );

    const totalDurationDriver = completedDriverRides.reduce(
      (sum, r) => sum + (r.duration_minutes || 0),
      0
    );
    const totalDurationPassenger = completedPassengerRides.reduce(
      (sum, r) => sum + ((r.ride as any)?.duration_minutes || 0),
      0
    );

    // Calculate money
    const moneyEarned = completedDriverRides.reduce((sum, r) => {
      const confirmedBookings = r.ride_bookings?.filter((b: any) => b.status === 'confirmed').length || 0;
      return sum + (r.price_per_seat || 0) * confirmedBookings;
    }, 0);

    const moneySaved = completedPassengerRides.reduce((sum, r) => {
      const distance = (r.ride as any)?.distance_km || 0;
      const fuelCost = (distance / FUEL_EFFICIENCY) * FUEL_PRICE_PER_LITER;
      const actualPaid = ((r.ride as any)?.price_per_seat || 0) * (r.seats_booked || 1);
      return sum + Math.max(0, fuelCost - actualPaid);
    }, 0);

    // Calculate CO2 saved (sharing a ride saves emissions)
    const co2SavedDriver = completedDriverRides.reduce((sum, r) => {
      const passengers = r.ride_bookings?.filter((b: any) => b.status === 'confirmed').length || 0;
      // Each passenger sharing the ride saves their individual car trip
      return sum + (r.distance_km || 0) * CO2_PER_KM_CAR * passengers;
    }, 0);

    const co2SavedPassenger = totalDistancePassenger * CO2_PER_KM_CAR;

    const totalCo2Saved = co2SavedDriver + co2SavedPassenger;

    // Get top routes
    const topRoutes = this.calculateTopRoutes([
      ...completedDriverRides,
      ...completedPassengerRides.map((r) => r.ride),
    ]);

    // Get frequent partners
    const frequentPartners = await this.getFrequentPartners(
      userId,
      completedDriverRides,
      completedPassengerRides
    );

    // Get peak times
    const peakTimes = this.calculatePeakTimes([
      ...completedDriverRides,
      ...completedPassengerRides.map((r) => r.ride),
    ]);

    // Calculate average rating
    const avgRating = reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    return {
      userId,
      period,
      ridesGiven: completedDriverRides.length,
      ridesTaken: completedPassengerRides.length,
      totalDistance: totalDistanceDriver + totalDistancePassenger,
      totalDuration: totalDurationDriver + totalDurationPassenger,
      moneySaved,
      moneyEarned,
      co2Saved: totalCo2Saved,
      treesEquivalent: totalCo2Saved / CO2_PER_TREE_PER_YEAR,
      averageRating: avgRating,
      totalReviews: reviews?.length || 0,
      topRoutes,
      frequentPartners,
      peakTimes,
    };
  }

  // Get trend data over time
  async getTrendData(
    userId: string,
    period: 'week' | 'month' | 'year' = 'month'
  ): Promise<TrendData[]> {
    const dateRange = this.getDateRange(period);
    const granularity = period === 'week' ? 'day' : period === 'month' ? 'day' : 'month';

    // Fetch all rides in period
    const { data: ridesAsDriver } = await supabase
      .from('rides')
      .select('departure_time, distance_km, price_per_seat, ride_bookings(status)')
      .eq('driver_id', userId)
      .gte('departure_time', dateRange.start.toISOString())
      .lte('departure_time', dateRange.end.toISOString());

    const { data: ridesAsPassenger } = await supabase
      .from('ride_bookings')
      .select('created_at, seats_booked, ride:rides(distance_km, price_per_seat)')
      .eq('passenger_id', userId)
      .eq('status', 'confirmed')
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());

    // Group by date
    const trendMap = new Map<string, TrendData>();

    // Initialize all dates in range
    const current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      const key = this.formatDateKey(current, granularity);
      trendMap.set(key, {
        date: key,
        ridesGiven: 0,
        ridesTaken: 0,
        co2Saved: 0,
        distance: 0,
        earnings: 0,
        savings: 0,
      });
      if (granularity === 'day') {
        current.setDate(current.getDate() + 1);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }

    // Aggregate driver rides
    ridesAsDriver?.forEach((ride) => {
      const key = this.formatDateKey(new Date(ride.departure_time), granularity);
      const trend = trendMap.get(key);
      if (trend) {
        const confirmedBookings = ride.ride_bookings?.filter((b: any) => b.status === 'confirmed').length || 0;
        if (confirmedBookings > 0) {
          trend.ridesGiven++;
          trend.distance += ride.distance_km || 0;
          trend.earnings += (ride.price_per_seat || 0) * confirmedBookings;
          trend.co2Saved += (ride.distance_km || 0) * CO2_PER_KM_CAR * confirmedBookings;
        }
      }
    });

    // Aggregate passenger rides
    ridesAsPassenger?.forEach((booking) => {
      const key = this.formatDateKey(new Date(booking.created_at), granularity);
      const trend = trendMap.get(key);
      if (trend && booking.ride) {
        trend.ridesTaken++;
        const distance = (booking.ride as any).distance_km || 0;
        trend.distance += distance;
        trend.co2Saved += distance * CO2_PER_KM_CAR;
        const fuelCost = (distance / FUEL_EFFICIENCY) * FUEL_PRICE_PER_LITER;
        const paid = ((booking.ride as any).price_per_seat || 0) * (booking.seats_booked || 1);
        trend.savings += Math.max(0, fuelCost - paid);
      }
    });

    return Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  // Get environmental impact details
  async getEnvironmentalImpact(userId: string): Promise<EnvironmentalImpact> {
    const allTimeStats = await this.getUserStats(userId, 'all');

    // Get monthly trend for the past year
    const { data: yearRides } = await supabase
      .from('rides')
      .select('departure_time, distance_km, ride_bookings(status)')
      .eq('driver_id', userId)
      .gte('departure_time', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

    const monthlyTrend: { month: string; co2Saved: number }[] = [];
    const monthMap = new Map<string, number>();

    yearRides?.forEach((ride) => {
      const month = new Date(ride.departure_time).toISOString().slice(0, 7);
      const passengers = ride.ride_bookings?.filter((b: any) => b.status === 'confirmed').length || 0;
      const co2 = (ride.distance_km || 0) * CO2_PER_KM_CAR * passengers;
      monthMap.set(month, (monthMap.get(month) || 0) + co2);
    });

    // Fill in missing months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toISOString().slice(0, 7);
      monthlyTrend.push({
        month,
        co2Saved: monthMap.get(month) || 0,
      });
    }

    // Get comparison with average user
    const { data: allUsers } = await supabase
      .from('rides')
      .select('driver_id, distance_km, ride_bookings(status)')
      .gte('departure_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const userCo2Map = new Map<string, number>();
    allUsers?.forEach((ride) => {
      const passengers = ride.ride_bookings?.filter((b: any) => b.status === 'confirmed').length || 0;
      const co2 = (ride.distance_km || 0) * CO2_PER_KM_CAR * passengers;
      userCo2Map.set(ride.driver_id, (userCo2Map.get(ride.driver_id) || 0) + co2);
    });

    const allUsersCo2 = Array.from(userCo2Map.values()).sort((a, b) => a - b);
    const averageUser = allUsersCo2.length > 0
      ? allUsersCo2.reduce((a, b) => a + b, 0) / allUsersCo2.length
      : 0;
    const userCo2 = userCo2Map.get(userId) || 0;
    const percentile = allUsersCo2.length > 0
      ? (allUsersCo2.filter((c) => c <= userCo2).length / allUsersCo2.length) * 100
      : 50;

    return {
      totalCo2Saved: allTimeStats.co2Saved,
      treesEquivalent: allTimeStats.treesEquivalent,
      gallonsSaved: (allTimeStats.totalDistance / FUEL_EFFICIENCY) / LITERS_PER_GALLON,
      milesSaved: allTimeStats.totalDistance / KM_PER_MILE,
      carsOffRoad: allTimeStats.co2Saved / (CO2_PER_KM_CAR * 50), // avg 50km/day
      monthlyTrend,
      comparison: {
        averageUser,
        yourSavings: userCo2,
        percentile,
      },
    };
  }

  // Generate downloadable report
  async generateReport(
    userId: string,
    period: 'week' | 'month' | 'year' = 'month',
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const stats = await this.getUserStats(userId, period);
    const trends = await this.getTrendData(userId, period);
    const impact = await this.getEnvironmentalImpact(userId);
    const dateRange = this.getDateRange(period);

    const reportData: ReportData = {
      generatedAt: new Date(),
      period: { start: dateRange.start, end: dateRange.end },
      stats,
      trends,
      impact,
    };

    if (format === 'csv') {
      return this.convertToCSV(reportData);
    }

    return JSON.stringify(reportData, null, 2);
  }

  // Helper methods
  private getDateRange(period: 'week' | 'month' | 'year' | 'all'): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'all':
        start.setFullYear(2020); // App launch date
        break;
    }

    return { start, end };
  }

  private formatDateKey(date: Date, granularity: 'day' | 'month'): string {
    if (granularity === 'day') {
      return date.toISOString().slice(0, 10);
    }
    return date.toISOString().slice(0, 7);
  }

  private calculateTopRoutes(rides: any[]): RouteStats[] {
    const routeMap = new Map<string, RouteStats>();

    rides.forEach((ride) => {
      if (!ride) return;
      const key = `${ride.origin}->${ride.destination}`;
      const existing = routeMap.get(key);
      if (existing) {
        existing.count++;
        existing.totalDistance += ride.distance_km || 0;
      } else {
        routeMap.set(key, {
          origin: ride.origin,
          destination: ride.destination,
          count: 1,
          totalDistance: ride.distance_km || 0,
          averageDuration: ride.duration_minutes || 0,
        });
      }
    });

    return Array.from(routeMap.values())
      .map((r) => ({
        ...r,
        averageDuration: r.totalDistance / r.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private async getFrequentPartners(
    userId: string,
    driverRides: any[],
    passengerBookings: any[]
  ): Promise<PartnerStats[]> {
    const partnerMap = new Map<string, { count: number; lastRide: Date }>();

    // Partners from rides as driver
    driverRides.forEach((ride) => {
      ride.ride_bookings?.forEach((booking: any) => {
        if (booking.status === 'confirmed' && booking.passenger_id !== userId) {
          const existing = partnerMap.get(booking.passenger_id);
          const rideDate = new Date(ride.departure_time);
          if (existing) {
            existing.count++;
            if (rideDate > existing.lastRide) existing.lastRide = rideDate;
          } else {
            partnerMap.set(booking.passenger_id, { count: 1, lastRide: rideDate });
          }
        }
      });
    });

    // Partners from rides as passenger
    passengerBookings.forEach((booking) => {
      if (booking.ride?.driver_id && booking.ride.driver_id !== userId) {
        const driverId = booking.ride.driver_id;
        const existing = partnerMap.get(driverId);
        const rideDate = new Date(booking.ride.departure_time);
        if (existing) {
          existing.count++;
          if (rideDate > existing.lastRide) existing.lastRide = rideDate;
        } else {
          partnerMap.set(driverId, { count: 1, lastRide: rideDate });
        }
      }
    });

    // Fetch partner profiles
    const partnerIds = Array.from(partnerMap.keys()).slice(0, 10);
    if (partnerIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', partnerIds);

    return partnerIds
      .map((partnerId) => {
        const partner = partnerMap.get(partnerId)!;
        const profile = profiles?.find((p) => p.id === partnerId);
        return {
          userId: partnerId,
          name: profile?.full_name || 'Unknown',
          avatar: profile?.avatar_url,
          ridesShared: partner.count,
          lastRide: partner.lastRide,
        };
      })
      .sort((a, b) => b.ridesShared - a.ridesShared)
      .slice(0, 5);
  }

  private calculatePeakTimes(rides: any[]): TimeStats[] {
    const timeMap = new Map<string, number>();

    rides.forEach((ride) => {
      if (!ride?.departure_time) return;
      const date = new Date(ride.departure_time);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      const key = `${dayOfWeek}-${hour}`;
      timeMap.set(key, (timeMap.get(key) || 0) + 1);
    });

    return Array.from(timeMap.entries())
      .map(([key, count]) => {
        const [dayOfWeek, hour] = key.split('-').map(Number);
        return { hour, dayOfWeek, rideCount: count };
      })
      .sort((a, b) => b.rideCount - a.rideCount)
      .slice(0, 10);
  }

  private convertToCSV(report: ReportData): string {
    const lines: string[] = [];

    // Header
    lines.push('CarpoolNetwork Statistics Report');
    lines.push(`Generated: ${report.generatedAt.toISOString()}`);
    lines.push(`Period: ${report.period.start.toISOString()} to ${report.period.end.toISOString()}`);
    lines.push('');

    // Summary stats
    lines.push('SUMMARY');
    lines.push('Metric,Value');
    lines.push(`Rides Given,${report.stats.ridesGiven}`);
    lines.push(`Rides Taken,${report.stats.ridesTaken}`);
    lines.push(`Total Distance (km),${report.stats.totalDistance.toFixed(1)}`);
    lines.push(`Money Saved (£),${report.stats.moneySaved.toFixed(2)}`);
    lines.push(`Money Earned (£),${report.stats.moneyEarned.toFixed(2)}`);
    lines.push(`CO2 Saved (kg),${report.stats.co2Saved.toFixed(1)}`);
    lines.push(`Trees Equivalent,${report.stats.treesEquivalent.toFixed(1)}`);
    lines.push(`Average Rating,${report.stats.averageRating.toFixed(1)}`);
    lines.push('');

    // Trends
    lines.push('DAILY TRENDS');
    lines.push('Date,Rides Given,Rides Taken,CO2 Saved (kg),Distance (km),Earnings (£),Savings (£)');
    report.trends.forEach((t) => {
      lines.push(`${t.date},${t.ridesGiven},${t.ridesTaken},${t.co2Saved.toFixed(1)},${t.distance.toFixed(1)},${t.earnings.toFixed(2)},${t.savings.toFixed(2)}`);
    });
    lines.push('');

    // Top routes
    lines.push('TOP ROUTES');
    lines.push('Origin,Destination,Count,Total Distance (km)');
    report.stats.topRoutes.forEach((r) => {
      lines.push(`"${r.origin}","${r.destination}",${r.count},${r.totalDistance.toFixed(1)}`);
    });

    return lines.join('\n');
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;

// Multi-Stop Routes Service
// Handles waypoints, route optimization, and flexible pickup/dropoff zones

export interface Waypoint {
  id: string;
  location: string;
  lat: number;
  lng: number;
  order: number;
  type: 'pickup' | 'dropoff' | 'both';
  estimatedTime?: Date;
  flexibleRadius?: number; // meters from exact location
  notes?: string;
}

export interface MultiStopRoute {
  id: string;
  rideId: string;
  waypoints: Waypoint[];
  totalDistance: number; // km
  totalDuration: number; // minutes
  optimized: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RouteOptimizationResult {
  originalRoute: Waypoint[];
  optimizedRoute: Waypoint[];
  distanceSaved: number; // km
  timeSaved: number; // minutes
  applied: boolean;
}

export interface FlexiblePickupZone {
  centroid: { lat: number; lng: number };
  radius: number; // meters
  suggestedLocations: {
    location: string;
    lat: number;
    lng: number;
    walkingTime: number; // minutes
  }[];
}

class MultiStopRouteService {
  // Calculate distance between two points using Haversine formula
  private haversineDistance(
    lat1: number, 
    lng1: number, 
    lat2: number, 
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Calculate total route distance
  calculateRouteDistance(waypoints: Waypoint[]): number {
    let totalDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalDistance += this.haversineDistance(
        waypoints[i].lat,
        waypoints[i].lng,
        waypoints[i + 1].lat,
        waypoints[i + 1].lng
      );
    }
    return Math.round(totalDistance * 100) / 100;
  }

  // Estimate duration based on distance (avg 40 km/h in city)
  estimateDuration(distanceKm: number): number {
    const avgSpeedKmH = 40;
    return Math.round((distanceKm / avgSpeedKmH) * 60);
  }

  // Simple 2-opt optimization for small routes
  optimizeRoute(waypoints: Waypoint[]): RouteOptimizationResult {
    if (waypoints.length <= 3) {
      return {
        originalRoute: waypoints,
        optimizedRoute: waypoints,
        distanceSaved: 0,
        timeSaved: 0,
        applied: false
      };
    }

    const originalDistance = this.calculateRouteDistance(waypoints);
    
    // Keep first and last fixed (origin and destination)
    const fixed = {
      first: waypoints[0],
      last: waypoints[waypoints.length - 1]
    };
    
    // Get intermediate waypoints to optimize
    const intermediate = waypoints.slice(1, -1);
    
    // Simple nearest neighbor optimization
    const optimizedIntermediate = this.nearestNeighborSort(
      intermediate,
      fixed.first
    );
    
    const optimizedRoute = [
      fixed.first,
      ...optimizedIntermediate,
      fixed.last
    ].map((wp, idx) => ({ ...wp, order: idx }));
    
    const optimizedDistance = this.calculateRouteDistance(optimizedRoute);
    const distanceSaved = Math.max(0, originalDistance - optimizedDistance);
    const timeSaved = this.estimateDuration(distanceSaved);

    return {
      originalRoute: waypoints,
      optimizedRoute,
      distanceSaved: Math.round(distanceSaved * 100) / 100,
      timeSaved,
      applied: distanceSaved > 0.5 // Only suggest if saving >500m
    };
  }

  // Nearest neighbor sorting for intermediate waypoints
  private nearestNeighborSort(waypoints: Waypoint[], start: Waypoint): Waypoint[] {
    if (waypoints.length <= 1) return waypoints;
    
    const result: Waypoint[] = [];
    const remaining = [...waypoints];
    let current = start;
    
    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      
      for (let i = 0; i < remaining.length; i++) {
        const dist = this.haversineDistance(
          current.lat, current.lng,
          remaining[i].lat, remaining[i].lng
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }
      
      current = remaining[nearestIdx];
      result.push(current);
      remaining.splice(nearestIdx, 1);
    }
    
    return result;
  }

  // Generate flexible pickup zone with suggested locations
  generateFlexibleZone(
    centerLat: number,
    centerLng: number,
    radiusMeters: number = 500
  ): FlexiblePickupZone {
    // Generate 4 suggested pickup points around the center
    const offsets = [
      { angle: 0, name: 'North' },
      { angle: 90, name: 'East' },
      { angle: 180, name: 'South' },
      { angle: 270, name: 'West' }
    ];
    
    const suggestedLocations = offsets.map(offset => {
      const radians = offset.angle * (Math.PI / 180);
      const offsetKm = radiusMeters / 1000;
      
      // Approximate lat/lng offset
      const latOffset = offsetKm / 111 * Math.cos(radians);
      const lngOffset = offsetKm / (111 * Math.cos(this.toRad(centerLat))) * Math.sin(radians);
      
      return {
        location: `Pickup Point ${offset.name}`,
        lat: centerLat + latOffset,
        lng: centerLng + lngOffset,
        walkingTime: Math.round(radiusMeters / 80) // ~80m per minute walking
      };
    });

    return {
      centroid: { lat: centerLat, lng: centerLng },
      radius: radiusMeters,
      suggestedLocations
    };
  }

  // Check if a point is within flexible zone
  isWithinFlexibleZone(
    pointLat: number,
    pointLng: number,
    zoneCenterLat: number,
    zoneCenterLng: number,
    radiusMeters: number
  ): boolean {
    const distanceKm = this.haversineDistance(
      pointLat, pointLng,
      zoneCenterLat, zoneCenterLng
    );
    return distanceKm * 1000 <= radiusMeters;
  }

  // Calculate ETA for each waypoint based on departure time
  calculateWaypointETAs(
    waypoints: Waypoint[],
    departureTime: Date
  ): Waypoint[] {
    let currentTime = new Date(departureTime);
    
    return waypoints.map((wp, idx) => {
      if (idx === 0) {
        return { ...wp, estimatedTime: currentTime };
      }
      
      const prevWp = waypoints[idx - 1];
      const distanceKm = this.haversineDistance(
        prevWp.lat, prevWp.lng,
        wp.lat, wp.lng
      );
      const durationMinutes = this.estimateDuration(distanceKm);
      
      // Add 2 minutes per stop for pickup/dropoff
      const stopTime = 2;
      currentTime = new Date(currentTime.getTime() + (durationMinutes + stopTime) * 60000);
      
      return { ...wp, estimatedTime: currentTime };
    });
  }

  // Generate unique waypoint ID
  generateWaypointId(): string {
    return `wp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Validate waypoint data
  validateWaypoint(waypoint: Partial<Waypoint>): string[] {
    const errors: string[] = [];
    
    if (!waypoint.location?.trim()) {
      errors.push('Location is required');
    }
    
    if (typeof waypoint.lat !== 'number' || waypoint.lat < -90 || waypoint.lat > 90) {
      errors.push('Invalid latitude');
    }
    
    if (typeof waypoint.lng !== 'number' || waypoint.lng < -180 || waypoint.lng > 180) {
      errors.push('Invalid longitude');
    }
    
    if (waypoint.flexibleRadius && (waypoint.flexibleRadius < 0 || waypoint.flexibleRadius > 5000)) {
      errors.push('Flexible radius must be between 0 and 5000 meters');
    }
    
    return errors;
  }

  // Format route summary for display
  formatRouteSummary(waypoints: Waypoint[]): string {
    if (waypoints.length === 0) return '';
    if (waypoints.length === 1) return waypoints[0].location;
    if (waypoints.length === 2) {
      return `${waypoints[0].location} → ${waypoints[1].location}`;
    }
    
    const stopCount = waypoints.length - 2;
    return `${waypoints[0].location} → ${stopCount} stop${stopCount > 1 ? 's' : ''} → ${waypoints[waypoints.length - 1].location}`;
  }

  // Check if route passes through a region
  routePassesThrough(
    waypoints: Waypoint[],
    regionLat: number,
    regionLng: number,
    radiusKm: number
  ): boolean {
    return waypoints.some(wp => {
      const dist = this.haversineDistance(wp.lat, wp.lng, regionLat, regionLng);
      return dist <= radiusKm;
    });
  }

  // Get detour for adding a stop
  calculateDetour(
    existingWaypoints: Waypoint[],
    newWaypoint: Waypoint,
    insertAfterIndex: number
  ): { detourKm: number; detourMinutes: number; newTotalDistance: number } {
    const originalDistance = this.calculateRouteDistance(existingWaypoints);
    
    const newWaypoints = [
      ...existingWaypoints.slice(0, insertAfterIndex + 1),
      newWaypoint,
      ...existingWaypoints.slice(insertAfterIndex + 1)
    ];
    
    const newTotalDistance = this.calculateRouteDistance(newWaypoints);
    const detourKm = newTotalDistance - originalDistance;
    
    return {
      detourKm: Math.round(detourKm * 100) / 100,
      detourMinutes: this.estimateDuration(detourKm),
      newTotalDistance: Math.round(newTotalDistance * 100) / 100
    };
  }
}

export const multiStopRouteService = new MultiStopRouteService();
export default multiStopRouteService;

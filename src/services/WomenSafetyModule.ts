import { FamilySafetyModule } from './FamilySafetyModule';

export class WomenSafetyModule {
  /**
   * Evaluates if the current GPS coordinates deviate significantly from the planned route.
   * Threshold: > 350 meters deviation.
   */
  public static checkRouteDeviation(
    currentLat: number,
    currentLng: number,
    plannedRoute: { lat: number; lng: number }[],
    rideDetails: {
      rideId: string;
      riderName: string;
      pickup: string;
      drop: string;
      driverName?: string;
    }
  ): { deviated: boolean; distanceMeters: number } {
    if (!plannedRoute || plannedRoute.length === 0) {
      return { deviated: false, distanceMeters: 0 };
    }

    // Find closest point on the planned route
    let minDistance = Infinity;
    for (const point of plannedRoute) {
      const dist = this.getHaversineDistance(currentLat, currentLng, point.lat, point.lng);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }

    // 0.35 km = 350 meters
    const deviated = minDistance > 0.35;

    if (deviated) {
      console.warn(`[WomenSafetyModule] Route deviation detected! Distance: ${(minDistance * 1000).toFixed(0)}m. Raising safety alarm.`);
      
      // Auto trigger warning alert to guardian
      FamilySafetyModule.sendGuardianAlert('route_monitoring', {
        rideId: rideDetails.rideId,
        riderName: `${rideDetails.riderName} (WARNING: Off-route deviation by ${(minDistance * 1000).toFixed(0)} meters detected!)`,
        pickup: rideDetails.pickup,
        drop: rideDetails.drop,
        driverName: rideDetails.driverName
      });
    }

    return {
      deviated,
      distanceMeters: Math.round(minDistance * 1000)
    };
  }

  /**
   * Calculates distance between coordinates in Kilometers.
   */
  private static getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Triggers a discrete alert to emergency contacts.
   */
  public static triggerSilentSOS(rideDetails: {
    rideId: string;
    riderName: string;
    pickup: string;
    drop: string;
    driverName?: string;
  }): void {
    console.log('[WomenSafetyModule] Discretely sending live location to emergency contacts...');
    FamilySafetyModule.sendGuardianAlert('emergency', {
      ...rideDetails,
      riderName: `${rideDetails.riderName} (SILENT SOS TRIGGERED)`
    });
  }
}

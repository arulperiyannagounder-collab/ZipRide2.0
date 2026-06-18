import { ZipRideRepository } from './dbInterface';

export interface FamilySafetyAlert {
  id: string;
  type: 'ride_started' | 'route_monitoring' | 'safe_arrival' | 'emergency';
  message: string;
  timestamp: string;
  recipientPhone: string;
  recipientName: string;
}

export class FamilySafetyModule {
  /**
   * Broadcasts a tracking link or notification to the user's emergency contact / guardian.
   */
  public static sendGuardianAlert(
    type: FamilySafetyAlert['type'],
    rideDetails: {
      rideId: string;
      riderName: string;
      pickup: string;
      drop: string;
      driverName?: string;
      driverPhone?: string;
    }
  ): FamilySafetyAlert | null {
    const profile = ZipRideRepository.getProfile();
    const guardianPhone = profile.guardianPhone || profile.emergencyContactPhone;
    const guardianName = profile.guardianName || profile.emergencyContactName;

    if (!guardianPhone) {
      console.warn('[FamilySafetyModule] No emergency contact or guardian details found. Alert not sent.');
      return null;
    }

    let message = '';
    const trackingLink = `https://zipride.com/track/${rideDetails.rideId}`;

    switch (type) {
      case 'ride_started':
        message = `[ZipRide Family Safety] ${rideDetails.riderName} has started a ride from "${rideDetails.pickup}" to "${rideDetails.drop}". Driver: ${rideDetails.driverName || 'Assigned Driver'} (${rideDetails.driverPhone || 'N/A'}). Track live here: ${trackingLink}`;
        break;
      case 'route_monitoring':
        message = `[ZipRide Family Safety] GPS monitoring active for ${rideDetails.riderName}'s ride to "${rideDetails.drop}". No route deviations detected.`;
        break;
      case 'safe_arrival':
        message = `[ZipRide Family Safety] ${rideDetails.riderName} has arrived safely at "${rideDetails.drop}". Thank you for using ZipRide Safe Travels!`;
        break;
      case 'emergency':
        message = `[ZIPRIDE EMERGENCY ALERT] ${rideDetails.riderName} triggered an SOS emergency alert on ride ${rideDetails.rideId} from "${rideDetails.pickup}" to "${rideDetails.drop}". Track current vehicle position live: ${trackingLink} - Local police dispatched.`;
        break;
    }

    const alertLog: FamilySafetyAlert = {
      id: `AL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      type,
      message,
      timestamp: new Date().toISOString(),
      recipientPhone: guardianPhone,
      recipientName: guardianName
    };

    // Store in localStorage logs for display
    const saved = localStorage.getItem('zipride_guardian_alerts');
    const logs: FamilySafetyAlert[] = saved ? JSON.parse(saved) : [];
    logs.unshift(alertLog);
    localStorage.setItem('zipride_guardian_alerts', JSON.stringify(logs));

    console.log(`[FamilySafetyModule SMS Simulation sent to ${guardianName} (${guardianPhone})]:`, message);
    return alertLog;
  }

  public static getGuardianAlertLogs(): FamilySafetyAlert[] {
    const saved = localStorage.getItem('zipride_guardian_alerts');
    return saved ? JSON.parse(saved) : [];
  }
}

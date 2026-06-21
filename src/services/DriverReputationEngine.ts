export interface DriverReputationMetrics {
  driverId: string;
  driverName: string;
  safetyScore: number;       // 0-100 (reduced by overspeed/harsh braking events)
  routeCompliance: number;   // 0-100 (reduced by off-route diversions)
  accessibilityPoints: number; // Cumulative points for senior/disabled trips
  emergencyPreparedness: number; // 0-100 (reduced if emergency procedures violated)
  customerSatisfaction: number; // Rating scaled to 100
  overallReputationScore: number; // Weighted combination of all metrics (0-100)
  reputationBadge: 'Novice' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Guardian Elite';
  leaderboardRank?: number;
}

export class DriverReputationEngine {
  /**
   * Evaluates a driver's overall metrics and reputation score.
   */
  public static calculateReputation(
    driverId: string,
    driverName: string,
    rating: number, // 1.0 to 5.0
    overspeedCount: number,
    harshBrakeCount: number,
    totalRides: number,
    accessibilityTripsCount: number = 0,
    routeDeviationCount: number = 0
  ): DriverReputationMetrics {
    // 1. Safety Score
    // Starts at 100, drops by 5 per overspeed, 3 per harsh brake
    const safetyDeductions = (overspeedCount * 5) + (harshBrakeCount * 3);
    const safetyScore = Math.max(30, 100 - safetyDeductions);

    // 2. Route Compliance
    // Drops by 15 per unauthorized route deviation
    const complianceDeductions = routeDeviationCount * 15;
    const routeCompliance = Math.max(40, 100 - complianceDeductions);

    // 3. Customer Satisfaction
    // Scaled from 1-5 to 0-100
    const customerSatisfaction = Math.round(((rating - 1) / 4) * 100);

    // 4. Accessibility Points
    // 10 points per accessibility assistance ride
    const accessibilityPoints = accessibilityTripsCount * 10;

    // 5. Emergency Preparedness
    // High baseline, can drop if they ignore emergency alerts or are slow to react (mocked baseline)
    const emergencyPreparedness = 95;

    // Weighted Overall Reputation Score (0-100)
    // Safety (35%), Route Compliance (20%), Satisfaction (25%), Emergency (10%), Accessibility (10%)
    // Accessibility is added as a bonus factor or capped weight
    const baseRep = (safetyScore * 0.35) + 
                    (routeCompliance * 0.20) + 
                    (customerSatisfaction * 0.25) + 
                    (emergencyPreparedness * 0.10) + 
                    (Math.min(100, accessibilityPoints) * 0.10);
    
    const overallReputationScore = Math.min(100, Math.max(0, Math.round(baseRep)));

    // Badge classification
    let reputationBadge: DriverReputationMetrics['reputationBadge'] = 'Novice';
    if (overallReputationScore >= 95 && accessibilityTripsCount >= 5) {
      reputationBadge = 'Guardian Elite';
    } else if (overallReputationScore >= 88) {
      reputationBadge = 'Platinum';
    } else if (overallReputationScore >= 75) {
      reputationBadge = 'Gold';
    } else if (overallReputationScore >= 60) {
      reputationBadge = 'Silver';
    } else if (overallReputationScore >= 45) {
      reputationBadge = 'Bronze';
    }

    return {
      driverId,
      driverName,
      safetyScore,
      routeCompliance,
      accessibilityPoints,
      emergencyPreparedness,
      customerSatisfaction,
      overallReputationScore,
      reputationBadge
    };
  }

  /**
   * Returns a list of mock driver leaderboards for ranking and analytics.
   */
  public static getLeaderboard(): DriverReputationMetrics[] {
    const list: DriverReputationMetrics[] = [
      {
        driverId: 'drv-001',
        driverName: 'Karthik Rao',
        safetyScore: 98,
        routeCompliance: 96,
        accessibilityPoints: 80,
        emergencyPreparedness: 100,
        customerSatisfaction: 96,
        overallReputationScore: 98,
        reputationBadge: 'Guardian Elite',
        leaderboardRank: 1
      },
      {
        driverId: 'drv-002',
        driverName: 'Suresh Kumar',
        safetyScore: 95,
        routeCompliance: 92,
        accessibilityPoints: 40,
        emergencyPreparedness: 95,
        customerSatisfaction: 90,
        overallReputationScore: 92,
        reputationBadge: 'Platinum',
        leaderboardRank: 2
      },
      {
        driverId: 'drv-003',
        driverName: 'Arjun Singh',
        safetyScore: 90,
        routeCompliance: 88,
        accessibilityPoints: 30,
        emergencyPreparedness: 90,
        customerSatisfaction: 85,
        overallReputationScore: 87,
        reputationBadge: 'Gold',
        leaderboardRank: 3
      },
      {
        driverId: 'drv-004',
        driverName: 'Ravi Teja',
        safetyScore: 82,
        routeCompliance: 80,
        accessibilityPoints: 10,
        emergencyPreparedness: 95,
        customerSatisfaction: 78,
        overallReputationScore: 80,
        reputationBadge: 'Gold',
        leaderboardRank: 4
      }
    ];
    return list;
  }
}

import { FairPriceAnalysis, RideDetails, UserSettings } from '../types';

export const fairnessEngine = {
  calculateFairPrice(ride: RideDetails, settings: UserSettings): FairPriceAnalysis {
    const { 
      distanceRate, 
      timeRate, 
      baseFare, 
      fixedServiceFee = 10,
      trafficMultiplier = 1.0,
      nightSurgeRate = 1.0,
      tollRate = 0,
      fuelAdjustment = 0
    } = settings;

    // Use cheapest option fare and ETA
    const cheapestOption = ride.options.length > 0 
      ? ride.options.reduce((min, opt) => opt.fare < min.fare ? opt : min, ride.options[0])
      : null;
      
    const actualFare = cheapestOption ? cheapestOption.fare : 0;
    const eta = cheapestOption ? cheapestOption.eta : 5; // Fallback to 5 mins

    // Base fare + adjusted distance cost + time cost + service fee
    const adjustedDistanceRate = Math.max(0, distanceRate + fuelAdjustment);
    const subTotal = baseFare + (ride.distance * adjustedDistanceRate) + (eta * timeRate) + fixedServiceFee;
    
    // Apply traffic and night surge multipliers, then add estimated tolls
    const trafficSurgeCost = subTotal * (trafficMultiplier - 1.0);
    const nightSurgeCost = subTotal * (nightSurgeRate - 1.0);
    
    const expectedFare = subTotal + trafficSurgeCost + nightSurgeCost + tollRate;
    
    const difference = actualFare - expectedFare;
    const savings = expectedFare - actualFare;

    let status: 'UNDERPRICED' | 'FAIR' | 'OVERPRICED' = 'FAIR';

    // If the fare is more than 15% higher than expected
    if (actualFare > expectedFare * 1.15) {
      status = 'OVERPRICED';
    } else if (actualFare < expectedFare * 0.85) {
      status = 'UNDERPRICED';
    }

    return {
      expectedFare: parseFloat(expectedFare.toFixed(2)),
      actualFare: actualFare,
      difference: parseFloat(difference.toFixed(2)),
      savings: parseFloat(savings.toFixed(2)),
      status,
      pricingStatus: status
    };
  },

  calculateOverallFairness(
    priceStatus: 'UNDERPRICED' | 'FAIR' | 'OVERPRICED',
    transparencyScore: number,
    surgeDetected: boolean
  ) {
    let priceScore = 100;
    if (priceStatus === 'OVERPRICED') priceScore = 50;
    if (priceStatus === 'UNDERPRICED') priceScore = 90;

    let reliabilityScore = surgeDetected ? 60 : 100;
    let consistencyScore = 80; // Placeholder

    // 40% price fairness, 20% transparency, 20% reliability, 20% consistency
    const fairnessScore = (priceScore * 0.4) + (transparencyScore * 0.2) + (reliabilityScore * 0.2) + (consistencyScore * 0.2);

    let rating: 'Excellent' | 'Good' | 'Average' | 'Poor' = 'Average';
    if (fairnessScore >= 80) rating = 'Excellent';
    else if (fairnessScore >= 60) rating = 'Good';
    else if (fairnessScore >= 40) rating = 'Average';
    else rating = 'Poor';

    return {
      fairnessScore: Math.round(fairnessScore),
      rating
    };
  }
};

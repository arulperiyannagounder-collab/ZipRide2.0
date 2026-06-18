export type VehicleType = 'Bike' | 'Auto' | 'Mini Cab' | 'Sedan' | 'SUV';

export interface FareProfile {
  id: VehicleType;
  label: string;
  description: string;
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  capacity: string;
}

export const VEHICLE_FARE_PROFILES: FareProfile[] = [
  { id: 'Bike', label: 'Bike', description: 'Fastest low-cost ride', baseFare: 25, perKmRate: 8, perMinRate: 1.0, capacity: '1 rider' },
  { id: 'Auto', label: 'Auto', description: 'Balanced city commute', baseFare: 40, perKmRate: 12, perMinRate: 1.5, capacity: '3 riders' },
  { id: 'Mini Cab', label: 'Mini Cab', description: 'Budget friendly cab', baseFare: 70, perKmRate: 15, perMinRate: 2.0, capacity: '4 riders' },
  { id: 'Sedan', label: 'Sedan', description: 'Premium sedan comfort', baseFare: 90, perKmRate: 18, perMinRate: 2.5, capacity: '4 riders' },
  { id: 'SUV', label: 'SUV', description: 'Spacious 6-seater utility', baseFare: 120, perKmRate: 24, perMinRate: 3.5, capacity: '6 riders' }
];

export interface FareBreakdown {
  base: number;
  distFare: number;
  timeFare: number;
  
  // Impact Breakdown (Raw and Capped)
  trafficImpactRaw: number;
  trafficImpact: number;
  
  weatherImpactRaw: number;
  weatherImpact: number;
  
  fuelImpactRaw: number;
  fuelImpact: number;
  
  demandImpactRaw: number;
  demandImpact: number;

  nightSurcharge: number;
  toll: number;
  platformFee: number;
  tax: number;
  
  // Total details
  subtotal: number;
  total: number;
  
  // Fairness Analytics
  capLevel: 'Normal' | 'Moderate' | 'Extreme';
  maxCapPercent: number;
  actualSurchargePercent: number;
  isCapped: boolean;
  fairnessScore: number; // 0-100 indicating how "fair" and stable the pricing is
}

export class FareEngine {
  /**
   * Computes the final fare using dynamic factors and applies regulatory caps.
   * Caps: Normal (0-10%), Moderate (10-20%), Extreme (max 25%) surcharges.
   */
  public static calculateFare(
    dist: number,
    dur: number,
    trafficLevel: 'Light' | 'Moderate' | 'Heavy' | 'Severe' | 'Gridlock' | string,
    weatherRiskScore: number, // 0-100
    weatherText: string,
    demandFactor: number, // e.g. 1.0 - 1.5
    toll: number,
    vehicleId: VehicleType
  ): FareBreakdown {
    const profile = VEHICLE_FARE_PROFILES.find(p => p.id === vehicleId) || VEHICLE_FARE_PROFILES[0];
    const base = profile.baseFare;
    const distFare = Number((dist * profile.perKmRate).toFixed(2));
    const timeFare = Number((dur * profile.perMinRate).toFixed(2));

    // Base cost before dynamic surcharges
    const baseCost = base + distFare + timeFare;

    // 1. Traffic Impact (Raw)
    let trafficMultiplier = 1.0;
    const tl = trafficLevel.toLowerCase();
    if (tl.includes('moderate')) trafficMultiplier = 1.1;
    else if (tl.includes('heavy') || tl.includes('severe') || tl.includes('congestion')) trafficMultiplier = 1.3;
    else if (tl.includes('gridlock')) trafficMultiplier = 1.5;
    const trafficImpactRaw = (distFare + timeFare) * (trafficMultiplier - 1.0);

    // 2. Weather Impact (Raw)
    let weatherSurcharge = 0;
    const wt = weatherText.toLowerCase();
    if (wt.includes('overcast') || wt.includes('clouds') || wt.includes('mist') || wt.includes('haze') || wt.includes('fog')) {
      weatherSurcharge = 10;
    } else if (wt.includes('rain') || wt.includes('drizzle')) {
      weatherSurcharge = 30;
    } else if (wt.includes('storm') || wt.includes('thunderstorm') || wt.includes('snow') || wt.includes('extreme')) {
      weatherSurcharge = 50;
    }
    // Also factor in risk score
    const weatherImpactRaw = weatherSurcharge + (weatherRiskScore / 100) * 20;

    // 3. Fuel Impact (Raw)
    let fuelPerKm = 0.02; // Bike liters/km
    let idleConsumption = 0.005; // Bike liters/min
    if (vehicleId === 'Auto') {
      fuelPerKm = 0.04;
      idleConsumption = 0.01;
    } else if (vehicleId === 'Mini Cab') {
      fuelPerKm = 0.06;
      idleConsumption = 0.015;
    } else if (vehicleId === 'Sedan') {
      fuelPerKm = 0.08;
      idleConsumption = 0.02;
    } else if (vehicleId === 'SUV') {
      fuelPerKm = 0.10;
      idleConsumption = 0.03;
    }
    const fuelUsage = (fuelPerKm * dist) + (idleConsumption * Math.max(0, dur - (dist / 40 * 60)));
    const fuelCost = fuelUsage * 102.50;
    const fuelImpactRaw = Number((fuelCost * 0.4).toFixed(2)); // 40% subsidy

    // 4. Demand Impact (Raw)
    const demandImpactRaw = baseCost * Math.max(0, demandFactor - 1.0);

    // Determine Cap Level based on environment severity
    let capLevel: 'Normal' | 'Moderate' | 'Extreme' = 'Normal';
    let maxCapPercent = 10; // Normal: 10% max increase

    const isExtremeTraffic = tl.includes('severe') || tl.includes('gridlock');
    const isExtremeWeather = weatherRiskScore > 75 || wt.includes('storm') || wt.includes('thunderstorm') || wt.includes('extreme');
    const isExtremeDemand = demandFactor >= 1.3;

    const isModerateTraffic = tl.includes('heavy') || tl.includes('congestion');
    const isModerateWeather = weatherRiskScore > 40 || wt.includes('rain') || wt.includes('drizzle');
    const isModerateDemand = demandFactor >= 1.15;

    if (isExtremeTraffic || isExtremeWeather || isExtremeDemand) {
      capLevel = 'Extreme';
      maxCapPercent = 25; // max 25%
    } else if (isModerateTraffic || isModerateWeather || isModerateDemand) {
      capLevel = 'Moderate';
      maxCapPercent = 20; // 10-20%
    }

    // Maximum surcharge amount allowed
    const maxSurchargeAllowed = baseCost * (maxCapPercent / 100);

    // Sum of raw surcharges
    const rawSurchargeSum = trafficImpactRaw + weatherImpactRaw + fuelImpactRaw + demandImpactRaw;

    // Apply cap proportionality if raw sum exceeds the max allowed
    const isCapped = rawSurchargeSum > maxSurchargeAllowed;
    const scaleFactor = isCapped ? (maxSurchargeAllowed / rawSurchargeSum) : 1.0;

    const trafficImpact = Number((trafficImpactRaw * scaleFactor).toFixed(2));
    const weatherImpact = Number((weatherImpactRaw * scaleFactor).toFixed(2));
    const fuelImpact = Number((fuelImpactRaw * scaleFactor).toFixed(2));
    const demandImpact = Number((demandImpactRaw * scaleFactor).toFixed(2));

    const cappedSurchargeSum = trafficImpact + weatherImpact + fuelImpact + demandImpact;
    const actualSurchargePercent = baseCost > 0 ? Number(((cappedSurchargeSum / baseCost) * 100).toFixed(1)) : 0;

    // Day/Night Surcharge (10 PM to 6 AM) - not capped under dynamic surge rules, standard flat rate
    const hour = new Date().getHours();
    const isNight = hour >= 22 || hour < 6;
    const nightSurcharge = isNight ? 30.00 : 0.00;

    const platformFee = 7.00;
    const subtotal = baseCost + cappedSurchargeSum + nightSurcharge + toll + platformFee;
    const tax = Number((subtotal * 0.18).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));

    // Calculate fairness score (higher is fairer, decreases with higher surge and capping)
    // Capping actually protects the user, so a cap active increases the fairness relative to raw surge!
    let fairnessScore = 100 - (actualSurchargePercent * 1.5);
    if (isCapped) {
      fairnessScore += 10; // bonus for applying cap protection
    }
    fairnessScore = Math.max(50, Math.min(100, Math.round(fairnessScore)));

    return {
      base,
      distFare,
      timeFare,
      trafficImpactRaw,
      trafficImpact,
      weatherImpactRaw,
      weatherImpact,
      fuelImpactRaw,
      fuelImpact,
      demandImpactRaw,
      demandImpact,
      nightSurcharge,
      toll,
      platformFee,
      tax,
      subtotal,
      total,
      capLevel,
      maxCapPercent,
      actualSurchargePercent,
      isCapped,
      fairnessScore
    };
  }
}

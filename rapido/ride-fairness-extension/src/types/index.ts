export interface FareBreakdown {
  baseFare?: number;
  distanceCharge?: number;
  timeCharge?: number;
  tolls?: number;
  platformFee?: number;
  gst?: number;
  surge?: number;
  discount?: number;
  lockedFare?: number;
}

export interface RideData {
  provider: string;
  vehicleType: string;
  fare: number;
  distance: number;
  eta: number;
  surgeDetected: boolean;
  timestamp: number;
  breakdown?: FareBreakdown;
}

export interface RideOption {
  vehicleType: string;
  fare: number;
  eta: number;
  breakdown?: FareBreakdown;
}

export interface RideDetails {
  provider: string;
  options: RideOption[];
  distance: number;
  surgeDetected: boolean;
  timestamp: number;
  breakdown?: FareBreakdown;
}

export interface FairPriceAnalysis {
  expectedFare: number;
  actualFare: number;
  difference: number;
  savings: number;
  status: 'UNDERPRICED' | 'FAIR' | 'OVERPRICED';
  pricingStatus: 'UNDERPRICED' | 'FAIR' | 'OVERPRICED';
}

export interface RoadIntelligence {
  trafficLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE';
  congestionScore: number;
  weatherImpact: string;
  expectedDelay: number;
}

export interface TransparencyAnalysis {
  transparencyScore: number;
  reasons: string[];
}

export interface FairnessAnalysis {
  fairnessScore: number;
  rating: 'Excellent' | 'Good' | 'Average' | 'Poor';
}

export interface FarePolicyReport {
  transparentCharges: boolean;
  noHiddenCharges: boolean;
  noSurge: boolean;
  clearDistanceCalculation: boolean;
  clearTimeCalculation: boolean;
}

export interface RideHistoryEntry {
  id: string;
  date: number;
  provider: string;
  fare: number;
  expectedFare: number;
  savings: number;
  fairnessScore: number;
}

export interface UserSettings {
  distanceRate: number; // Cost per km
  timeRate: number;     // Cost per minute
  baseFare: number;
  fixedServiceFee: number; // Platform Booking Fee
  transparencySensitivity: number; // 0-100
  darkMode: boolean;
  
  // Advanced Calibration Settings
  trafficMultiplier: number;  // Multiplier for high traffic (1.0 to 2.5)
  nightSurgeRate: number;     // Multiplier for late night rides (1.0 to 2.0)
  tollRate: number;           // Estimated average toll charges (INR)
  fuelAdjustment: number;     // Fuel price adjustment per km (INR, negative or positive)
  estimatedSpeed: number;     // Estimated speed in km/h for time estimations (10 to 60)
}

export interface SearchParams {
  source: string;
  destination: string;
}

export interface AggregatedResult {
  provider: string;
  status: 'loading' | 'completed' | 'failed';
  details?: RideDetails;
  fairnessScore?: number;
  transparencyScore?: number;
  fairPriceAnalysis?: FairPriceAnalysis;
  expectedFare?: number;
  estimatedDistance?: number;
  estimatedDuration?: number;
}

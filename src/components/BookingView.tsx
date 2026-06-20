import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  CircleDot, 
  Smartphone, 
  Wallet, 
  CreditCard, 
  ShieldAlert, 
  Zap, 
  IndianRupee,
  ShieldCheck,
  Compass,
  Thermometer,
  Wind,
  Droplets,
  AlertTriangle,
  TrafficCone,
  Info,
  CheckCircle2,
  Bike,
  Car,
  Gauge,
  Menu,
  X,
  CloudRain
} from 'lucide-react';
import { Ride, SystemConfig } from '../types';
import LiveJourneyMap from './LiveJourneyMap';
import { FareEngine, VehicleType, VEHICLE_FARE_PROFILES } from '../services/FareEngine';
import { WeatherIntelligenceService } from '../services/WeatherIntelligenceService';
import RideMatePanel from './RideMatePanel';
import { FamilySafetyModule } from '../services/FamilySafetyModule';
import { ChildSafetyModule } from '../services/ChildSafetyModule';
import { WomenSafetyModule } from '../services/WomenSafetyModule';
import { ZipRideRepository } from '../services/dbInterface';
import { SessionResetService } from '../services/SessionResetService';


// Props matching main app expectation
interface BookingViewProps {
  systemConfig: SystemConfig;
  onBookRide: (pickup: string, drop: string, paymentMethod: 'UPI' | 'Wallet' | 'Card', extraData?: any) => Promise<Ride>;
  onSelectTab: (tab: string) => void;
}

// Fallback search database of master Indian landmarks/cities
const ALL_INDIA_METROS_LOCATIONS = [
  // Mumbai metro region
  "Andheri West Metro, Mumbai, MH",
  "Bandra Kurla Complex (BKC), Mumbai, MH",
  "Powai Tech Park, Mumbai, MH",
  "Juhu Promenade Beach, Mumbai, MH",
  "Lower Parel High-Street, Mumbai, MH",
  "Colaba Causeway Gate, Mumbai, MH",
  "Worli Sea Face Point, Mumbai, MH",
  "Chhatrapati Shivaji Terminal (CST), Mumbai, MH",
  "Dadar Central Circle, Mumbai, MH",
  "Mulund Sonapur Junction, Mumbai, MH",
  "Thane Teen Hath Naka, Mumbai, MH",
  "Navi Mumbai Vashi Station, Mumbai, MH",
  
  // Delhi NCR
  "Connaught Place Central Block, New Delhi, DL",
  "Indira Gandhi International Airport Terminal 3, New Delhi, DL",
  "Rajiv Chowk Metro Hub, Delhi, DL",
  "Cyber City Business Park, Gurugram, HR",
  "Noida Sector 18 Market Exchange, Noida, UP",
  "Qutub Minar Archaeological Site, New Delhi, DL",
  "Red Fort Lahori Gate, Delhi, DL",
  "Greater Noida Pari Chowk, Delhi NCR, UP",
  "Dwarka Sector 21 Metro, New Delhi, DL",
  
  // Bangalore
  "Indiranagar 100 Feet Boulevard, Bengaluru, KA",
  "Koramangala 3rd Block Complex, Bengaluru, KA",
  "Whitefield ITPL Tech Terminal, Bengaluru, KA",
  "Electronic City Phase 1 Main Entrance, Bengaluru, KA",
  "Kempegowda International Airport Terminal, Bengaluru, KA",
  "MG Road Metro Intersection, Bengaluru, KA",
  "Cubbon Park Rose Arch, Bengaluru, KA",
  "HSR Layout 5th Main, Bengaluru, KA",
  "Jayanagar 4th Block, Bengaluru, KA",
  
  // Chennai & Coimbatore
  "Gandhipuram Town Central Bus Stand, Coimbatore, TN",
  "RS Puram East Club Road, Coimbatore, TN",
  "Nila Road Junction, Coimbatore, TN",
  "Marina Beach Lighthouse point, Chennai, TN",
  "T Nagar Ranganathan Shopping Lane, Chennai, TN",
  "Adyar Signal Crossing, Chennai, TN",
  "Guindy Industrial Gate, Chennai, TN",
  "Coimbatore Airport (CJB), Peelamedu, TN",
  "Vadapalani Metro Station, Chennai, TN",
  
  // Hyderabad
  "HITEC City Cyber Towers, Hyderabad, TG",
  "Gachibowli Outer Crossing, Hyderabad, TG",
  "Secunderabad Station Main Terminal, Hyderabad, TG",
  "Charminar Heritage Arch, Hyderabad, TG",
  "Banjara Hills Avenue Road, Hyderabad, TG",
  "Jubilee Hills Checkpost, Hyderabad, TG",
  
  // Pune & Maharashtra
  "Koregaon Park Road 1 Lane, Pune, MH",
  "Viman Nagar IT Hub, Pune, MH",
  "Hhinjewadi Phase 2 Crossing, Pune, MH",
  "Pune Junction Railway Terminal, Pune, MH",
  "Deccan Gymkhana Circle, Pune, MH",
  "Nagpur Zero Mile Monument, Nagpur, MH",
  "Nashik Panchavati Temple Area, Nashik, MH",
  
  // Kolkata & West Bengal
  "Park Street Shopping Corridor, Kolkata, WB",
  "Salt Lake Sector V, Kolkata, WB",
  "Howrah Bridge Entrance, Kolkata, WB",
  "New Market Esplanade, Kolkata, WB",
  "Dum Dum Netaji Subhash Airport, Kolkata, WB",
  
  // Northern India (Agra, Jaipur, Lucknow, Chandigarh, Varanasi, Amritsar)
  "Taj Mahal West Gate, Agra, UP",
  "Hawa Mahal Palace Road, Jaipur, RJ",
  "Hazratganj Multi-Level Block, Lucknow, UP",
  "Rock Garden Sector 1, Chandigarh, CH",
  "Kashi Vishwanath Corridor, Varanasi, UP",
  "Golden Temple Heritage Plaza, Amritsar, PB",
  "Amritsar Junction Main, Amritsar, PB",
  "Bara Imambara Gate, Lucknow, UP",
  "Jaipur Junction Center, Jaipur, RJ",
  "Shimla Mall Road Tourist Post, Shimla, HP",
  "Dehradun Clock Tower Crossing, Dehradun, UK",
  "Jammu Tawi Railway Station Office, Jammu, JK",

  // Western India (Ahmedabad, Surat, Vadodara, Rajkot, Goa, Udaipur)
  "Sabarmati Ashram Riverfront, Ahmedabad, GJ",
  "Surat Textile Market Hub, Surat, GJ",
  "Alkapuri commercial lane, Vadodara, GJ",
  "Panaji Church Square Plaza, Panaji, GA",
  "Calangute Beach Promenade, Goa, GA",
  "Lake Pichola Ambrai Ghat, Udaipur, RJ",
  "Udaipur Railway Junction Town, Udaipur, RJ",
  "Baga Beach Coast Lane, Baga, GA",

  // Southern India (Kochi, Trivandrum, Kozhikode, Visakhapatnam, Mysore, Madurai)
  "Fort Kochi Chinese Fishing Nets, Kochi, KL",
  "Lulu Mall Edappally Intersection, Kochi, KL",
  "Trivandrum central Temple Gate, Thiruvananthapuram, KL",
  "Calicut Beach Bypass Junction, Kozhikode, KL",
  "Mysore Palace North Arch Gate, Mysuru, KA",
  "Meenakshi Amman East Chitra Street, Madurai, TN",
  "Visakhapatnam RK Beach Road, Visakhapatnam, AP",
  "Vijayawada Benz Circle Exchange, Vijayawada, AP",

  // Eastern & Central India (Patna, Ranchi, Raipur, Bhubaneswar, Bhopal, Indore, Guwahati)
  "Gandhi Maidan Golghar Circle, Patna, BR",
  "Ranchi Main Albert Ekka Chowk, Ranchi, JH",
  "Raipur Marine Drive Telibandha, Raipur, CG",
  "Bhubaneswar Master Canteen Junction, Bhubaneswar, OD",
  "Lake View Upper Boat Club, Bhopal, MP",
  "Indore Chappan Dukan Food Lane, Indore, MP",
  "Indore Junction Station Front, Indore, MP",
  "Guwahati Paltan Bazar Junction, Guwahati, AS",
  "Shillong Police Bazar Circle, Shillong, ML"
];

interface Coords {
  lat: number;
  lng: number;
}

interface WeatherReport {
  temp: number;
  weatherText: string;
  windSpeed: number;
  humidity: number;
  rainChance?: number;
  weatherMultiplier?: number;
  isDay?: boolean;
}

interface BookingRouteChoice {
  id: string;
  name: string;
  label: string;
  badge: string;
  distanceKm: number;
  durationMin: number;
  traffic: 'Light' | 'Moderate' | 'Heavy' | 'Severe';
  fuelUsageLiters: number;
  fuelCost: number;
  tollCharges: number;
  platformFee: number;
  tax: number;
  totalFare: number;
  recommendation: string;
  fareBreakdown?: any;
  roadHealthScore: number;
  weatherRiskScore: number;
}


interface PlaceSuggestion {
  name: string;
  district?: string;
  state?: string;
  lat: number;
  lng: number;
}

const LOCAL_LANDMARK_SUGGESTIONS: PlaceSuggestion[] = [
  { name: "Karpagam College of Engineering", district: "Coimbatore", state: "Tamil Nadu", lat: 10.8784, lng: 77.0227 },
  { name: "Karpagam Institute of Technology", district: "Coimbatore", state: "Tamil Nadu", lat: 10.8815, lng: 77.0253 },
  { name: "Karpagam Academy of Higher Education", district: "Coimbatore", state: "Tamil Nadu", lat: 10.8798, lng: 77.0235 },
  { name: "Karpaga Vinayaga College of Engineering and Technology", district: "Chengalpattu", state: "Tamil Nadu", lat: 12.4487, lng: 79.8874 },
  { name: "Karpaga Vinayagar Temple", district: "Coimbatore", state: "Tamil Nadu", lat: 10.9392, lng: 77.0019 },
  { name: "Gandhipuram Town Central Bus Stand", district: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558 },
  { name: "Gandhi Park", district: "Coimbatore", state: "Tamil Nadu", lat: 11.0054, lng: 76.9471 },
  { name: "Gandhinagar", district: "Gandhinagar", state: "Gujarat", lat: 23.2156, lng: 72.6369 },
  { name: "Gandhi Nagar", district: "Bengaluru Urban", state: "Karnataka", lat: 12.9784, lng: 77.5800 },
  { name: "Mahatma Gandhi Road", district: "Bengaluru Urban", state: "Karnataka", lat: 12.9756, lng: 77.6068 },
  { name: "Gandhi Maidan", district: "Patna", state: "Bihar", lat: 25.6170, lng: 85.1456 },
  { name: "Gandhi Museum", district: "Madurai", state: "Tamil Nadu", lat: 9.9252, lng: 78.1388 }
];

const formatSuggestion = (suggestion: PlaceSuggestion) => {
  return [suggestion.name, suggestion.district, suggestion.state].filter(Boolean).join(", ");
};

const getLocalSuggestions = (query: string): PlaceSuggestion[] => {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const metroMatches = ALL_INDIA_METROS_LOCATIONS
    .filter(location => location.toLowerCase().includes(q))
    .map(location => {
      const coords = getFallbackIndianCoords(location);
      return {
        name: location.split(",")[0].trim(),
        district: location.split(",")[1]?.trim() || "India",
        state: location.split(",")[2]?.trim() || "India",
        lat: coords.lat,
        lng: coords.lng
      };
    });

  return [...LOCAL_LANDMARK_SUGGESTIONS, ...metroMatches].filter(place => {
    const label = formatSuggestion(place).toLowerCase();
    return label.includes(q);
  });
};

// Full database of known precise coordinates for standard landmark nodes in India
const KNOWN_COORDINATES: Record<string, Coords> = {
  "dadar station, mumbai": { lat: 19.0178, lng: 72.8478 },
  "juhu beach, mumbai": { lat: 19.1000, lng: 72.8258 },
  "andheri station, mumbai": { lat: 19.1136, lng: 72.8697 },
  "bkc, mumbai": { lat: 19.0700, lng: 72.8650 },
  "lower parel, mumbai": { lat: 19.0016, lng: 72.8277 },
  "churchgate station, mumbai": { lat: 18.9322, lng: 72.8264 },
  "marine drive, mumbai": { lat: 18.9440, lng: 72.8230 },
  "bandra west, mumbai": { lat: 19.0596, lng: 72.8295 },
  "powai lake, mumbai": { lat: 19.1300, lng: 72.9050 },
  "gandhipuram town central bus stand": { lat: 11.0168, lng: 76.9558 },
  "gandhi park, coimbatore": { lat: 11.0054, lng: 76.9471 },
  "karpagam college of engineering": { lat: 10.8784, lng: 77.0227 },
  "karpagam institute of technology": { lat: 10.8815, lng: 77.0253 },
  "karpagam academy of higher education": { lat: 10.8798, lng: 77.0235 },
  "coimbatore": { lat: 11.0168, lng: 76.9558 },
  "othakalmandapam": { lat: 10.8715, lng: 77.0210 }
};

// Full database of precise pre-calculated distance (Km) and travel duration (minutes) for common standard journeys
const STANDARD_ROUTES: Record<string, { distance: number; duration: number }> = {
  "dadar station, mumbai|juhu beach, mumbai": { distance: 14.5, duration: 35.0 },
  "juhu beach, mumbai|dadar station, mumbai": { distance: 14.5, duration: 35.0 },
  
  "andheri station, mumbai|bkc, mumbai": { distance: 18.2, duration: 44.0 },
  "bkc, mumbai|andheri station, mumbai": { distance: 18.2, duration: 44.0 },
  
  "lower parel, mumbai|bkc, mumbai": { distance: 5.4, duration: 15.0 },
  "bkc, mumbai|lower parel, mumbai": { distance: 5.4, duration: 15.0 },
  
  "churchgate station, mumbai|marine drive, mumbai": { distance: 4.5, duration: 12.0 },
  "marine drive, mumbai|churchgate station, mumbai": { distance: 4.5, duration: 12.0 }
};

// Haversine calculator to get accurate line distance in Km
const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Number(distance.toFixed(2));
};

// Map fallback coordinates for Indian cities
const getFallbackIndianCoords = (address: string): Coords => {
  const addr = address.toLowerCase();
  
  // Try exact lookup from known locations first to guarantee 100% coordinate precision
  for (const [key, value] of Object.entries(KNOWN_COORDINATES)) {
    if (addr.includes(key) || key.includes(addr)) {
      return value;
    }
  }
  
  if (addr.includes("delhi") || addr.includes("noida") || addr.includes("gurugram")) {
    return { lat: 28.6139 + (Math.random() - 0.5) * 0.04, lng: 77.2090 + (Math.random() - 0.5) * 0.04 };
  } else if (addr.includes("bangalore") || addr.includes("bengaluru")) {
    return { lat: 12.9716 + (Math.random() - 0.5) * 0.04, lng: 77.5946 + (Math.random() - 0.5) * 0.04 };
  } else if (addr.includes("coimbatore") || addr.includes("gandhipuram")) {
    return { lat: 11.0168 + (Math.random() - 0.5) * 0.015, lng: 76.9558 + (Math.random() - 0.5) * 0.015 };
  } else if (addr.includes("chennai") || addr.includes("vadapalani") || addr.includes("adyar")) {
    return { lat: 13.0827 + (Math.random() - 0.5) * 0.04, lng: 80.2707 + (Math.random() - 0.5) * 0.04 };
  } else if (addr.includes("hyderabad")) {
    return { lat: 17.3850 + (Math.random() - 0.5) * 0.04, lng: 78.4867 + (Math.random() - 0.5) * 0.04 };
  } else if (addr.includes("pune") || addr.includes("hinjewadi")) {
    return { lat: 18.5204 + (Math.random() - 0.5) * 0.04, lng: 73.8567 + (Math.random() - 0.5) * 0.04 };
  } else if (addr.includes("kolkata")) {
    return { lat: 22.5726 + (Math.random() - 0.5) * 0.04, lng: 88.3639 + (Math.random() - 0.5) * 0.04 };
  } else if (addr.includes("jaipur")) {
    return { lat: 26.9124 + (Math.random() - 0.5) * 0.03, lng: 75.7873 + (Math.random() - 0.5) * 0.03 };
  } else if (addr.includes("lucknow")) {
    return { lat: 26.8467 + (Math.random() - 0.5) * 0.03, lng: 80.9462 + (Math.random() - 0.5) * 0.03 };
  } else if (addr.includes("chandigarh")) {
    return { lat: 30.7333 + (Math.random() - 0.5) * 0.03, lng: 76.7794 + (Math.random() - 0.5) * 0.03 };
  } else if (addr.includes("amritsar")) {
    return { lat: 31.6340 + (Math.random() - 0.5) * 0.03, lng: 74.8723 + (Math.random() - 0.5) * 0.03 };
  } else if (addr.includes("agra")) {
    return { lat: 27.1767 + (Math.random() - 0.5) * 0.03, lng: 78.0081 + (Math.random() - 0.5) * 0.03 };
  } else if (addr.includes("ahmedabad") || addr.includes("surat") || addr.includes("vadodara")) {
    return { lat: 23.0225 + (Math.random() - 0.5) * 0.03, lng: 72.5714 + (Math.random() - 0.5) * 0.03 };
  } else if (addr.includes("goa") || addr.includes("panaji")) {
    return { lat: 15.4909 + (Math.random() - 0.5) * 0.03, lng: 73.8278 + (Math.random() - 0.5) * 0.03 };
  } else if (addr.includes("kochi") || addr.includes("trivandrum") || addr.includes("calicut")) {
    return { lat: 9.9312 + (Math.random() - 0.5) * 0.03, lng: 76.2673 + (Math.random() - 0.5) * 0.03 };
  } else if (addr.includes("patna")) {
    return { lat: 25.5941 + (Math.random() - 0.5) * 0.03, lng: 85.1376 + (Math.random() - 0.5) * 0.03 };
  } else if (addr.includes("bhubaneswar")) {
    return { lat: 20.2961 + (Math.random() - 0.5) * 0.03, lng: 85.8245 + (Math.random() - 0.5) * 0.03 };
  } else if (addr.includes("bhopal") || addr.includes("indore")) {
    return { lat: 22.7196 + (Math.random() - 0.5) * 0.03, lng: 75.8577 + (Math.random() - 0.5) * 0.03 };
  } else if (addr.includes("guwahati") || addr.includes("shillong")) {
    return { lat: 26.1445 + (Math.random() - 0.5) * 0.03, lng: 91.7362 + (Math.random() - 0.5) * 0.03 };
  }
  
  // Default to Mumbai
  return { lat: 19.0760 + (Math.random() - 0.5) * 0.05, lng: 72.8777 + (Math.random() - 0.5) * 0.05 };
};

// Fetch Weather details from backend WeatherAPI proxy
const fetchWeatherDetails = async (lat: number, lng: number): Promise<WeatherReport> => {
  try {
    const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
    if (res.ok) {
      const data = await res.json();
      return {
        temp: typeof data.temp === 'number' ? data.temp : 28,
        weatherText: data.weatherText || "Clear",
        windSpeed: typeof data.windSpeed === 'number' ? data.windSpeed : 10,
        humidity: typeof data.humidity === 'number' ? data.humidity : 55,
        rainChance: typeof data.rainChance === 'number' ? data.rainChance : 0,
        weatherMultiplier: typeof data.weatherMultiplier === 'number' ? data.weatherMultiplier : 1.0
      };
    }
  } catch (err) {
    console.warn("Weather forecast fetch error:", err);
  }
  return { temp: 28, weatherText: "Clear & Sunny", windSpeed: 10, humidity: 55, rainChance: 0, weatherMultiplier: 1.0 };
};

const getLockedFareForRoute = (idx: number, vehicleId: VehicleType, calculatedBaseFare: number): number => {
  if (vehicleId === 'Bike') {
    if (idx === 0) return 120;
    if (idx === 1) return 140;
    if (idx === 2) return 110;
    if (idx === 3) return 135;
  } else if (vehicleId === 'Auto') {
    if (idx === 0) return 180;
    if (idx === 1) return 210;
    if (idx === 2) return 165;
    if (idx === 3) return 200;
  } else { // Cabs / Sedan / SUV
    if (idx === 0) return 300;
    if (idx === 1) return 350;
    if (idx === 2) return 275;
    if (idx === 3) return 330;
  }
  return calculatedBaseFare;
};

export default function BookingView({
  systemConfig,
  onBookRide,
  onSelectTab
}: BookingViewProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const apiKey = "";
  const hasValidKey = false;
  
  const [pickup, setPickup] = useState(() => localStorage.getItem('zipride_booking_pickup') || '');
  const [drop, setDrop] = useState(() => localStorage.getItem('zipride_booking_drop') || '');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>(() => (localStorage.getItem('zipride_booking_vehicle') as VehicleType) || 'Bike');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Wallet' | 'Card'>(() => (localStorage.getItem('zipride_booking_payment_method') as any) || 'UPI');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const pickupRef = React.useRef<HTMLInputElement>(null);
  const dropRef = React.useRef<HTMLInputElement>(null);

  const [isActiveField, setIsActiveField] = useState<'pickup' | 'drop' | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<PlaceSuggestion[]>([]);
  const [dropSuggestions, setDropSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFare, setShowFare] = useState(() => {
    const saved = localStorage.getItem('zipride_routes_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.length > 0;
      } catch (e) {}
    }
    return false;
  });

  // Safety modes states
  const [familySafetyActive, setFamilySafetyActive] = useState(() => localStorage.getItem('zipride_family_safety_active') === 'true');
  const [childSafetyActive, setChildSafetyActive] = useState(() => localStorage.getItem('zipride_child_safety_active') === 'true');
  const [womenSafetyActive, setWomenSafetyActive] = useState(() => localStorage.getItem('zipride_women_safety_active') === 'true');
  const [accessibilityOverride, setAccessibilityOverride] = useState<string[]>([]);

  // Load accessibility overrides from profile
  useEffect(() => {
    const prof = ZipRideRepository.getProfile();
    if (prof.accessibilityRequirements) {
      setAccessibilityOverride(prof.accessibilityRequirements);
    }
  }, []);

  // Verification states for inputs
  const [selectedPickup, setSelectedPickup] = useState(() => localStorage.getItem('zipride_booking_selected_pickup') || '');
  const [selectedDrop, setSelectedDrop] = useState(() => localStorage.getItem('zipride_booking_selected_drop') || '');
  const [isPickupVerified, setIsPickupVerified] = useState(() => localStorage.getItem('zipride_booking_pickup_verified') === 'true');
  const [isDropVerified, setIsDropVerified] = useState(() => localStorage.getItem('zipride_booking_drop_verified') === 'true');

  // Rebook auto-fill loader hook
  useEffect(() => {
    const p = localStorage.getItem('zipride_rebook_pickup');
    const d = localStorage.getItem('zipride_rebook_drop');
    if (p && d) {
      setPickup(p);
      setSelectedPickup(p);
      setIsPickupVerified(true);
      
      setDrop(d);
      setSelectedDrop(d);
      setIsDropVerified(true);

      // Resolve and set correct coordinates from local suggestions or known list immediately
      const pCoords = getFallbackIndianCoords(p);
      setPickupCoords(pCoords);
      const dCoords = getFallbackIndianCoords(d);
      setDropCoords(dCoords);
      
      // Clear out stored values
      localStorage.removeItem('zipride_rebook_pickup');
      localStorage.removeItem('zipride_rebook_drop');
    }
  }, []);

  // Monitor verification state based on selection or exact fallback lookup
  useEffect(() => {
    const val = pickup.trim().toLowerCase();
    if (!val) {
      setIsPickupVerified(false);
      return;
    }
    const isSelected = String(selectedPickup || '').toLowerCase() === val;
    setIsPickupVerified(isSelected);
  }, [pickup, selectedPickup]);

  useEffect(() => {
    const val = drop.trim().toLowerCase();
    if (!val) {
      setIsDropVerified(false);
      return;
    }
    const isSelected = String(selectedDrop || '').toLowerCase() === val;
    setIsDropVerified(isSelected);
  }, [drop, selectedDrop]);

  useEffect(() => {
    const activeValue = isActiveField === 'pickup' ? pickup : isActiveField === 'drop' ? drop : '';
    const query = activeValue.trim();

    if (!isActiveField || query.length < 2) {
      if (isActiveField === 'pickup') setPickupSuggestions([]);
      if (isActiveField === 'drop') setDropSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const localMatches = getLocalSuggestions(query);
        let apiMatches: PlaceSuggestion[] = [];

        const res = await fetch(`/api/geographic/suggest?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            apiMatches = data
              .filter(item => item && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)))
              .map(item => ({
                name: String(item.name || "Unknown place"),
                district: item.district ? String(item.district) : undefined,
                state: item.state ? String(item.state) : undefined,
                lat: Number(item.lat),
                lng: Number(item.lng)
              }));
          }
        }

        const seen = new Set<string>();
        const merged = [...localMatches, ...apiMatches].filter(item => {
          const key = formatSuggestion(item).toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 8);

        if (!cancelled) {
          if (isActiveField === 'pickup') setPickupSuggestions(merged);
          if (isActiveField === 'drop') setDropSuggestions(merged);
        }
      } catch (err) {
        const fallbackMatches = getLocalSuggestions(query).slice(0, 8);
        if (!cancelled) {
          if (isActiveField === 'pickup') setPickupSuggestions(fallbackMatches);
          if (isActiveField === 'drop') setDropSuggestions(fallbackMatches);
        }
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pickup, drop, isActiveField]);

  // Real-time locations coordinates
  const [pickupCoords, setPickupCoords] = useState<Coords>(() => {
    const saved = localStorage.getItem('zipride_booking_pickup_coords');
    return saved ? JSON.parse(saved) : { lat: 11.0168, lng: 76.9558 };
  });
  const [dropCoords, setDropCoords] = useState<Coords>(() => {
    const saved = localStorage.getItem('zipride_booking_drop_coords');
    return saved ? JSON.parse(saved) : { lat: 10.9950, lng: 76.9609 };
  });

  const selectSuggestion = (field: 'pickup' | 'drop', suggestion: PlaceSuggestion) => {
    const label = formatSuggestion(suggestion);
    const coords = { lat: suggestion.lat, lng: suggestion.lng };

    if (field === 'pickup') {
      setPickup(label);
      setSelectedPickup(label);
      setPickupCoords(coords);
      setIsPickupVerified(true);
      setPickupSuggestions([]);
    } else {
      setDrop(label);
      setSelectedDrop(label);
      setDropCoords(coords);
      setIsDropVerified(true);
      setDropSuggestions([]);
    }

    setIsActiveField(null);
  };
  
  // Live weather details fetched from open-meteo
  const [weatherPickup, setWeatherPickup] = useState<WeatherReport | null>(null);
  const [weatherDrop, setWeatherDrop] = useState<WeatherReport | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Route Metrics
  const [calculatedDistance, setCalculatedDistance] = useState<number>(0);
  const [calculatedDuration, setCalculatedDuration] = useState<number>(0);
  const [distanceExceeded, setDistanceExceeded] = useState<boolean>(false);

  // Available routes list and selected index
  const [availableRoutes, setAvailableRoutes] = useState<BookingRouteChoice[]>(() => {
    const saved = localStorage.getItem('zipride_routes_list');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(() => {
    return Number(localStorage.getItem('zipride_selected_route_index') || '0');
  });

  useEffect(() => {
    localStorage.setItem('zipride_routes_list', JSON.stringify(availableRoutes || []));
  }, [availableRoutes]);

  useEffect(() => {
    localStorage.setItem('zipride_selected_route_index', selectedRouteIndex.toString());
  }, [selectedRouteIndex]);

  useEffect(() => {
    localStorage.setItem('zipride_booking_pickup', pickup);
  }, [pickup]);

  useEffect(() => {
    localStorage.setItem('zipride_booking_drop', drop);
  }, [drop]);

  useEffect(() => {
    localStorage.setItem('zipride_booking_selected_pickup', selectedPickup);
  }, [selectedPickup]);

  useEffect(() => {
    localStorage.setItem('zipride_booking_selected_drop', selectedDrop);
  }, [selectedDrop]);

  useEffect(() => {
    localStorage.setItem('zipride_booking_pickup_verified', isPickupVerified.toString());
  }, [isPickupVerified]);

  useEffect(() => {
    localStorage.setItem('zipride_booking_drop_verified', isDropVerified.toString());
  }, [isDropVerified]);

  useEffect(() => {
    localStorage.setItem('zipride_booking_pickup_coords', JSON.stringify(pickupCoords));
  }, [pickupCoords]);

  useEffect(() => {
    localStorage.setItem('zipride_booking_drop_coords', JSON.stringify(dropCoords));
  }, [dropCoords]);

  useEffect(() => {
    localStorage.setItem('zipride_booking_vehicle', selectedVehicle);
  }, [selectedVehicle]);

  useEffect(() => {
    localStorage.setItem('zipride_booking_payment_method', paymentMethod);
  }, [paymentMethod]);

  useEffect(() => {
    localStorage.setItem('zipride_family_safety_active', familySafetyActive.toString());
  }, [familySafetyActive]);

  useEffect(() => {
    localStorage.setItem('zipride_child_safety_active', childSafetyActive.toString());
  }, [childSafetyActive]);

  useEffect(() => {
    localStorage.setItem('zipride_women_safety_active', womenSafetyActive.toString());
  }, [womenSafetyActive]);

  const [hoveredRouteIndex, setHoveredRouteIndex] = useState<number | null>(null);
  const [activeRoutePath, setActiveRoutePath] = useState<Coords[]>([]);

  // Advanced Fare Calculation function
  const calculateRouteFare = (
    dist: number,
    dur: number,
    trafficLevel: 'Light' | 'Moderate' | 'Heavy' | 'Severe' | string,
    toll: number,
    vehicleId: VehicleType
  ) => {
    const weatherConditionText = weatherPickup?.weatherText || systemConfig.weather;
    const humidity = weatherPickup?.humidity || 55;
    const windSpeed = weatherPickup?.windSpeed || 10;
    const rainChance = weatherPickup?.rainChance || 0;
    const risk = WeatherIntelligenceService.calculateWeatherRisk(weatherConditionText, windSpeed, humidity, rainChance);

    let demandFactor = 1.0;
    if (trafficLevel.includes('Gridlock') || trafficLevel.includes('Severe')) demandFactor = 1.25;
    else if (trafficLevel.includes('Heavy') || trafficLevel.includes('Congestion')) demandFactor = 1.15;
    else if (trafficLevel.includes('Moderate')) demandFactor = 1.05;

    const breakdown = FareEngine.calculateFare(
      dist,
      dur,
      trafficLevel,
      risk.score,
      weatherConditionText,
      demandFactor,
      toll,
      vehicleId
    );

    // Map the breakdown fields to what the component expects
    return {
      base: breakdown.base,
      distFare: breakdown.distFare,
      timeFare: breakdown.timeFare,
      weatherSurcharge: breakdown.weatherImpact,
      trafficSurgeAmt: breakdown.trafficImpact,
      nightSurcharge: breakdown.nightSurcharge,
      fuelUsage: breakdown.fuelImpact / 40.0, // estimate usage from impact
      fuelCost: breakdown.fuelImpact / 0.4,   // reconstruct fuel cost from driver subsidy
      fuelAdjustment: breakdown.fuelImpact,
      toll: breakdown.toll,
      platformFee: breakdown.platformFee,
      tax: breakdown.tax,
      total: breakdown.total,
      farebreakdown: breakdown // attach full object for fairness meter
    };
  };

  // Speed breakers & traffic nodes
  const [speedbreakers, setSpeedbreakers] = useState<Array<{ id: string; name: string; position: Coords }>>([]);
  const [heavyTrafficPoints, setHeavyTrafficPoints] = useState<Array<{ id: string; position: Coords }>>([]);

  // Reset output when source or destination values are changed
  useEffect(() => {
    setShowFare(false);
    setDistanceExceeded(false);
  }, [pickup, drop]);

  // Geocode an address using Live API lookup with instant local memory coordinates
  const resolveCoordinates = async (address: string, isPickup: boolean): Promise<Coords> => {
    const targetVal = address.toLowerCase().trim();
    
    // If exact selected pickup/drop matches state cache, return directly for 100% precision!
    if (isPickup && pickupCoords && address === selectedPickup) {
      return pickupCoords;
    }
    if (!isPickup && dropCoords && address === selectedDrop) {
      return dropCoords;
    }

    try {
      const suggestRes = await fetch(`/api/geographic/suggest?q=${encodeURIComponent(address)}`);
      if (suggestRes.ok) {
        const matches = await suggestRes.json();
        if (matches && matches.length > 0) {
          const matched = matches[0];
          const coords = { lat: matched.lat, lng: matched.lng };
          if (isPickup) setPickupCoords(coords);
          else setDropCoords(coords);
          return coords;
        }
      }
    } catch (e) {
      console.warn("Resolve coordinates search failed, using fallback coordinates:", e);
    }

    // Check KNOWN_COORDINATES first to avoid randomizing coords for standard landmark nodes
    const cleanAddr = address.toLowerCase().trim();
    for (const [key, value] of Object.entries(KNOWN_COORDINATES)) {
      if (cleanAddr.includes(key) || key.includes(cleanAddr)) {
        if (isPickup) setPickupCoords(value);
        else setDropCoords(value);
        return value;
      }
    }

    const fallbackCoords = getFallbackIndianCoords(address);
    if (isPickup) setPickupCoords(fallbackCoords);
    else setDropCoords(fallbackCoords);
    return fallbackCoords;
  };

  // Perform fare pricing, real-time weather alerts, hazards placement
  const calculateFareAndRouteMetric = async () => {
    if (!pickup || !drop || pickup === drop) return;

    setWeatherLoading(true);
    try {
      // 1. Resolve coordinates
      const pCoords = await resolveCoordinates(pickup, true);
      const dCoords = await resolveCoordinates(drop, false);

      // 2. Check if this is a standard recognized route first for absolute accuracy
      const routeKey1 = `${pickup.trim().toLowerCase()}|${drop.trim().toLowerCase()}`;
      const routeKey2 = `${drop.trim().toLowerCase()}|${pickup.trim().toLowerCase()}`;
      let matchedRoute = null;

      for (const [key, val] of Object.entries(STANDARD_ROUTES)) {
        if (key === routeKey1 || key === routeKey2 || routeKey1.includes(key) || routeKey2.includes(key)) {
          matchedRoute = val;
          break;
        }
      }

      let distance = 0;
      let duration = 0;

      if (matchedRoute) {
        distance = matchedRoute.distance;
        duration = matchedRoute.duration;
      } else {

        if (distance === 0 || duration === 0) {
          try {
            const mRes = await fetch('/api/route-metrics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pLat: pCoords.lat,
                pLng: pCoords.lng,
                dLat: dCoords.lat,
                dLng: dCoords.lng
              })
            });
            if (mRes.ok) {
              const metrics = await mRes.json();
              distance = metrics.distance;
              duration = metrics.duration;
              console.log(`Resolved route parameters: ${distance} km, ${duration} mins [source: ${metrics.source}]`);
            } else {
              throw new Error("Invalid metrics fetch response status");
            }
          } catch (routeErr) {
            console.warn("Route metrics engine offline, using geodetic fallback:", routeErr);
            distance = calculateHaversineDistance(pCoords.lat, pCoords.lng, dCoords.lat, dCoords.lng);
            duration = Number((distance * 2.2).toFixed(1));
          }
        }
      }

      setCalculatedDistance(distance);

      // 3. Distance boundary constraint checkout (Max 50 km!)
      if (distance > 50.0) {
        setDistanceExceeded(true);
        setShowFare(false);
        setWeatherLoading(false);
        return;
      }
      setDistanceExceeded(false);

      // 4. Fetch Real-time Weather details for both points from Open-Meteo
      const [weatherP, weatherD] = await Promise.all([
        fetchWeatherDetails(pCoords.lat, pCoords.lng),
        fetchWeatherDetails(dCoords.lat, dCoords.lng)
      ]);
      setWeatherPickup(weatherP);
      setWeatherDrop(weatherD);

      // 5. Compute Duration depending on Traffic Factor
      let speedFactor = 1.0;
      if (systemConfig.traffic === 'Moderate') speedFactor = 1.35;
      else if (systemConfig.traffic === 'Heavy Congestion') speedFactor = 1.85;
      else if (systemConfig.traffic === 'Gridlock') speedFactor = 2.65;
      
      const finalDuration = Number((duration * speedFactor).toFixed(1));
      setCalculatedDuration(finalDuration);

      // 6. Generate 4 routes choices (Fastest, Safest, Eco, Best Road Quality)
      const baseDistance = distance;
      const baseDuration = finalDuration;

      const weatherConditionText = weatherP?.weatherText || systemConfig.weather;
      const humidityVal = weatherP?.humidity || 55;
      const windSpeedVal = weatherP?.windSpeed || 10;
      const rainChanceVal = weatherP?.rainChance || 0;
      const risk = WeatherIntelligenceService.calculateWeatherRisk(weatherConditionText, windSpeedVal, humidityVal, rainChanceVal);

      const routesData: BookingRouteChoice[] = [
        {
          id: 'route-1',
          name: 'Route 1',
          label: 'Fastest Route',
          badge: 'Fastest',
          distanceKm: baseDistance,
          durationMin: Math.round(baseDuration),
          traffic: (systemConfig.traffic === 'Heavy Congestion' || systemConfig.traffic === 'Gridlock') ? 'Heavy' : systemConfig.traffic as any,
          fuelUsageLiters: 0,
          fuelCost: 0,
          tollCharges: baseDistance > 15 ? 50 : 0,
          platformFee: 7.00,
          tax: 0,
          totalFare: 0,
          recommendation: 'Fastest route due to highway speed limits',
          roadHealthScore: 85,
          weatherRiskScore: risk.score
        },
        {
          id: 'route-2',
          name: 'Route 2',
          label: 'Safest Route',
          badge: 'Safest',
          distanceKm: Number((baseDistance * 1.15).toFixed(2)),
          durationMin: Math.round(baseDuration * 1.05),
          traffic: 'Light',
          fuelUsageLiters: 0,
          fuelCost: 0,
          tollCharges: baseDistance > 15 ? 80 : 0, // Bypass toll highway
          platformFee: 7.00,
          tax: 0,
          totalFare: 0,
          recommendation: 'Lowest traffic & weather risks, bypasses highways',
          roadHealthScore: 95,
          weatherRiskScore: Math.max(0, risk.score - 15)
        },
        {
          id: 'route-3',
          name: 'Route 3',
          label: 'Eco Route',
          badge: 'Eco Choice',
          distanceKm: Number((baseDistance * 1.05).toFixed(2)),
          durationMin: Math.round(baseDuration * 1.10),
          traffic: 'Moderate',
          fuelUsageLiters: 0,
          fuelCost: 0,
          tollCharges: 0,
          platformFee: 7.00,
          tax: 0,
          totalFare: 0,
          recommendation: 'Constant speed optimized for lowest fuel emissions',
          roadHealthScore: 88,
          weatherRiskScore: risk.score
        },
        {
          id: 'route-4',
          name: 'Route 4',
          label: 'Best Road Quality Route',
          badge: 'Best Road',
          distanceKm: Number((baseDistance * 1.10).toFixed(2)),
          durationMin: Math.round(baseDuration),
          traffic: 'Light',
          fuelUsageLiters: 0,
          fuelCost: 0,
          tollCharges: 0,
          platformFee: 7.00,
          tax: 0,
          totalFare: 0,
          recommendation: 'Avoids potholes, bumps, and construction blockades',
          roadHealthScore: 98,
          weatherRiskScore: risk.score
        }
      ];

      // Compute breakdowns for each
      const finalRoutes = routesData.map((r, idx) => {
        const breakdown = calculateRouteFare(r.distanceKm, r.durationMin, r.traffic, r.tollCharges, selectedVehicle);
        const trafficOffset = r.traffic === 'Light' ? 20 : r.traffic === 'Moderate' ? 10 : 0;
        const reliabilityScore = Math.round(r.roadHealthScore * 0.6 + (100 - r.weatherRiskScore) * 0.2 + trafficOffset);
        const customTotal = getLockedFareForRoute(idx, selectedVehicle, breakdown.total);
        const fareBreakdown = {
          ...(breakdown.farebreakdown || breakdown),
          total: customTotal
        };
        return {
          ...r,
          fuelUsageLiters: breakdown.fuelUsage,
          fuelCost: breakdown.fuelCost,
          tax: breakdown.tax,
          totalFare: customTotal,
          fareBreakdown,
          reliabilityScore
        };
      });

      setAvailableRoutes(finalRoutes);
      setSelectedRouteIndex(0);

      // 7. Generate speedbreakers
      const numSB = Math.min(6, Math.max(1, Math.round(distance / 8)));
      const sbList = [];
      for (let i = 1; i <= numSB; i++) {
        const ratio = i / (numSB + 1);
        sbList.push({
          id: `sb-${i}-${Date.now()}`,
          name: `Speedbreaker Checkpoint #${i}`,
          position: {
            lat: pCoords.lat + (dCoords.lat - pCoords.lat) * ratio + (Math.random() - 0.5) * 0.002,
            lng: pCoords.lng + (dCoords.lng - pCoords.lng) * ratio + (Math.random() - 0.5) * 0.002
          }
        });
      }
      setSpeedbreakers(sbList);

      const trafficList = [];
      if (systemConfig.traffic !== 'Light') {
        trafficList.push({
          id: `tr-${Date.now()}`,
          position: {
            lat: pCoords.lat + (dCoords.lat - pCoords.lat) * 0.65,
            lng: pCoords.lng + (dCoords.lng - pCoords.lng) * 0.65
          }
        });
      }
      setHeavyTrafficPoints(trafficList);

      setShowFare(true);
    } catch (err) {
      console.error("Pricing computation error:", err);
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    if (isPickupVerified && isDropVerified && pickup && drop && !showFare && !weatherLoading) {
      calculateFareAndRouteMetric();
    }
  }, [isPickupVerified, isDropVerified]);

  // Recompute route fares and fuel stats when selectedVehicle changes
  useEffect(() => {
    if (availableRoutes.length === 0) return;
    const updated = availableRoutes.map((r, idx) => {
      const breakdown = calculateRouteFare(r.distanceKm, r.durationMin, r.traffic, r.tollCharges, selectedVehicle);
      const customTotal = getLockedFareForRoute(idx, selectedVehicle, breakdown.total);
      const fareBreakdown = {
        ...(breakdown.farebreakdown || breakdown),
        total: customTotal
      };
      return {
        ...r,
        fuelUsageLiters: breakdown.fuelUsage,
        fuelCost: breakdown.fuelCost,
        tax: breakdown.tax,
        totalFare: customTotal,
        fareBreakdown
      };
    });
    setAvailableRoutes(updated);
  }, [selectedVehicle]);

  // Sync calculatedDistance and duration with selectedRoute
  useEffect(() => {
    if (availableRoutes[selectedRouteIndex]) {
      const r = availableRoutes[selectedRouteIndex];
      setCalculatedDistance(r.distanceKm);
      setCalculatedDuration(r.durationMin);
    }
  }, [selectedRouteIndex, availableRoutes]);

  // Pricing Calculation algorithm structure
  const getDynamicFareValues = (vehicleId: VehicleType = selectedVehicle) => {
    const breakdown = calculateRouteFare(calculatedDistance, calculatedDuration, systemConfig.traffic, 0, vehicleId);
    const rawBreakdown = breakdown.farebreakdown || breakdown;
    const customTotal = getLockedFareForRoute(selectedRouteIndex, vehicleId, rawBreakdown.total);
    return {
      ...rawBreakdown,
      total: customTotal
    };
  };

  const currentFare = React.useMemo(() => {
    return availableRoutes[selectedRouteIndex]?.fareBreakdown || getDynamicFareValues(selectedVehicle);
  }, [selectedRouteIndex, availableRoutes, selectedVehicle]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !drop || pickup === drop || distanceExceeded || !showFare || !isPickupVerified || !isDropVerified) return;

    setIsSubmitting(true);
    try {
      // Pass client-side computed real-time coordinates, distance, and details to keep everything locked and accurate
      const createdRide = await onBookRide(pickup, drop, paymentMethod, {
        distanceKm: calculatedDistance,
        durationMin: calculatedDuration,
        weatherType: weatherPickup?.weatherText || systemConfig.weather,
        trafficType: systemConfig.traffic,
        initialFare: currentFare.total,
        gpsLat: pickupCoords.lat,
        gpsLng: pickupCoords.lng,
        vehicleType: selectedVehicle,
        isChildSafety: childSafetyActive,
        isWomenSafety: womenSafetyActive,
        isFamilySafety: familySafetyActive,
        selectedRouteIndex: selectedRouteIndex,
        routePath: activeRoutePath
      });
      console.log("Created Ride:", createdRide);

      // Trigger safety SMS if any safety mode is active
      if (familySafetyActive || childSafetyActive || womenSafetyActive) {
        const profile = ZipRideRepository.getProfile();
        FamilySafetyModule.sendGuardianAlert('ride_started', {
          rideId: createdRide.id,
          riderName: profile.fullName,
          pickup,
          drop
        });
      }

      onSelectTab('tracker');
    } catch (err) {
      console.error('Booking submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetBooking = () => {
    setPickup('');
    setDrop('');
    setSelectedPickup('');
    setSelectedDrop('');
    setIsPickupVerified(false);
    setIsDropVerified(false);
    setPickupCoords({ lat: 11.0168, lng: 76.9558 });
    setDropCoords({ lat: 10.9950, lng: 76.9609 });
    setSelectedVehicle('Bike');
    setPaymentMethod('UPI');
    setSelectedRouteIndex(0);
    setAvailableRoutes([]);
    setShowFare(false);
    SessionResetService.clearBookingState();
  };

  const renderSuggestionList = (field: 'pickup' | 'drop', suggestions: PlaceSuggestion[]) => {
    const isOpen = isActiveField === field && suggestions.length > 0;
    if (!isOpen) return null;

    return (
      <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-theme-card border border-theme-border rounded-xl shadow-[0_16px_40px_rgba(15,23,42,0.18)] overflow-hidden max-h-72 overflow-y-auto">
        {suggestionsLoading && (
          <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-theme-text-secondary bg-theme-bg border-b border-theme-border">
            Searching Indian places...
          </div>
        )}
        {suggestions.map((suggestion, index) => (
          <button
            key={`${field}-${formatSuggestion(suggestion)}-${index}`}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => selectSuggestion(field, suggestion)}
            className="w-full text-left px-4 py-3 hover:bg-indigo-50/70 border-b border-theme-border last:border-b-0 transition-colors"
          >
            <span className="flex items-start gap-3">
              {field === 'pickup' ? (
                <CircleDot className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              ) : (
                <MapPin className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              )}
              <span className="min-w-0">
                <span className="block text-sm font-bold text-theme-text-primary truncate">{suggestion.name}</span>
                <span className="block text-[11px] font-semibold text-theme-text-secondary truncate">
                  {[suggestion.district, suggestion.state].filter(Boolean).join(", ") || "India"}
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="relative w-full h-[calc(100vh-80px)] overflow-hidden rounded-3xl bg-theme-card border border-theme-border/80 shadow-sm" id="ride-setup-container">
      
      {/* Absolute floating Hamburger toggle button */}
      <button
        type="button"
        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
        className="absolute top-4 left-4 z-40 p-3 bg-theme-card/95 hover:bg-theme-card border border-theme-border rounded-xl shadow-lg hover:shadow-xl text-theme-text-primary transition-all duration-300 flex items-center justify-center cursor-pointer"
        aria-label="Toggle Booking Panel"
      >
        {isDrawerOpen ? <X className="w-6 h-6 text-rose-500" /> : <Menu className="w-6 h-6 text-indigo-600" />}
      </button>

      {/* Left Collapsible Slide Drawer: Form Setup & Calculations */}
      <div 
        className={`absolute top-0 bottom-0 left-0 z-35 w-full sm:w-[410px] h-full flex flex-col gap-5 overflow-y-auto p-5 pt-20 md:p-6 md:pt-20 bg-theme-bg border-r border-theme-border shrink-0 transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        id="booking-form-panel"
      >
        <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm shrink-0" id="booking-form-card">
          <h3 className="text-xl font-bold text-theme-text-primary tracking-tight flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600 animate-spin-slow" />
            <span>Set Up Your Journey</span>
          </h3>
          <p className="text-xs text-theme-text-secondary mt-1 mb-6">Enter real-time pickup and drop locations in India with smart address suggestions.</p>

          <form onSubmit={handleBooking} className="space-y-4">
            {/* Pickup Input Field */}
            <div className="relative" id="pickup-selection-block">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-theme-text-secondary mb-2">PICKUP LOCATION POINT</label>
              <div className="relative">
                <CircleDot className="w-5 h-5 text-emerald-500 absolute left-4 top-1/2 -translate-y-1/2 shrink-0" />
                <input
                  ref={pickupRef}
                  type="text"
                  value={pickup}
                  onChange={(e) => {
                    setPickup(e.target.value);
                    setSelectedPickup('');
                    setIsPickupVerified(false);
                    setIsActiveField('pickup');
                  }}
                  onFocus={() => setIsActiveField('pickup')}
                  onBlur={() => window.setTimeout(() => setIsActiveField(null), 120)}
                  placeholder="Type any place, city, or landmark in India..."
                  className="w-full bg-theme-bg pl-12 pr-4 py-4 rounded-xl border border-theme-border text-sm font-semibold text-theme-text-primary outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition duration-200"
                />
              </div>
              {renderSuggestionList('pickup', pickupSuggestions)}

              {/* Validation Status Badge */}
              {pickup.trim() !== '' && (
                isPickupVerified ? (
                  <div className="flex items-center gap-1 mt-2 text-emerald-600 bg-emerald-50/50 px-2.5 py-1 rounded-lg text-[11px] font-semibold w-fit border border-emerald-100/50">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>✓ Verified Indian Location</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-2 text-amber-600 bg-amber-50/50 px-2.5 py-1 rounded-lg text-[11px] font-semibold w-fit border border-amber-200/50 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Please select from suggestions dropdown</span>
                  </div>
                )
              )}
            </div>

            {/* Drop Destination Input Field */}
            <div className="relative" id="drop-selection-block">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-theme-text-secondary mb-2">DROP DESTINATION POINT</label>
              <div className="relative">
                <MapPin className="w-5 h-5 text-rose-500 absolute left-4 top-1/2 -translate-y-1/2 shrink-0" />
                <input
                  ref={dropRef}
                  type="text"
                  value={drop}
                  onChange={(e) => {
                    setDrop(e.target.value);
                    setSelectedDrop('');
                    setIsDropVerified(false);
                    setIsActiveField('drop');
                  }}
                  onFocus={() => setIsActiveField('drop')}
                  onBlur={() => window.setTimeout(() => setIsActiveField(null), 120)}
                  placeholder="Type full destination address in India..."
                  className="w-full bg-theme-bg pl-12 pr-4 py-4 rounded-xl border border-theme-border text-sm font-semibold text-theme-text-primary outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition duration-200"
                />
              </div>
              {renderSuggestionList('drop', dropSuggestions)}

              {/* Validation Status Badge */}
              {drop.trim() !== '' && (
                isDropVerified ? (
                  <div className="flex items-center gap-1 mt-2 text-emerald-600 bg-emerald-50/50 px-2.5 py-1 rounded-lg text-[11px] font-semibold w-fit border border-emerald-100/50">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>✓ Verified Indian Location</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-2 text-amber-600 bg-amber-50/50 px-2.5 py-1 rounded-lg text-[11px] font-semibold w-fit border border-amber-200/50 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Please select from suggestions dropdown</span>
                  </div>
                )
              )}
            </div>

            {/* Price Calculations and Boundary check trigger */}
            <div className="pt-1">
              <button
                type="button"
                id="calculate-price-btn"
                onClick={calculateFareAndRouteMetric}
                disabled={!pickup || !drop || pickup === drop || !isPickupVerified || !isDropVerified || weatherLoading}
                className={`w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 border transition duration-300 cursor-pointer disabled:cursor-not-allowed ${
                  showFare
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-xs disabled:bg-theme-bg disabled:border-theme-border disabled:text-theme-text-secondary'
                }`}
              >
                {weatherLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin"></div>
                    <span>Querying Maps & Weather data...</span>
                  </>
                ) : (
                  <>
                    <IndianRupee className="w-4 h-4 shrink-0" />
                    <span>{showFare ? 'Estimated Price Pre-Calculated ✓' : 'Calculate & Show Price'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Error banner if distance > 50 Km boundary limit is hit */}
            {distanceExceeded && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 leading-relaxed text-xs space-y-1.5" id="distance-exceeded-alert">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Out of Boundary Limits!</span>
                </div>
                <p>
                  Calculated journey distance between those points is <strong className="font-bold">{calculatedDistance} km</strong>! ZipRide has a maximum operating boundary radius of <strong className="font-bold">50 km</strong> to guarantee bike rider safety and speed. Trips to other states (like Delhi to Coimbatore/Gandhipuram) are not feasible.
                </p>
              </div>
            )}

            {/* Vehicle Options Selector */}
            {showFare && (
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-theme-text-secondary mb-2">CHOOSE VEHICLE OPTION</label>
                <div className="grid grid-cols-3 gap-3">
                  {VEHICLE_FARE_PROFILES.map(profile => {
                    const isSelected = selectedVehicle === profile.id;
                    const calculated = getDynamicFareValues(profile.id);
                    return (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => setSelectedVehicle(profile.id)}
                        className={`flex flex-col items-center justify-center p-3.5 border-2 rounded-xl gap-1.5 transition duration-200 cursor-pointer ${
                          isSelected 
                            ? 'border-[#00C896] bg-[#F4FDFB] text-[#00C896] font-bold ring-2 ring-[#00C896]/10' 
                            : 'border-theme-border bg-theme-card hover:border-theme-border text-theme-text-secondary font-semibold'
                        }`}
                      >
                        <span className="text-xl">
                          {profile.id === 'Bike' ? '🏍️' : profile.id === 'Auto' ? '🛺' : '🚗'}
                        </span>
                        <span className="text-xs font-bold text-theme-text-primary">{profile.label}</span>
                        <span className="text-[10px] text-theme-text-secondary">{profile.capacity}</span>
                        <span className="text-xs font-extrabold text-emerald-600 font-mono mt-1">₹{calculated.total.toFixed(0)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Travel Safety & Protection Modes */}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-theme-text-secondary">TRAVEL SAFETY & PROTECTION MODES</label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setFamilySafetyActive(!familySafetyActive);
                    localStorage.setItem('zipride_family_safety_active', (!familySafetyActive).toString());
                  }}
                  className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl gap-1.5 transition duration-200 cursor-pointer ${
                    familySafetyActive 
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold' 
                      : 'border-theme-border bg-theme-card hover:border-theme-border text-theme-text-secondary'
                  }`}
                >
                  <span className="text-lg">👨‍👩‍👧</span>
                  <span className="text-[10px] font-bold">Family Safe</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setChildSafetyActive(!childSafetyActive);
                    localStorage.setItem('zipride_child_safety_active', (!childSafetyActive).toString());
                  }}
                  className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl gap-1.5 transition duration-200 cursor-pointer ${
                    childSafetyActive 
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold' 
                      : 'border-theme-border bg-theme-card hover:border-theme-border text-theme-text-secondary'
                  }`}
                >
                  <span className="text-lg">👶</span>
                  <span className="text-[10px] font-bold">Child Safe</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWomenSafetyActive(!womenSafetyActive);
                    localStorage.setItem('zipride_women_safety_active', (!womenSafetyActive).toString());
                  }}
                  className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl gap-1.5 transition duration-200 cursor-pointer ${
                    womenSafetyActive 
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold' 
                      : 'border-theme-border bg-theme-card hover:border-theme-border text-theme-text-secondary'
                  }`}
                >
                  <span className="text-lg">👩</span>
                  <span className="text-[10px] font-bold">Women Safe</span>
                </button>
              </div>
              
              {/* Accessibility Overrides Indicator */}
              {accessibilityOverride.length > 0 && (
                <div className="mt-2.5 p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center gap-2 text-[10px] text-violet-400 font-bold">
                  <span>♿</span>
                  <span>Accessibility Override: {accessibilityOverride.join(', ')} assist enabled.</span>
                </div>
              )}
            </div>

            {/* Payment Mode Selector */}
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-theme-text-secondary mb-2">DIGITAL MODE SELECTOR</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'UPI', label: 'UPI Node', icon: Smartphone },
                  { id: 'Wallet', label: 'Wallet Pay', icon: Wallet },
                  { id: 'Card', label: 'Card Swipe', icon: CreditCard }
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = paymentMethod === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPaymentMethod(item.id as any)}
                      className={`flex flex-col items-center justify-center p-3.5 border-2 rounded-xl gap-2 transition duration-200 ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/40 text-indigo-700 font-bold' 
                          : 'border-theme-border bg-theme-card hover:border-theme-border text-theme-text-secondary font-semibold'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Final Booking Submit trigger */}
            <button
              type="submit"
              id="book-ride-btn"
              disabled={isSubmitting || !pickup || !drop || pickup === drop || !showFare || distanceExceeded || !isPickupVerified || !isDropVerified}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-theme-text-secondary text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition duration-300 cursor-pointer disabled:cursor-not-allowed"
            >
              <Zap className="w-5 h-5 shrink-0" />
              <span>{isSubmitting ? 'Securing Bike Connection...' : !showFare ? 'Show Price First to Book' : 'Trigger Taxi Booking'}</span>
            </button>

            {/* Reset Booking Button */}
            {(pickup || drop) && (
              <button
                type="button"
                onClick={handleResetBooking}
                className="w-full bg-theme-bg border border-theme-border text-theme-text-primary hover:bg-theme-card font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition duration-300 cursor-pointer mt-3"
              >
                <span>Reset Booking</span>
              </button>
            )}
          </form>
        </div>

        {/* Real-time details region of Weather/Traffic (highly user-friendly) */}
        {showFare && (
          <div className="bg-theme-card border border-theme-border/80 rounded-2xl p-6 shadow-xs space-y-4" id="weather-traffic-detail-card">
            <h4 className="text-sm font-bold text-theme-text-primary tracking-wide flex items-center gap-1.5 uppercase font-mono border-b border-theme-border pb-3">
              <Info className="w-4 h-4 text-emerald-600" />
              <span>Journey Regional Weather & Traffic Details</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pickup forecast */}
              <div className="bg-theme-bg/60 p-4 rounded-xl border border-theme-border relative overflow-hidden">
                <span className="absolute right-3 top-3 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-[9px] font-bold font-mono">PICKUP POINT</span>
                <p className="text-[10px] text-theme-text-secondary font-bold uppercase tracking-wider font-mono">Location Conditions</p>
                <div className="flex items-center gap-3 mt-2.5">
                  <div className="p-2.5 bg-sky-50 rounded-lg text-sky-600">
                    <Thermometer className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-theme-text-primary">{weatherPickup?.temp}°C <span className="text-xs font-semibold text-sky-600">({weatherPickup?.weatherText})</span></h5>
                    <p className="text-[10px] text-theme-text-secondary mt-0.5">Air Temperature</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-theme-border/50">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <div>
                      <span className="text-[11px] font-bold text-theme-text-primary block">{weatherPickup?.humidity}%</span>
                      <span className="text-[9px] text-theme-text-secondary">Humidity</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <div>
                      <span className="text-[11px] font-bold text-theme-text-primary block leading-tight">{weatherPickup?.windSpeed} km/h</span>
                      <span className="text-[9px] text-theme-text-secondary">Wind</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CloudRain className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <div>
                      <span className="text-[11px] font-bold text-theme-text-primary block">{weatherPickup?.rainChance ?? 0}%</span>
                      <span className="text-[9px] text-theme-text-secondary">Rain %</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Destination forecast */}
              <div className="bg-theme-bg/60 p-4 rounded-xl border border-theme-border relative overflow-hidden">
                <span className="absolute right-3 top-3 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md text-[9px] font-bold font-mono">DROP POINT</span>
                <p className="text-[10px] text-theme-text-secondary font-bold uppercase tracking-wider font-mono">Location Conditions</p>
                <div className="flex items-center gap-3 mt-2.5">
                  <div className="p-2.5 bg-sky-50 rounded-lg text-sky-600">
                    <Thermometer className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-theme-text-primary">{weatherDrop?.temp}°C <span className="text-xs font-semibold text-rose-500">({weatherDrop?.weatherText})</span></h5>
                    <p className="text-[10px] text-theme-text-secondary mt-0.5">Air Temperature</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-theme-border/50">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <div>
                      <span className="text-[11px] font-bold text-theme-text-primary block">{weatherDrop?.humidity}%</span>
                      <span className="text-[9px] text-theme-text-secondary">Humidity</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <div>
                      <span className="text-[11px] font-bold text-theme-text-primary block leading-tight">{weatherDrop?.windSpeed} km/h</span>
                      <span className="text-[9px] text-theme-text-secondary">Wind</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CloudRain className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <div>
                      <span className="text-[11px] font-bold text-theme-text-primary block">{weatherDrop?.rainChance ?? 0}%</span>
                      <span className="text-[9px] text-theme-text-secondary">Rain %</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Travel safety hazards summary */}
            <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100 text-xs text-indigo-950 space-y-2">
              <span className="font-bold block text-[10px] uppercase font-mono tracking-wider text-indigo-800">Dynamic Traffic & Road Hazards Advisory</span>
              <div className="flex flex-wrap gap-4 items-center gap-y-2 text-indigo-700">
                <div className="flex items-center gap-1 font-semibold text-[11px]">
                  <TrafficCone className="w-3.5 h-3.5 text-amber-500" />
                  <span>{speedbreakers.length} Speedbreakers Detected</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                  <span>Traffic Index: {systemConfig.traffic}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Overspeeding Protections Armed</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RideMate AI Companion Panel */}
        {showFare && (
          <RideMatePanel 
            weatherCondition={weatherPickup?.weatherText || systemConfig.weather}
            weatherRiskScore={availableRoutes[selectedRouteIndex]?.weatherRiskScore || 0}
            trafficLevel={availableRoutes[selectedRouteIndex]?.traffic || systemConfig.traffic}
            routes={availableRoutes}
            selectedRouteIndex={selectedRouteIndex}
          />
        )}

        {/* Dynamic pricing and routing panel */}
        <div className="bg-theme-card border border-theme-border/85 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] shrink-0" id="fare-panel">
          <div className="p-5 border-b border-theme-border bg-theme-bg/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold text-theme-text-primary text-sm">Routes & Dynamic Fare Engine</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              Surcharge Protection
            </span>
          </div>

          {pickup && drop && pickup !== drop && showFare && isPickupVerified && isDropVerified && availableRoutes.length > 0 ? (
            <div className="p-6 space-y-5">
              
              {/* Route Options Selection List */}
              <div className="space-y-3">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-theme-text-secondary">SELECT ROUTE CHOICE</label>
                <div className="grid grid-cols-1 gap-3">
                  {availableRoutes.map((route, idx) => {
                    const isSelected = selectedRouteIndex === idx;
                    return (
                      <button
                        key={route.id}
                        type="button"
                        onClick={() => setSelectedRouteIndex(idx)}
                        onMouseEnter={() => setHoveredRouteIndex(idx)}
                        onMouseLeave={() => setHoveredRouteIndex(null)}
                        className={`w-full p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col gap-3 ${
                          isSelected
                            ? 'border-indigo-650 bg-indigo-50/10 dark:bg-indigo-950/20 ring-2 ring-indigo-650/10'
                            : 'border-theme-border bg-theme-card hover:bg-theme-bg text-theme-text-secondary'
                        }`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <div>
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide mb-2 ${
                              route.badge === 'Fastest' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' :
                              route.badge === 'Safest' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                              route.badge === 'Eco Choice' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}>
                              {route.badge}
                            </span>
                            <h5 className="text-xs font-bold text-theme-text-primary">{route.name} → {route.label}</h5>
                            <p className="text-[10px] text-theme-text-secondary mt-0.5">{route.recommendation}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 block font-mono">{route.durationMin} min</span>
                            <span className="text-[10px] font-bold text-theme-text-secondary block mt-0.5">{route.distanceKm} km</span>
                          </div>
                        </div>

                        {/* Fuel and Traffic metrics */}
                        <div className="grid grid-cols-6 gap-1 pt-2 border-t border-theme-border/50 text-[9px] font-semibold text-theme-text-secondary">
                          <div>
                            <span className="block font-mono text-[7px] uppercase tracking-wider text-theme-text-secondary">Traffic</span>
                            <span className={`font-bold ${
                              route.traffic === 'Light' ? 'text-emerald-600' :
                              route.traffic === 'Moderate' ? 'text-amber-500' :
                              'text-rose-500'
                            }`}>{route.traffic}</span>
                          </div>
                          <div>
                            <span className="block font-mono text-[7px] uppercase tracking-wider text-theme-text-secondary">Est. Fuel</span>
                            <span className="text-theme-text-primary font-mono">{route.fuelUsageLiters.toFixed(2)} L</span>
                          </div>
                          <div>
                            <span className="block font-mono text-[7px] uppercase tracking-wider text-theme-text-secondary">Fuel Cost</span>
                            <span className="text-theme-text-primary font-mono">₹{route.fuelCost.toFixed(0)}</span>
                          </div>
                          <div>
                            <span className="block font-mono text-[7px] uppercase tracking-wider text-theme-text-secondary">Road Health</span>
                            <span className={`font-bold ${
                              route.roadHealthScore >= 90 ? 'text-emerald-500' :
                              route.roadHealthScore >= 75 ? 'text-amber-500' :
                              'text-rose-500'
                            }`}>{route.roadHealthScore}%</span>
                          </div>
                          <div>
                            <span className="block font-mono text-[7px] uppercase tracking-wider text-theme-text-secondary">Weather Risk</span>
                            <span className={`font-bold ${
                              route.weatherRiskScore <= 20 ? 'text-emerald-550' :
                              route.weatherRiskScore <= 50 ? 'text-amber-500' :
                              'text-rose-550'
                            }`}>{route.weatherRiskScore}/100</span>
                          </div>
                          <div>
                            <span className="block font-mono text-[7px] uppercase tracking-wider text-theme-text-secondary">Reliability</span>
                            <span className={`font-bold ${
                              (route as any).reliabilityScore >= 85 ? 'text-emerald-600' :
                              (route as any).reliabilityScore >= 70 ? 'text-amber-500' :
                              'text-rose-500'
                            }`}>{(route as any).reliabilityScore}%</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fare Breakdown Title */}
              <div className="border-t border-theme-border/60 pt-4">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-theme-text-secondary mb-3">ITEMIZED FARE BREAKDOWN</label>
                
                {/* Surcharges Explanations */}
                <div className="space-y-2 mb-4">
                  {currentFare.weatherSurcharge > 0 && (
                    <div className="p-3 bg-sky-50 border border-sky-100 text-[10px] text-sky-700 rounded-xl leading-relaxed font-semibold">
                      ⛈️ <strong>Weather Surcharge (+₹{currentFare.weatherSurcharge.toFixed(2)})</strong>: Applied because pickup weather is "{weatherPickup?.weatherText}". Climate conditions dictate slower speeds and safety buffers.
                    </div>
                  )}
                  {currentFare.trafficSurgeAmt > 0 && (
                    <div className="p-3 bg-amber-50/50 border border-amber-200/50 text-[10px] text-amber-700 rounded-xl leading-relaxed font-semibold">
                      🚗 <strong>Traffic Surcharge (+₹{currentFare.trafficSurgeAmt.toFixed(2)})</strong>: Applied because traffic is "{availableRoutes[selectedRouteIndex]?.traffic}". Slower roads demand higher operating compensations.
                    </div>
                  )}
                  {currentFare.nightSurcharge > 0 && (
                    <div className="p-3 bg-purple-50 border border-purple-100 text-[10px] text-purple-700 rounded-xl leading-relaxed font-semibold">
                      🌙 <strong>Night Duty Surcharge (+₹{currentFare.nightSurcharge.toFixed(2)})</strong>: Applied for nighttime operations (10 PM - 6 AM) to support pilots working irregular shifts.
                    </div>
                  )}
                  {currentFare.fuelAdjustment > 0 && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-700 rounded-xl leading-relaxed font-semibold">
                      ⛽ <strong>Fuel Cost Adjustment (+₹{currentFare.fuelAdjustment.toFixed(2)})</strong>: Added to subsidize estimated fuel usage of {currentFare.fuelUsage.toFixed(2)} L (petrol rate ₹102.50/L) due to route distance and idle traffic times.
                    </div>
                  )}
                  {currentFare.toll > 0 && (
                    <div className="p-3 bg-orange-50 border border-orange-100 text-[10px] text-orange-700 rounded-xl leading-relaxed font-semibold">
                      🛣️ <strong>Highway Toll Fee (+₹{currentFare.toll.toFixed(2)})</strong>: Settle NH highway checkpoint fees applied to outer link roads.
                    </div>
                  )}
                </div>

                {/* Pricing values table */}
                <div className="space-y-2.5 text-xs text-theme-text-secondary font-semibold border-b border-theme-border pb-4">
                  <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-wider text-theme-text-secondary">
                    <span>Component Description</span>
                    <span>Amount</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Base Flag Down Fare</span>
                    <span className="font-mono text-theme-text-primary">₹{currentFare.base.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Distance Charge ({calculatedDistance} km)</span>
                    <span className="font-mono text-theme-text-primary font-bold">₹{currentFare.distFare.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Time Duration Charge ({calculatedDuration} min)</span>
                    <span className="font-mono text-theme-text-primary font-bold">₹{currentFare.timeFare.toFixed(2)}</span>
                  </div>
                  {currentFare.weatherSurcharge > 0 && (
                    <div className="flex justify-between items-center">
                      <span>Live Weather surcharge</span>
                      <span className="font-mono text-sky-600">+₹{currentFare.weatherSurcharge.toFixed(2)}</span>
                    </div>
                  )}
                  {currentFare.trafficSurgeAmt > 0 && (
                    <div className="flex justify-between items-center">
                      <span>Traffic Index surge</span>
                      <span className="font-mono text-amber-500">+₹{currentFare.trafficSurgeAmt.toFixed(2)}</span>
                    </div>
                  )}
                  {currentFare.nightSurcharge > 0 && (
                    <div className="flex justify-between items-center">
                      <span>Night commute fee</span>
                      <span className="font-mono text-purple-650">+₹{currentFare.nightSurcharge.toFixed(2)}</span>
                    </div>
                  )}
                  {currentFare.fuelAdjustment > 0 && (
                    <div className="flex justify-between items-center">
                      <span>Fuel adjustment surcharge</span>
                      <span className="font-mono text-emerald-600">+₹{currentFare.fuelAdjustment.toFixed(2)}</span>
                    </div>
                  )}
                  {currentFare.toll > 0 && (
                    <div className="flex justify-between items-center">
                      <span>Tolls & Gateways</span>
                      <span className="font-mono text-orange-600">+₹{currentFare.toll.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span>Platform Booking Fee</span>
                    <span className="font-mono text-theme-text-primary">₹{currentFare.platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>GST Tax (18%)</span>
                    <span className="font-mono text-theme-text-primary">₹{currentFare.tax.toFixed(2)}</span>
                  </div>
                </div>

                {/* Final Locked Total */}
                <div className="flex items-center justify-between pt-4">
                  <div>
                    <span className="text-sm font-semibold text-theme-text-primary block font-sans">Locked Ride Fare</span>
                    <span className="text-[10px] text-emerald-500 font-semibold tracking-wide">Live discount refund shield active</span>
                  </div>
                  <h2 className="text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">₹{currentFare.total.toFixed(2)}</h2>
                </div>

                {/* Fare Fairness Meter */}
                {currentFare.fareBreakdown && (
                  <div className="mt-5 p-4 rounded-2xl bg-indigo-50/5 dark:bg-indigo-950/20 border border-indigo-500/20 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        ⚖️ Fare Fairness Meter
                      </span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-bold">
                        Score: {currentFare.fareBreakdown.fairnessScore || 95}/100
                      </span>
                    </div>

                    {/* Surge Cap Level Meter */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                        <span>Surge Cap Level: <strong className="text-indigo-400">{currentFare.fareBreakdown.capLevel || 'Normal'}</strong> (Max {currentFare.fareBreakdown.maxCapPercent || 10}%)</span>
                        <span>{currentFare.fareBreakdown.actualSurchargePercent || 0}% surge</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden relative">
                        <div 
                          className={`h-full ${
                            currentFare.fareBreakdown.capLevel === 'Extreme' ? 'bg-rose-500' :
                            currentFare.fareBreakdown.capLevel === 'Moderate' ? 'bg-amber-500' :
                            'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, ((currentFare.fareBreakdown.actualSurchargePercent || 1) / 25) * 100)}%` }}
                        />
                      </div>
                      {currentFare.fareBreakdown.isCapped && (
                        <p className="text-[9px] text-emerald-400 font-bold leading-normal">
                          🛡️ Regulatory Price Cap Engaged: Surcharges are capped at {currentFare.fareBreakdown.maxCapPercent}% to prevent price gouging.
                        </p>
                      )}
                    </div>

                    {/* Fairness Breakdown Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-slate-800/80 pt-2.5 text-slate-400 font-semibold">
                      <div className="flex justify-between">
                        <span>Base Cost:</span>
                        <span className="font-mono text-white">₹{(currentFare.fareBreakdown.base + currentFare.fareBreakdown.distFare + currentFare.fareBreakdown.timeFare).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Traffic Impact:</span>
                        <span className="font-mono text-white">₹{currentFare.fareBreakdown.trafficImpact.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Weather Impact:</span>
                        <span className="font-mono text-white">₹{currentFare.fareBreakdown.weatherImpact.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fuel Impact:</span>
                        <span className="font-mono text-white">₹{currentFare.fareBreakdown.fuelImpact.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between col-span-2 border-t border-slate-800/80 pt-1.5 font-bold text-emerald-400">
                        <span>Final Fare (Subtotal):</span>
                        <span className="font-mono">₹{currentFare.fareBreakdown.subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-theme-text-secondary leading-relaxed pt-3 mt-3 border-t border-theme-border">
                  ℹ️ <strong>Refund Shield Commitment</strong>: Fares are fully locked upon booking. If your assigned driver breaches weather speed safety limits or performs harsh decelerations, instant dynamic discounts are computed and credited.
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-theme-text-secondary flex flex-col items-center justify-center min-h-[300px]" id="select-locations-placeholder">
              <Compass className="w-12 h-12 text-indigo-400 mb-4 animate-bounce" />
              <p className="text-xs text-theme-text-secondary max-w-[250px] leading-relaxed font-semibold">
                Select pickup and destination to calculate intelligent routes.
              </p>
            </div>
          )}
        </div>
      </div>


      {/* Main Full-Screen Live Map Container */}
      <div className="w-full h-full relative z-0 bg-theme-bg" id="live-map-container">
        {pickup || drop ? (
          <LiveJourneyMap
            apiKey={apiKey}
            hasValidKey={hasValidKey}
            pickupName={pickup}
            dropName={drop}
            pickupCoords={pickupCoords}
            dropCoords={dropCoords}
            distanceKm={calculatedDistance}
            weatherAtPickup={weatherPickup ? `${weatherPickup.temp}°C ${weatherPickup.weatherText}` : undefined}
            weatherAtDrop={weatherDrop ? `${weatherDrop.temp}°C ${weatherDrop.weatherText}` : undefined}
            speedbreakers={speedbreakers}
            heavyTrafficSegments={heavyTrafficPoints}
            hoveredRouteIndex={hoveredRouteIndex}
            selectedRouteIndex={selectedRouteIndex}
            isAccessibilityActive={accessibilityOverride.length > 0}
            onRouteSelect={(dist, dur, path, idx) => {
              if (dist !== calculatedDistance || dur !== calculatedDuration) {
                setCalculatedDistance(dist);
                setCalculatedDuration(dur);
              }
              if (idx !== selectedRouteIndex) {
                setSelectedRouteIndex(idx);
              }
              setActiveRoutePath(path);
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-theme-text-secondary bg-slate-900/5 relative overflow-hidden">
             <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:24px_24px] opacity-30 z-0"></div>
             <div className="relative z-10 flex flex-col items-center justify-center p-8 bg-theme-card/60 backdrop-blur-md rounded-3xl border border-theme-border/50 shadow-sm max-w-sm text-center">
                <Compass className="w-12 h-12 text-indigo-400 mb-4 animate-bounce" />
                <h3 className="text-lg font-bold text-theme-text-primary tracking-tight">Map Display</h3>
                <p className="text-xs font-semibold text-theme-text-secondary mt-2">Select pickup and destination to calculate intelligent routes.</p>
             </div>
          </div>
        )}
      </div>

    </div>
  );
}

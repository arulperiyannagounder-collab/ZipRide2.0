import { Ride, Driver, Dispute, SOSAlert } from '../types';

export interface UserProfile {
  fullName: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;
  guardianEmail: string;
  bloodGroup: string;
  allergies: string;
  asthma: boolean;
  diabetes: boolean;
  medicalConditions: string[];
  medications: string;
  preferredHospital: string;
  accessibilityRequirements: string[];
}

export interface HazardReport {
  id: string;
  type: 'Pothole' | 'Flood' | 'Road Work' | 'Accident';
  description: string;
  location: { lat: number; lng: number };
  photoUrl?: string;
  reporterName: string;
  createdAt: string;
  confirmations: string[]; // List of reporter names who confirmed it
  isVerified: boolean;
}

// Service Repository Pattern to decouple components from database engines
export class ZipRideRepository {
  // Sync Profile to LocalStorage/SessionStorage
  public static getProfile(): UserProfile {
    const saved = localStorage.getItem('zipride_user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      fullName: localStorage.getItem('zipride_user') || 'Saran',
      age: 26,
      gender: 'Male',
      phone: localStorage.getItem('zipride_emergency_phone') || '+91 9876543210',
      email: 'saran@zipride.com',
      address: 'Indiranagar 100 Feet Boulevard, Bengaluru, KA',
      emergencyContactName: localStorage.getItem('zipride_emergency_name') || 'Police Room',
      emergencyContactPhone: localStorage.getItem('zipride_emergency_phone') || '112',
      guardianName: 'Aishwarya',
      guardianRelationship: 'Spouse',
      guardianPhone: '+91 9444102938',
      guardianEmail: 'aishwarya@guardian.com',
      bloodGroup: 'O+',
      allergies: 'None',
      asthma: true,
      diabetes: false,
      medicalConditions: ['Asthma'],
      medications: 'Inhaler as needed',
      preferredHospital: 'Apollo Health City, Bengaluru',
      accessibilityRequirements: []
    };
  }

  public static saveProfile(profile: UserProfile): void {
    localStorage.setItem('zipride_user_profile', JSON.stringify(profile));
    localStorage.setItem('zipride_user', profile.fullName);
    localStorage.setItem('zipride_emergency_name', profile.emergencyContactName);
    localStorage.setItem('zipride_emergency_phone', profile.emergencyContactPhone);
  }

  // Active Ride CRUD operations mapped dynamically via REST proxy
  public static async getActiveRide(riderName: string, role: string): Promise<Ride | null> {
    try {
      const res = await fetch('/api/rides');
      if (res.ok) {
        const rides: Ride[] = await res.json();
        const activeStatuses = ['booked', 'assigned', 'pickup', 'en_route', 'arrived', 'anomaly', 'in_progress'];
        return rides.find(r => {
          if (role === 'driver') {
            return r.driverName === riderName && activeStatuses.includes(r.status);
          }
          return r.riderName === riderName && activeStatuses.includes(r.status);
        }) || null;
      }
    } catch (e) {
      console.error('Error fetching active ride:', e);
    }
    return null;
  }

  // Hazard Reports in-memory mock backend database synced via localStorage for fast demo
  public static getHazards(): HazardReport[] {
    const saved = localStorage.getItem('zipride_community_hazards');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    // Default mock hazards in Chennai/Coimbatore/Mumbai for visualization
    const defaults: HazardReport[] = [
      {
        id: 'HAZ-001',
        type: 'Pothole',
        description: 'Deep pothole on left lane near Rajiv Chowk',
        location: { lat: 13.0830, lng: 80.2710 },
        reporterName: 'Rajesh',
        createdAt: new Date().toISOString(),
        confirmations: ['Kumar', 'Suresh'],
        isVerified: true
      },
      {
        id: 'HAZ-002',
        type: 'Flood',
        description: 'Water logging under Ukkadam bridge due to monsoon shower',
        location: { lat: 10.9880, lng: 76.9610 },
        reporterName: 'Saran',
        createdAt: new Date().toISOString(),
        confirmations: [],
        isVerified: false
      },
      {
        id: 'HAZ-003',
        type: 'Road Work',
        description: 'Metro line construction barricades limiting lane width',
        location: { lat: 19.0768, lng: 72.8770 },
        reporterName: 'Admin',
        createdAt: new Date().toISOString(),
        confirmations: [],
        isVerified: true
      }
    ];
    localStorage.setItem('zipride_community_hazards', JSON.stringify(defaults));
    return defaults;
  }

  public static addHazard(hazard: HazardReport): HazardReport[] {
    const hazards = this.getHazards();
    hazards.unshift(hazard);
    localStorage.setItem('zipride_community_hazards', JSON.stringify(hazards));
    return hazards;
  }

  public static confirmHazard(id: string, name: string): HazardReport[] {
    const hazards = this.getHazards();
    const hazard = hazards.find(h => h.id === id);
    if (hazard && !hazard.confirmations.includes(name)) {
      hazard.confirmations.push(name);
      if (hazard.confirmations.length >= 2) {
        hazard.isVerified = true;
      }
      localStorage.setItem('zipride_community_hazards', JSON.stringify(hazards));
    }
    return hazards;
  }
}

import { db, Driver } from './db.js';

export const DEFAULT_SEED_DRIVERS: Driver[] = [
  {
    id: "DRV-4581",
    name: "Saran",
    vehicle: "BIKE-TN37AB3286",
    rating: 4.7,
    status: "online",
    vehicleType: "Bike",
    vehicleNumber: "TN37AB3286",
    baseCompletedRides: 24,
    baseTodayEarnings: 1250,
    phone: "+91 9876543210",
    location: { lat: 11.0168, lng: 76.9558 } // Coimbatore Gandhipuram Center
  },
  {
    id: "DRV-2038",
    name: "Arul",
    vehicle: "BIKE-TN37AB6609",
    rating: 4.9,
    status: "online",
    vehicleType: "Bike",
    vehicleNumber: "TN37AB6609",
    baseCompletedRides: 24,
    baseTodayEarnings: 1250,
    phone: "+91 9876543210",
    location: { lat: 11.0168, lng: 76.9558 } // Coimbatore Gandhipuram Center
  }
];

export class AdminResetService {
  static resetDemoDatabase() {
    // Clear all rides, disputes, alerts, sosAlerts, and reset environment settings
    db.clearAll();
    
    // Clear dynamic driver registrations and restore primary seed profiles
    const drivers = db.getDrivers();
    drivers.length = 0;
    DEFAULT_SEED_DRIVERS.forEach(drv => {
      drivers.push({ ...drv });
    });
    
    // Save to zipride_db.json
    db.save();
    console.log("[DB Reset] Demo database successfully seeded with initial profiles");
  }
}

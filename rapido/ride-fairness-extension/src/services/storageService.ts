import { RideHistoryEntry, UserSettings } from '../types';

const DEFAULT_SETTINGS: UserSettings = {
  distanceRate: 15, // Default 15 per km
  timeRate: 2,      // Default 2 per min
  baseFare: 50,
  fixedServiceFee: 10,
  transparencySensitivity: 50,
  darkMode: false,
  trafficMultiplier: 1.0,
  nightSurgeRate: 1.0,
  tollRate: 0,
  fuelAdjustment: 0,
  estimatedSpeed: 30,
};

export const storageService = {
  async getSettings(): Promise<UserSettings> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['userSettings'], (result) => {
        resolve((result as any).userSettings || DEFAULT_SETTINGS);
      });
    });
  },

  async saveSettings(settings: UserSettings): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ userSettings: settings }, () => {
        resolve();
      });
    });
  },

  async getHistory(): Promise<RideHistoryEntry[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['rideHistory'], (result) => {
        resolve((result as any).rideHistory || []);
      });
    });
  },

  async addHistoryEntry(entry: RideHistoryEntry): Promise<void> {
    const history = await this.getHistory();
    history.push(entry);
    return new Promise((resolve) => {
      chrome.storage.local.set({ rideHistory: history }, () => {
        resolve();
      });
    });
  },

  async clearHistory(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ rideHistory: [] }, () => {
        resolve();
      });
    });
  },

  async getSearchState(): Promise<{ searchParams: any, aggregatedResults: any }> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['searchState'], (result) => {
        resolve((result as any).searchState || { searchParams: null, aggregatedResults: {} });
      });
    });
  },

  async saveSearchState(searchParams: any, aggregatedResults: any): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ searchState: { searchParams, aggregatedResults } }, () => {
        resolve();
      });
    });
  },

  async getLastRide(): Promise<{ ride: any, analysis: any } | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['lastRideState'], (result) => {
        resolve((result as any).lastRideState || null);
      });
    });
  },

  async saveLastRide(ride: any, analysis: any): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ lastRideState: { ride, analysis } }, () => {
        resolve();
      });
    });
  }
};

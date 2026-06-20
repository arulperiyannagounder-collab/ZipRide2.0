import { create } from 'zustand';
import type { 
  RideDetails, 
  FairPriceAnalysis, 
  RoadIntelligence, 
  TransparencyAnalysis, 
  FairnessAnalysis, 
  UserSettings, 
  SearchParams,
  AggregatedResult
} from '../types';

interface StoreState {
  activeTab: 'dashboard' | 'history' | 'charts' | 'settings' | 'compare';
  currentRide: RideDetails | null;
  fairPriceAnalysis: FairPriceAnalysis | null;
  roadIntelligence: RoadIntelligence | null;
  transparencyAnalysis: TransparencyAnalysis | null;
  fairnessAnalysis: FairnessAnalysis | null;
  settings: UserSettings | null;
  history: any[];
  
  searchParams: SearchParams | null;
  aggregatedResults: Record<string, AggregatedResult>;
  
  setActiveTab: (tab: 'dashboard' | 'history' | 'charts' | 'settings' | 'compare') => void;
  setCurrentRide: (ride: RideDetails | null) => void;
  setAnalysis: (
    fp: FairPriceAnalysis, 
    ri: RoadIntelligence, 
    ta: TransparencyAnalysis, 
    fa: FairnessAnalysis
  ) => void;
  setSettings: (settings: UserSettings) => void;
  setHistory: (history: any[]) => void;
  
  setSearchParams: (params: SearchParams | null) => void;
  updateAggregatedResult: (provider: string, result: AggregatedResult) => void;
  clearAggregatedResults: () => void;
}

export const useStore = create<StoreState>((set) => ({
  activeTab: 'dashboard',
  currentRide: null,
  fairPriceAnalysis: null,
  roadIntelligence: null,
  transparencyAnalysis: null,
  fairnessAnalysis: null,
  settings: null,
  history: [],
  
  searchParams: null,
  aggregatedResults: {},

  setActiveTab: (tab) => set({ activeTab: tab }),
  setCurrentRide: (ride) => set({ currentRide: ride }),
  setAnalysis: (fp, ri, ta, fa) => set({ 
    fairPriceAnalysis: fp, 
    roadIntelligence: ri, 
    transparencyAnalysis: ta, 
    fairnessAnalysis: fa 
  }),
  setSettings: (settings) => set({ settings }),
  setHistory: (history) => set({ history }),
  
  setSearchParams: (params) => set({ searchParams: params }),
  updateAggregatedResult: (provider, result) => set((state) => ({
    aggregatedResults: { ...state.aggregatedResults, [provider]: result }
  })),
  clearAggregatedResults: () => set({ aggregatedResults: {} })
}));

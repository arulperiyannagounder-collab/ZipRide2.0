import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { storageService } from '../services/storageService';
import { Activity, Settings, Clock, BarChart2, Search } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Charts from './components/Charts';
import HistoryList from './components/HistoryList';
import SettingsView from './components/Settings';
import Compare from './components/Compare';

const Popup: React.FC = () => {
  const { activeTab, setActiveTab, setSettings, setHistory, setCurrentRide, setAnalysis, updateAggregatedResult } = useStore();

  useEffect(() => {
    // Load initial data
    storageService.getSettings().then(setSettings);
    storageService.getHistory().then(setHistory);
    storageService.getLastRide().then((state) => {
      if (state) {
        setCurrentRide(state.ride);
        const { fp, ta, fa } = state.analysis;
        setAnalysis(fp, { trafficLevel: 'MEDIUM', congestionScore: 50, expectedDelay: 5, weatherImpact: 'Clear' }, ta, fa);
      }
    });
    storageService.getSearchState().then(({ searchParams, aggregatedResults }) => {
      useStore.getState().setSearchParams(searchParams);
      if (aggregatedResults) {
        Object.entries(aggregatedResults).forEach(([provider, result]) => {
          updateAggregatedResult(provider, result as any);
        });
      }
    });

    // Listen for real-time updates from background
    const messageListener = (message: any) => {
      if (message.type === 'ANALYSIS_COMPLETE') {
        const { ride, fp, ta, fa } = message.payload;
        setCurrentRide(ride);
        setAnalysis(fp, { trafficLevel: 'MEDIUM', congestionScore: 50, expectedDelay: 5, weatherImpact: 'Clear' }, ta, fa);
        // Persist to local storage
        storageService.saveLastRide(ride, { fp, ta, fa });
      } else if (message.type === 'AGGREGATE_UPDATE') {
        const { provider, result } = message.payload;
        updateAggregatedResult(provider, result);
        
        // Save to storage
        storageService.getSearchState().then(({ searchParams, aggregatedResults }) => {
          const updatedResults = {
            ...aggregatedResults,
            [provider]: result
          };
          storageService.saveSearchState(searchParams, updatedResults);
          
          // Auto-sync dashboard to the cheapest completed provider from the current comparison search
          const completed = Object.values(updatedResults).filter(
            (r: any) => r.status === 'completed' && r.details && r.details.options.length > 0
          );
          if (completed.length > 0) {
            let cheapest: any = null;
            let minFare = Infinity;
            completed.forEach((r: any) => {
              const minOpt = Math.min(...r.details.options.map((o: any) => o.fare));
              if (minOpt < minFare) {
                minFare = minOpt;
                cheapest = r;
              }
            });
            
            if (cheapest) {
              setCurrentRide(cheapest.details);
              setAnalysis(
                cheapest.fairPriceAnalysis,
                { trafficLevel: 'MEDIUM', congestionScore: 50, expectedDelay: 5, weatherImpact: 'Clear' },
                { transparencyScore: cheapest.transparencyScore ?? 90, reasons: [] },
                { fairnessScore: cheapest.fairnessScore ?? 80, rating: (cheapest.fairnessScore ?? 80) >= 80 ? 'Excellent' : 'Good' }
              );
              // Persist this synced ride as the last active ride details
              storageService.saveLastRide(cheapest.details, {
                fp: cheapest.fairPriceAnalysis,
                ta: { transparencyScore: cheapest.transparencyScore ?? 90, reasons: [] },
                fa: { fairnessScore: cheapest.fairnessScore ?? 80, rating: (cheapest.fairnessScore ?? 80) >= 80 ? 'Excellent' : 'Good' }
              });
            }
          }
        });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  return (
    <div className="flex flex-col h-screen max-h-[600px] bg-slate-50">
      <header className="bg-white border-b border-slate-200 p-4 shadow-sm flex justify-between items-center z-10">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Activity className="text-blue-600" size={20} />
          Ride Fairness
        </h1>
        <button 
          onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('index.html') })}
          className="text-slate-500 hover:text-blue-600 p-1 rounded hover:bg-slate-100 flex items-center gap-1 text-xs"
          title="Open as full tab for split view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          Pin
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'compare' && <Compare />}
        {activeTab === 'history' && <HistoryList />}
        {activeTab === 'charts' && <Charts />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      <nav className="bg-white border-t border-slate-200 p-2 flex justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-10">
        <button onClick={() => setActiveTab('dashboard')} className={`p-2 rounded-lg flex flex-col items-center gap-1 text-xs ${activeTab === 'dashboard' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Activity size={20} /> Dashboard
        </button>
        <button onClick={() => setActiveTab('compare')} className={`p-2 rounded-lg flex flex-col items-center gap-1 text-xs ${activeTab === 'compare' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Search size={20} /> Compare
        </button>
        <button onClick={() => setActiveTab('charts')} className={`p-2 rounded-lg flex flex-col items-center gap-1 text-xs ${activeTab === 'charts' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}>
          <BarChart2 size={20} /> Charts
        </button>
        <button onClick={() => setActiveTab('history')} className={`p-2 rounded-lg flex flex-col items-center gap-1 text-xs ${activeTab === 'history' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Clock size={20} /> History
        </button>
        <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-lg flex flex-col items-center gap-1 text-xs ${activeTab === 'settings' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Settings size={20} /> Settings
        </button>
      </nav>
    </div>
  );
};

export default Popup;

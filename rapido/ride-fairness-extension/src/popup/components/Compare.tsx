import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Search, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { storageService } from '../../services/storageService';

const Compare: React.FC = () => {
  const { searchParams, setSearchParams, aggregatedResults, clearAggregatedResults, setCurrentRide, setAnalysis, setActiveTab, setHistory } = useStore();
  const [source, setSource] = useState(searchParams?.source || '');
  const [destination, setDestination] = useState(searchParams?.destination || '');

  const handleSearch = () => {
    if (!source || !destination) return;
    
    setSearchParams({ source, destination });
    clearAggregatedResults();
    
    // Save to storage
    storageService.saveSearchState({ source, destination }, {});
    
    // Send message to background script to start search
    chrome.runtime.sendMessage({
      type: 'START_SEARCH',
      payload: { source, destination }
    });
  };

  const providers = ['Uber', 'Ola', 'Rapido'];

  // Compute comparison stats
  const completedResults = Object.values(aggregatedResults).filter(
    r => r.status === 'completed' && r.details && r.details.options.length > 0
  );

  let cheapestProvider = '';
  let cheapestPrice = Infinity;
  let mostExpensiveProvider = '';
  let mostExpensivePrice = -Infinity;
  let mostTransparentProvider = '';
  let maxTransparency = -Infinity;
  let bestFairnessProvider = '';
  let maxFairness = -Infinity;

  completedResults.forEach(r => {
    const minOptionFare = Math.min(...r.details!.options.map(o => o.fare));
    if (minOptionFare < cheapestPrice) {
      cheapestPrice = minOptionFare;
      cheapestProvider = r.provider;
    }
    if (minOptionFare > mostExpensivePrice) {
      mostExpensivePrice = minOptionFare;
      mostExpensiveProvider = r.provider;
    }

    const tScore = r.transparencyScore ?? 100;
    if (tScore > maxTransparency) {
      maxTransparency = tScore;
      mostTransparentProvider = r.provider;
    }

    const fScore = r.fairnessScore ?? 0;
    if (fScore > maxFairness) {
      maxFairness = fScore;
      bestFairnessProvider = r.provider;
    }
  });

  const showComparison = completedResults.length > 0;
  const savingsRecommendation = showComparison && cheapestProvider && mostExpensiveProvider && cheapestProvider !== mostExpensiveProvider && mostExpensivePrice - cheapestPrice > 0
    ? `Switch to ${cheapestProvider} and save ₹${(mostExpensivePrice - cheapestPrice).toFixed(0)}`
    : showComparison && cheapestProvider
      ? `Choose ${cheapestProvider} for the best rate of ₹${cheapestPrice}`
      : '';

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
        <h2 className="font-bold text-slate-800 text-lg">Compare Fares</h2>
        
        <div>
          <input 
            type="text" 
            placeholder="Pickup Location (e.g. MG Road)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
          />
          <input 
            type="text" 
            placeholder="Drop Location (e.g. Indiranagar)"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button 
          onClick={handleSearch}
          disabled={!source || !destination}
          className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-medium py-2 px-4 rounded-lg flex justify-center items-center gap-2 transition-colors"
        >
          <Search size={18} /> Search Across Apps
        </button>
      </div>

      {searchParams && (
        <div className="space-y-3">
          {showComparison && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 shadow-sm space-y-3">
              <h3 className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                <CheckCircle size={16} className="text-blue-600" />
                Comparison Summary
              </h3>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100/50 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Cheapest</span>
                  <span className="font-bold text-slate-800 mt-1">{cheapestProvider}</span>
                  <span className="text-emerald-600 font-bold text-sm mt-0.5">₹{cheapestPrice}</span>
                </div>
                
                <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100/50 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Most Transparent</span>
                  <span className="font-bold text-slate-800 mt-1">{mostTransparentProvider}</span>
                  <span className="text-indigo-600 font-bold text-xs mt-0.5">{maxTransparency}%</span>
                </div>
                
                <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100/50 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Best Fairness</span>
                  <span className="font-bold text-slate-800 mt-1">{bestFairnessProvider}</span>
                  <span className="text-blue-600 font-bold text-xs mt-0.5">{maxFairness}/100</span>
                </div>
              </div>

              {savingsRecommendation && (
                <div className="bg-emerald-50 border border-emerald-200/60 rounded-lg p-2.5 text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5 shadow-inner">
                  <span>💡</span>
                  <span>{savingsRecommendation}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-slate-500 text-center">
            {completedResults.length === providers.length ? 'Comparison complete.' : 'Opening tabs to fetch fares. Please wait...'}
          </p>
          
          {providers.map(provider => {
            const result = aggregatedResults[provider];
            const isLoading = !result || result.status === 'loading';
            
            return (
              <div key={provider} className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 text-xs">
                    {provider[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{provider}</p>
                    {result?.details && result.details.options.length > 0 ? (
                      <p className="text-xs text-slate-500">{result.details.options.length} options found</p>
                    ) : result?.estimatedDistance ? (
                      <p className="text-xs text-slate-400">Est. Distance: {result.estimatedDistance} km</p>
                    ) : (
                      <p className="text-xs text-slate-400">Connecting...</p>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  {isLoading ? (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5">
                        <Loader2 size={12} className="animate-spin text-blue-500" />
                        <span className="text-[10px] text-slate-400 font-medium">Fetching live...</span>
                      </div>
                      {result?.expectedFare && (
                        <p className="text-xs font-semibold text-slate-600">
                          Est. Fare: <span className="text-slate-800 font-bold text-sm">₹{result.expectedFare}</span>
                        </p>
                      )}
                    </div>
                  ) : result.status === 'failed' ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-red-500 font-medium bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-0.5" title="Failed to fetch live">
                        <AlertCircle size={10} /> Live failed
                      </span>
                      {result?.expectedFare && (
                        <p className="text-xs font-semibold text-slate-500">
                          Est. Fare: <span className="text-blue-600 font-bold text-sm">₹{result.expectedFare}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      {result.details && result.details.options.length > 0 ? (
                        <div className="flex flex-col gap-1 items-end">
                          <p className="font-bold text-slate-800 text-sm">
                            From ₹{Math.min(...result.details.options.map(o => o.fare))}
                          </p>
                          <div className="flex flex-col gap-1 items-end">
                             {result.details.options.slice(0, 3).map((opt, i) => {
                               const distance = result.details!.distance || 5;
                               const perKm = (opt.fare / distance).toFixed(1);
                               
                               return (
                                 <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-1 rounded w-max">
                                   <span className="font-semibold">{opt.vehicleType}</span>: ₹{opt.fare} <span className="text-slate-400 font-normal">(₹{perKm}/km)</span>
                                 </span>
                               );
                             })}
                          </div>
                          <button 
                            onClick={() => {
                              if (!result.details || !result.fairPriceAnalysis) return;
                              setCurrentRide(result.details);
                              setAnalysis(
                                result.fairPriceAnalysis,
                                { trafficLevel: 'MEDIUM', congestionScore: 50, expectedDelay: 5, weatherImpact: 'Clear' },
                                { transparencyScore: result.transparencyScore ?? 90, reasons: [] },
                                { fairnessScore: result.fairnessScore ?? 80, rating: (result.fairnessScore ?? 80) >= 80 ? 'Excellent' : 'Good' }
                              );
                              // Persist state to local storage so popup loads it
                              storageService.saveLastRide(result.details, {
                                fp: result.fairPriceAnalysis,
                                ta: { transparencyScore: result.transparencyScore ?? 90, reasons: [] },
                                fa: { fairnessScore: result.fairnessScore ?? 80, rating: (result.fairnessScore ?? 80) >= 80 ? 'Excellent' : 'Good' }
                              });
                              // Log to ride history database to feed History and Charts tabs
                              const historyEntry = {
                                id: Date.now().toString(),
                                date: Date.now(),
                                provider: result.details.provider,
                                fare: Math.min(...result.details.options.map(o => o.fare)),
                                expectedFare: result.fairPriceAnalysis.expectedFare,
                                savings: result.fairPriceAnalysis.savings,
                                fairnessScore: result.fairnessScore ?? 80
                              };
                              storageService.addHistoryEntry(historyEntry).then(() => {
                                storageService.getHistory().then(setHistory);
                              });
                              setActiveTab('dashboard');
                            }}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold hover:underline mt-1 cursor-pointer block"
                          >
                            View Breakdown →
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">No prices</p>
                      )}
                      
                      {result.fairnessScore !== undefined && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${result.fairnessScore >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          Score: {result.fairnessScore}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Compare;

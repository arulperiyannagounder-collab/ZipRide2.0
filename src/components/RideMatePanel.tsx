import React, { useState, useEffect } from 'react';
import { Sparkles, CloudRain, Shield, Fuel, Navigation, AlertTriangle, AlertCircle, Accessibility } from 'lucide-react';
import { ZipRideRepository } from '../services/dbInterface';

interface RideMatePanelProps {
  weatherCondition?: string;
  weatherRiskScore?: number;
  trafficLevel?: string;
  routes?: any[];
  activeRide?: any;
  driverMode?: boolean;
  selectedRouteIndex?: number;
}

export const RideMatePanel: React.FC<RideMatePanelProps> = ({
  weatherCondition = 'Clear',
  weatherRiskScore = 0,
  trafficLevel = 'Light',
  routes = [],
  activeRide = null,
  driverMode = false,
  selectedRouteIndex = 0
}) => {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const recs: string[] = [];
    const profile = ZipRideRepository.getProfile();
    const isAccessibilityEnabled = profile.accessibilityRequirements && profile.accessibilityRequirements.length > 0;

    // 1. Weather-based recommendations
    const wt = (weatherCondition || '').toLowerCase();
    if (wt.includes('rain') || wt.includes('drizzle')) {
      recs.push("🌧️ Heavy rain expected along the route. We have optimized vehicle assignments to ensure experienced drivers.");
      recs.push("☔ Consider booking a Cab or Auto for complete cover rather than a Bike.");
    } else if (wt.includes('storm') || wt.includes('thunder') || wt.includes('monsoon')) {
      recs.push("⚠️ Severe Monsoon Storm warning active. Road flooding likelihood: High. Speed limit capped at 50 km/h for safety.");
    } else {
      recs.push("☀️ Weather conditions are ideal. Great time for a ride!");
    }

    // 2. Traffic-based recommendations
    const tf = (trafficLevel || '').toLowerCase();
    if (tf.includes('heavy') || tf.includes('severe') || tf.includes('congestion') || tf.includes('gridlock')) {
      recs.push("🚦 Heavy traffic detected on primary corridors. Eco Route is recommended to avoid gridlock idling.");
    } else {
      recs.push("🟢 Traffic is flowing smoothly. Fastest route is fully clear.");
    }

    // 3. Fuel efficiency & Route suggestions
    if (routes && routes.length > 0) {
      const ecoRoute = routes.find(r => r.name.toLowerCase().includes('eco'));
      const activeRouteObj = routes[selectedRouteIndex];
      
      if (ecoRoute && activeRouteObj && activeRouteObj !== ecoRoute) {
        const fuelSaving = Math.round(((activeRouteObj.fuelUsageLiters - ecoRoute.fuelUsageLiters) / (activeRouteObj.fuelUsageLiters || 1)) * 100);
        if (fuelSaving > 0) {
          recs.push(`🌱 Route recommendation: Switching to the Eco Route saves approximately ${fuelSaving}% fuel consumption.`);
        }
      }
      
      // Road quality checks
      const badRoadRoute = routes.find(r => r.roadHealthScore < 70);
      if (badRoadRoute && selectedRouteIndex === routes.indexOf(badRoadRoute)) {
        recs.push("⚠️ Warning: Your selected route has low Road Health Score. Consider switching to the 'Safest' or 'Best Road' route.");
      }
    }

    // 4. Accessibility guidance
    if (isAccessibilityEnabled) {
      recs.push(`♿ Accessibility Mode active: Driver has been notified of your requirements (${profile.accessibilityRequirements.join(', ')}). Extra arrival assistance is enabled.`);
    }

    // 5. Driver-specific tips
    if (driverMode) {
      recs.push("📈 High passenger demand in Indiranagar. Move nearby to claim 1.2x surge incentives.");
      recs.push("🛡️ Speed warning: Keep speed under 60 km/h due to wet road conditions to maintain high safety score.");
      
      // Hazard simulation indicator
      const hazards = ZipRideRepository.getHazards();
      if (hazards.length > 0) {
        recs.push(`⚠️ community alerts: ${hazards.length} hazards verified near you. Watch out for potholes!`);
      }
    } else {
      // Rider-specific safety guidelines
      if (activeRide) {
        const isChildSafety = localStorage.getItem('zipride_child_safety_active') === 'true';
        const isWomenSafety = localStorage.getItem('zipride_women_safety_active') === 'true';
        
        if (isChildSafety) {
          recs.push("🔒 Child Safety active: Driver requires pickup PIN to begin. Guardian approval is mandatory at destination.");
        }
        if (isWomenSafety) {
          recs.push("🛡️ Women Safety active: GPS route tracking is active, and direct SOS shortcut is floating on the map.");
        }
      }
    }

    setRecommendations(recs);
  }, [weatherCondition, weatherRiskScore, trafficLevel, routes, activeRide, driverMode, selectedRouteIndex]);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105"
      >
        <Sparkles className="h-5 w-5 animate-pulse text-yellow-300" />
        <span className="font-semibold text-sm">Ask RideMate</span>
      </button>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-900/50 p-2 rounded-lg border border-indigo-700/30">
            <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-1.5">
              RideMate AI
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-medium">Companion</span>
            </h3>
            <p className="text-[11px] text-slate-400">Intelligent travel insights</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Minimize
        </button>
      </div>

      <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
        {recommendations.length > 0 ? (
          recommendations.map((rec, index) => {
            let icon = <Navigation className="h-4 w-4 text-sky-400 flex-shrink-0 mt-0.5" />;
            
            if (rec.includes('rain') || rec.includes('Storm') || rec.includes('🌧️') || rec.includes('☔')) {
              icon = <CloudRain className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />;
            } else if (rec.includes('Safety') || rec.includes('Women') || rec.includes('🔒') || rec.includes('🛡️')) {
              icon = <Shield className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />;
            } else if (rec.includes('fuel') || rec.includes('Eco') || rec.includes('🌱')) {
              icon = <Fuel className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />;
            } else if (rec.includes('Warning') || rec.includes('⚠️') || rec.includes('Alert')) {
              icon = <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />;
            } else if (rec.includes('Accessibility') || rec.includes('♿')) {
              icon = <Accessibility className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />;
            }

            return (
              <div 
                key={index} 
                className="flex items-start gap-3 bg-slate-800/40 border border-slate-800/80 p-3 rounded-xl hover:bg-slate-800/60 transition-colors duration-200"
              >
                {icon}
                <p className="text-xs text-slate-300 leading-relaxed font-medium">{rec}</p>
              </div>
            );
          })
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs">
            Analyzing conditions... RideMate is calculating recommendations.
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
        <span>GPS Monitoring: Active</span>
        <span>Weather Updates: Live</span>
      </div>
    </div>
  );
};
export default RideMatePanel;

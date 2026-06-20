import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { storageService } from '../../services/storageService';
import { 
  Save, 
  RotateCcw, 
  Sliders, 
  Palette, 
  ShieldCheck, 
  MapPin, 
  Flame, 
  Zap, 
  Clock, 
  Calculator,
  CheckCircle2
} from 'lucide-react';
import type { UserSettings } from '../../types';

interface PresetItem {
  name: string;
  desc: string;
  icon: string;
  baseFare: number;
  distanceRate: number;
  timeRate: number;
  fixedServiceFee: number;
  trafficMultiplier: number;
  nightSurgeRate: number;
  tollRate: number;
  fuelAdjustment: number;
  estimatedSpeed: number;
}

const PRESETS: Record<string, PresetItem> = {
  bangaloreAuto: { 
    name: 'Bangalore Auto', 
    desc: 'Local three-wheeler meter baseline',
    icon: '🛺',
    baseFare: 30, distanceRate: 15, timeRate: 0, fixedServiceFee: 5, 
    trafficMultiplier: 1.15, nightSurgeRate: 1.0, tollRate: 0, fuelAdjustment: 0, estimatedSpeed: 20 
  },
  bangaloreCab: { 
    name: 'Bangalore Cab', 
    desc: 'Standard hatchback/sedan taxi rates',
    icon: '🚗',
    baseFare: 80, distanceRate: 18, timeRate: 2, fixedServiceFee: 15, 
    trafficMultiplier: 1.25, nightSurgeRate: 1.0, tollRate: 0, fuelAdjustment: 1.5, estimatedSpeed: 25 
  },
  delhiCab: { 
    name: 'Delhi Cab Standard', 
    desc: 'NCR taxi pricing model baseline',
    icon: '🚕',
    baseFare: 50, distanceRate: 16, timeRate: 1.5, fixedServiceFee: 10, 
    trafficMultiplier: 1.2, nightSurgeRate: 1.0, tollRate: 30, fuelAdjustment: 0, estimatedSpeed: 30 
  },
  mumbaiAuto: { 
    name: 'Mumbai Auto', 
    desc: 'Standard local auto-rickshaw meter',
    icon: '🛺',
    baseFare: 23, distanceRate: 15.3, timeRate: 0, fixedServiceFee: 0, 
    trafficMultiplier: 1.1, nightSurgeRate: 1.0, tollRate: 0, fuelAdjustment: 0, estimatedSpeed: 22 
  }
};

const DEFAULT_SETTINGS: UserSettings = {
  distanceRate: 15,
  timeRate: 2,
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

const SettingsView: React.FC = () => {
  const { settings, setSettings } = useStore();
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings || DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'rates' | 'advanced' | 'surge'>('rates');
  const [saved, setSaved] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Simulator state
  const [simDistance, setSimDistance] = useState<number>(8);
  const [simTime, setSimTime] = useState<number>(18);

  // Sync state when store settings finish loading
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  // Sync test duration based on speed slider
  useEffect(() => {
    if (localSettings?.estimatedSpeed) {
      const speed = localSettings.estimatedSpeed;
      const duration = Math.round((simDistance / speed) * 60) + 3; // speed-based duration + 3m traffic delay
      setSimTime(duration);
    }
  }, [simDistance, localSettings?.estimatedSpeed]);

  if (!localSettings) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <div className="animate-pulse text-slate-400 text-sm font-semibold">Loading settings...</div>
      </div>
    );
  }

  const handleSave = async () => {
    await storageService.saveSettings(localSettings);
    setSettings(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
    setActivePreset(null);
  };

  const handlePresetSelect = (presetKey: string) => {
    const preset = PRESETS[presetKey];
    setLocalSettings(prev => ({
      ...prev,
      baseFare: preset.baseFare,
      distanceRate: preset.distanceRate,
      timeRate: preset.timeRate,
      fixedServiceFee: preset.fixedServiceFee,
      trafficMultiplier: preset.trafficMultiplier,
      nightSurgeRate: preset.nightSurgeRate,
      tollRate: preset.tollRate,
      fuelAdjustment: preset.fuelAdjustment,
      estimatedSpeed: preset.estimatedSpeed
    }));
    setActivePreset(presetKey);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setLocalSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : parseFloat(value)
    }));
    setActivePreset(null); // break preset sync
  };

  const handleSliderChange = (name: keyof UserSettings, val: number) => {
    setLocalSettings(prev => ({
      ...prev,
      [name]: val
    }));
    setActivePreset(null);
  };

  // Sensitivity label helper
  const getSensitivityLabel = (val: number) => {
    if (val < 30) return { text: 'Relaxed (Permissive)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (val < 75) return { text: 'Balanced (Standard)', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    return { text: 'Strict (Audit Mode)', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  // Pricing math simulation
  const baseCost = localSettings.baseFare;
  const adjustedDistRate = Math.max(0, localSettings.distanceRate + localSettings.fuelAdjustment);
  const distanceCost = simDistance * adjustedDistRate;
  const timeCost = simTime * localSettings.timeRate;
  const subTotal = baseCost + distanceCost + timeCost + localSettings.fixedServiceFee;
  const trafficSurgeCost = subTotal * (localSettings.trafficMultiplier - 1.0);
  const nightSurgeCost = subTotal * (localSettings.nightSurgeRate - 1.0);
  const simExpectedFare = Math.round(subTotal + trafficSurgeCost + nightSurgeCost + localSettings.tollRate);

  return (
    <div className="space-y-6 pb-8 text-left">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 p-5 rounded-2xl text-white shadow-md">
        <div className="relative z-10">
          <h2 className="font-bold text-xl flex items-center gap-2 text-white">
            <Sliders className="text-blue-100" size={20} />
            Fairness Configuration
          </h2>
          <p className="text-xs text-blue-100 mt-1 opacity-90">
            Fine-tune billing rates, thresholds, and simulation parameters to verify transparency.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-24 bg-white/5 skew-x-12 translate-x-6 z-0 pointer-events-none" />
      </div>

      {/* Preset Cards Selector */}
      <div className="space-y-2.5">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <MapPin size={13} className="text-slate-400" />
          City &amp; Vehicle Presets
        </span>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => handlePresetSelect(key)}
              className={`p-3 border rounded-xl text-left transition-all hover:scale-[1.02] cursor-pointer flex flex-col justify-between h-20 ${
                activePreset === key 
                  ? 'border-blue-500 bg-blue-50/50 shadow-sm shadow-blue-100/50' 
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="text-[11px] font-bold text-slate-800 truncate leading-none">
                  {preset.name}
                </span>
                <span className="text-base leading-none">{preset.icon}</span>
              </div>
              <div className="mt-1">
                <p className="text-[9px] text-slate-400 truncate line-clamp-1">{preset.desc}</p>
                <div className="flex gap-1.5 mt-1.5">
                  <span className="text-[8px] px-1 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                    Base: ₹{preset.baseFare}
                  </span>
                  <span className="text-[8px] px-1 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                    Km: ₹{preset.distanceRate}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tabbed Layout Area */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-1">
          <button 
            type="button"
            onClick={() => setActiveTab('rates')}
            className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'rates' ? 'bg-white text-blue-600 shadow-xs border border-slate-100' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Base Rates
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('advanced')}
            className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'advanced' ? 'bg-white text-blue-600 shadow-xs border border-slate-100' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Advanced
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('surge')}
            className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'surge' ? 'bg-white text-blue-600 shadow-xs border border-slate-100' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Surcharges &amp; UI
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="p-4">
          {activeTab === 'rates' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Base Fare (₹)</label>
                  <input 
                    type="number" 
                    name="baseFare"
                    value={localSettings.baseFare} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold text-slate-700"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">Starting flat price</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Platform Booking Fee (₹)</label>
                  <input 
                    type="number" 
                    name="fixedServiceFee"
                    value={localSettings.fixedServiceFee} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold text-slate-700"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">Provider service charge</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Cost per Km (₹)</label>
                  <input 
                    type="number" 
                    name="distanceRate"
                    value={localSettings.distanceRate} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold text-slate-700"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">Charge per travel distance</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Cost per Min (₹)</label>
                  <input 
                    type="number" 
                    name="timeRate"
                    value={localSettings.timeRate} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold text-slate-700"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">Time duration billing</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Flame size={12} className="text-amber-500" />
                      Fuel Adjuster (₹/km)
                    </label>
                    <span className="text-xs font-semibold text-slate-700">₹{localSettings.fuelAdjustment > 0 ? `+${localSettings.fuelAdjustment}` : localSettings.fuelAdjustment}</span>
                  </div>
                  <input 
                    type="range"
                    min="-5"
                    max="10"
                    step="0.5"
                    value={localSettings.fuelAdjustment}
                    onChange={(e) => handleSliderChange('fuelAdjustment', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">Offsets baseline distance rate for fuel price index changes</span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Clock size={12} className="text-indigo-500" />
                      Assumed Average Speed (km/h)
                    </label>
                    <span className="text-xs font-semibold text-slate-700">{localSettings.estimatedSpeed} km/h</span>
                  </div>
                  <input 
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    value={localSettings.estimatedSpeed}
                    onChange={(e) => handleSliderChange('estimatedSpeed', parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">Used to compute expected trip duration when page scrapers fail</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Average Toll Charges (₹)</label>
                  <input 
                    type="number" 
                    name="tollRate"
                    value={localSettings.tollRate} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold text-slate-700"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">Average flyover/airport tolls added to expectation</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'surge' && (
            <div className="space-y-4">
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-500">
                      Traffic Congestion Factor
                    </label>
                    <span className="text-xs font-semibold text-slate-700">{localSettings.trafficMultiplier}x</span>
                  </div>
                  <input 
                    type="range"
                    min="1.0"
                    max="2.0"
                    step="0.05"
                    value={localSettings.trafficMultiplier}
                    onChange={(e) => handleSliderChange('trafficMultiplier', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">Baseline markup multiplier simulating active rush-hour periods</span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-500">
                      Night-Time Surge Rate
                    </label>
                    <span className="text-xs font-semibold text-slate-700">{localSettings.nightSurgeRate}x</span>
                  </div>
                  <input 
                    type="range"
                    min="1.0"
                    max="1.5"
                    step="0.05"
                    value={localSettings.nightSurgeRate}
                    onChange={(e) => handleSliderChange('nightSurgeRate', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">Surcharge multiplier applied for late hours (typically 11PM-5AM)</span>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <ShieldCheck size={12} className="text-slate-400" />
                      Transparency Audit Sensitivity
                    </label>
                    <span className="text-xs font-semibold text-slate-700">{localSettings.transparencySensitivity}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={localSettings.transparencySensitivity} 
                    onChange={(e) => handleSliderChange('transparencySensitivity', parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                    <span>Low Audit</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${getSensitivityLabel(localSettings.transparencySensitivity).color}`}>
                      {getSensitivityLabel(localSettings.transparencySensitivity).text}
                    </span>
                    <span>High Audit</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simulator Sandbox */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3.5 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center gap-1.5 border-b border-white/10 pb-2">
          <Calculator className="text-blue-400" size={16} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Real-Time Fare Calculator Sandbox
          </h3>
        </div>

        {/* Sliders for Simulation */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span>Distance</span>
              <span className="font-semibold text-white">{simDistance} km</span>
            </div>
            <input 
              type="range"
              min="1"
              max="40"
              value={simDistance}
              onChange={(e) => setSimDistance(parseInt(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-400"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span>Duration (Auto)</span>
              <span className="font-semibold text-white">{simTime} min</span>
            </div>
            <div className="h-1 bg-white/10 rounded-lg relative overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${Math.min(100, (simTime / 90) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Live Formula math breakdown */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/5 font-mono text-[9px] text-slate-300 space-y-1.5">
          <div className="flex justify-between">
            <span>Base Flat Fare:</span>
            <span className="text-white">₹{baseCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Distance Cost ({simDistance} km × ₹{adjustedDistRate.toFixed(1)}):</span>
            <span className="text-white">₹{distanceCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Time Cost ({simTime} min × ₹{localSettings.timeRate}):</span>
            <span className="text-white">₹{timeCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Platform Service Fee:</span>
            <span className="text-white">₹{localSettings.fixedServiceFee.toFixed(2)}</span>
          </div>
          {(trafficSurgeCost > 0 || nightSurgeCost > 0 || localSettings.tollRate > 0) && (
            <div className="border-t border-white/5 pt-1.5 mt-1 text-slate-400">
              <span className="block font-semibold mb-1 text-[8px] uppercase tracking-wider text-slate-400">Modifiers:</span>
              {trafficSurgeCost > 0 && (
                <div className="flex justify-between text-[8px]">
                  <span>Traffic Surge ({localSettings.trafficMultiplier}x):</span>
                  <span className="text-amber-400">+₹{trafficSurgeCost.toFixed(2)}</span>
                </div>
              )}
              {nightSurgeCost > 0 && (
                <div className="flex justify-between text-[8px]">
                  <span>Night-Time surcharge ({localSettings.nightSurgeRate}x):</span>
                  <span className="text-yellow-400">+₹{nightSurgeCost.toFixed(2)}</span>
                </div>
              )}
              {localSettings.tollRate > 0 && (
                <div className="flex justify-between text-[8px]">
                  <span>Average Toll Cost:</span>
                  <span className="text-indigo-400">+₹{localSettings.tollRate.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-between border-t border-white/10 pt-2 mt-1.5 text-xs font-bold text-white">
            <span className="flex items-center gap-1 font-sans text-[10px]">
              Expected Total Fare:
            </span>
            <span className="text-emerald-400 font-mono text-sm">₹{simExpectedFare}</span>
          </div>
        </div>
      </div>

      {/* Interface Settings Section */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
        <div>
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Palette size={14} className="text-slate-400" />
            Dark Mode Styling
          </span>
          <p className="text-[10px] text-slate-400 mt-0.5">Toggle browser popup theme styling</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            name="darkMode"
            checked={localSettings.darkMode} 
            onChange={handleChange}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3 pt-2">
        <button 
          onClick={handleReset}
          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-1.5 text-xs transition-colors cursor-pointer"
          title="Reset back to standard baseline rates"
        >
          <RotateCcw size={14} /> Reset
        </button>
        <button 
          onClick={handleSave}
          className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-1.5 text-xs transition-all shadow-md shadow-blue-200 cursor-pointer"
        >
          {saved ? (
            <>
              <CheckCircle2 size={14} className="animate-bounce" /> Saved Successfully!
            </>
          ) : (
            <>
              <Save size={14} /> Save Configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SettingsView;

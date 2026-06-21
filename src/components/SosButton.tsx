// src/components/SosButton.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, AlertCircle, Heart, Phone, MapPin, Check, Activity, ArrowRight, User, Send } from 'lucide-react';
import { useToast } from './ToastNotification';
import { ZipRideRepository } from '../services/dbInterface';
import { FamilySafetyModule } from '../services/FamilySafetyModule';

interface SosButtonProps {
  rideId: string;
  onClick?: (rideId: string) => void;
}

export const SosButton: React.FC<SosButtonProps> = ({ rideId, onClick }) => {
  const { showToast } = useToast();
  
  // Hold-to-activate states
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Dashboard states
  const [showDashboard, setShowDashboard] = useState(false);
  const [profile, setProfile] = useState(() => ZipRideRepository.getProfile());
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const [hospitalEta, setHospitalEta] = useState<number>(4);
  const [hospitalDistance, setHospitalDistance] = useState<string>('1.8 km');
  const [hospitalAlertSent, setHospitalAlertSent] = useState(false);
  const [ambulanceCalled, setAmbulanceCalled] = useState(false);
  const [guardianNotified, setGuardianNotified] = useState(false);
  const [continueDest, setContinueDest] = useState(false);

  // List of mock hospitals nearby
  const hospitals = [
    { name: 'Apollo Emergency Care', eta: 4, dist: '1.8 km' },
    { name: 'Fortis Medical Center', eta: 7, dist: '3.2 km' },
    { name: 'Manipal Emergency Ward', eta: 9, dist: '4.5 km' }
  ];

  // Refresh profile on mount
  useEffect(() => {
    setProfile(ZipRideRepository.getProfile());
  }, [showDashboard]);

  const triggerSOSBackend = async (type: string) => {
    try {
      await fetch('/api/emergency/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rideId,
          reason: type,
          isSilentSOS: false
        })
      });
      if (onClick) {
        onClick(rideId);
      }
    } catch (e) {
      console.error('Failed to report SOS to backend:', e);
    }
  };

  const handleStartHolding = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsHolding(true);
    setProgress(0);
    const start = Date.now();
    startTimeRef.current = start;

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / 5000) * 100, 100);
      setProgress(pct);

      if (elapsed >= 5000) {
        clearInterval(holdTimerRef.current!);
        holdTimerRef.current = null;
        setIsHolding(false);
        setProgress(0);
        if (navigator.vibrate) {
          navigator.vibrate([300, 100, 300]);
        }
        setShowDashboard(true);
        setGuardianNotified(true); // Auto notify guardian
        triggerSOSBackend('Medical Emergency SOS');
        // Notify guardian via simulated SMS API
        FamilySafetyModule.sendGuardianAlert('emergency', {
          rideId,
          riderName: profile.fullName,
          pickup: 'Current Ride Coordinates',
          drop: 'Nearest Hospital ER'
        });
        const sosMsg = 'Medical SOS activated! Guardian and dispatch teams alerted.';
        showToast(sosMsg, 'error');
        if (profile.accessibilityRequirements?.includes('Visually Impaired') && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(sosMsg));
        }
      }
    }, 50);
  };

  const handleStopHolding = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
    setProgress(0);
  };

  const handleSelectHospital = (hospName: string, eta: number, dist: string) => {
    setSelectedHospital(hospName);
    setHospitalEta(eta);
    setHospitalDistance(dist);
    setHospitalAlertSent(true);
    setContinueDest(false);
    
    // Simulate rerouting on server
    fetch(`/api/rides/${rideId}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'anomaly',
        speed: 48,
        motion: 'moving',
        alertMsg: `Emergency Reroute to ${hospName}`
      })
    }).catch(err => console.error(err));

    const hospMsg = `Reroute path calculated. Transmitting pre-arrival telemetry to ${hospName}.`;
    showToast(hospMsg, 'success');
    if (profile.accessibilityRequirements?.includes('Visually Impaired') && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(`Emergency reroute to ${hospName}. Pre arrival telemetry transmitted.`));
    }
  };

  const handleCallAmbulance = () => {
    setAmbulanceCalled(true);
    const ambMsg = 'Ambulance dispatched! 108 Emergency responders notified.';
    showToast(ambMsg, 'success');
    if (profile.accessibilityRequirements?.includes('Visually Impaired') && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(ambMsg));
    }
  };

  const handleNotifyGuardian = () => {
    setGuardianNotified(true);
    const smsMsg = `Emergency SMS sent with live tracking and medical card to ${profile.guardianName}.`;
    showToast(smsMsg, 'success');
    if (profile.accessibilityRequirements?.includes('Visually Impaired') && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(`Guardian ${profile.guardianName} notified of emergency status.`));
    }
  };

  const handleContinueDestination = () => {
    setContinueDest(true);
    setSelectedHospital(null);
    setHospitalAlertSent(false);
    showToast('Continuing destination. Safety monitoring remains active.', 'info');
  };

  return (
    <>
      {/* SOS Button with circular hold progress */}
      <div className="absolute top-4 right-4 z-40">
        <button
          onMouseDown={handleStartHolding}
          onMouseUp={handleStopHolding}
          onMouseLeave={handleStopHolding}
          onTouchStart={handleStartHolding}
          onTouchEnd={handleStopHolding}
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-rose-650 hover:bg-rose-700 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all select-none cursor-pointer border-2 border-rose-500"
          title="Hold 5 seconds for Medical SOS"
          aria-label="Hold SOS Button"
        >
          {isHolding ? (
            <div className="absolute inset-0 rounded-full flex items-center justify-center bg-slate-950/80">
              <span className="text-[10px] font-black text-rose-400 font-mono">{Math.floor(progress / 20)}s</span>
              {/* Circular progress SVG */}
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  className="stroke-rose-650 fill-transparent"
                  strokeWidth="4"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  className="stroke-rose-400 fill-transparent transition-all duration-75"
                  strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={2 * Math.PI * 24 * (1 - progress / 100)}
                />
              </svg>
            </div>
          ) : (
            <ShieldAlert className="w-7 h-7 animate-pulse text-white" />
          )}
        </button>
        <span className="absolute -bottom-5 right-0 left-0 text-[8px] text-center font-bold tracking-wider text-rose-400 uppercase pointer-events-none drop-shadow-md">
          {isHolding ? 'HOLDING...' : 'HOLD SOS 5S'}
        </span>
      </div>

      {/* MEDICAL EMERGENCY DASHBOARD OVERLAY */}
      {showDashboard && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-9999 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#0b1329] border-2 border-rose-500 rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 text-white">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 animate-pulse">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-rose-500 tracking-tight uppercase">Medical Emergency Dashboard</h2>
                  <p className="text-xs text-slate-400">SOS Activated • Safety dispatch teams monitoring live telemetry</p>
                </div>
              </div>
              <button
                onClick={() => setShowDashboard(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer border border-slate-700"
              >
                Close Dashboard
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Rider Emergency Medical Card */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Rider Medical Details
                </span>
                
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-400">FullName:</span>
                    <span className="font-bold">{profile.fullName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-400">Age / Gender:</span>
                    <span className="font-bold">{profile.age} yrs / {profile.gender}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5 text-rose-400 font-bold">
                    <span>Blood Group:</span>
                    <span>{profile.bloodGroup || 'O+'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-400">Allergies:</span>
                    <span className="font-bold text-amber-400">{profile.allergies || 'None'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-400">Chronic Conditions:</span>
                    <span className="font-bold text-rose-400">
                      {[profile.asthma ? 'Asthma' : '', profile.diabetes ? 'Diabetes' : ''].filter(Boolean).join(', ') || 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-400">Medications:</span>
                    <span className="font-semibold text-slate-200">{profile.medications || 'None'}</span>
                  </div>
                  <div className="flex justify-between pb-1.5">
                    <span className="text-slate-400">Preferred Hospital:</span>
                    <span className="font-bold text-indigo-300">{profile.preferredHospital || 'None Specified'}</span>
                  </div>
                </div>
                
                {/* Emergency Contact Block */}
                <div className="mt-4 pt-4 border-t border-slate-800 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider font-mono block">Guardian Network Contact</span>
                  <div className="text-xs space-y-1 mt-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{profile.guardianName} ({profile.guardianRelationship})</span>
                      <span className="font-bold font-mono">{profile.guardianPhone}</span>
                    </div>
                    {profile.guardianEmail && (
                      <span className="text-[11px] text-slate-500 block">{profile.guardianEmail}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Emergency Actions */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Emergency Controls
                </span>

                {/* Option Grid */}
                <div className="grid grid-cols-1 gap-3">
                  
                  {/* Ambulance Option */}
                  <button
                    onClick={handleCallAmbulance}
                    className={`p-4 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                      ambulanceCalled 
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' 
                        : 'border-slate-800 bg-slate-900 hover:border-slate-700 text-white'
                    }`}
                  >
                    <div className="p-2 bg-rose-500/15 text-rose-500 rounded-lg shrink-0">
                      <Phone className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wide">Call Emergency Ambulance (108)</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {ambulanceCalled ? 'Ambulance responding - Dispatch ETA 8 mins' : 'Direct cellular call dispatch simulation'}
                      </p>
                    </div>
                  </button>

                  {/* Guardian Option */}
                  <button
                    onClick={handleNotifyGuardian}
                    className={`p-4 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                      guardianNotified 
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' 
                        : 'border-slate-800 bg-slate-900 hover:border-slate-700 text-white'
                    }`}
                  >
                    <div className="p-2 bg-indigo-500/15 text-indigo-400 rounded-lg shrink-0">
                      <Send className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wide">Notify Family Guardian</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {guardianNotified ? 'Guardian network updated with GPS & medical card link' : 'SMS emergency broadcast to configured number'}
                      </p>
                    </div>
                  </button>

                  {/* Continue Destination Option */}
                  <button
                    onClick={handleContinueDestination}
                    className={`p-4 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                      continueDest 
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' 
                        : 'border-slate-800 bg-slate-900 hover:border-slate-700 text-white'
                    }`}
                  >
                    <div className="p-2 bg-slate-800 text-slate-400 rounded-lg shrink-0">
                      <ArrowRight className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wide">Continue to Destination</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Maintain original drop address but keep SOS active</p>
                    </div>
                  </button>

                </div>

                {/* Nearest Hospital Rerouting List */}
                <div className="border border-slate-850 p-4 rounded-2xl bg-slate-900/40 space-y-3">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider font-mono flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Nearest Emergency Rooms
                  </span>
                  
                  <div className="space-y-2">
                    {hospitals.map(hosp => {
                      const isSelected = selectedHospital === hosp.name;
                      return (
                        <button
                          key={hosp.name}
                          onClick={() => handleSelectHospital(hosp.name, hosp.eta, hosp.dist)}
                          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition text-xs cursor-pointer ${
                            isSelected
                              ? 'border-rose-500 bg-rose-500/15 text-rose-300'
                              : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="font-bold block text-slate-200">{hosp.name}</span>
                            <span className="text-[10px] text-slate-400">ETA {hosp.eta} mins • {hosp.dist} away</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isSelected ? (
                              <span className="px-2 py-0.5 rounded bg-rose-500 text-[9px] font-black uppercase text-white animate-pulse">REROUTING</span>
                            ) : (
                              <span className="text-[10px] font-bold text-indigo-400 hover:underline">Select & Go</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>

            {/* Hospital Pre-Arrival Alert Panel */}
            {hospitalAlertSent && selectedHospital && (
              <div className="bg-rose-950/40 border border-rose-500/30 p-4 rounded-2xl flex items-start gap-3 animate-pulse">
                <Activity className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-rose-300 uppercase tracking-wide">Hospital Pre-Arrival Alert Broadcasted</h4>
                  <p className="text-[11px] text-slate-300">
                    Incoming Patient Alert transmitted to <span className="font-bold text-white">{selectedHospital}</span> ER. Doctors are prepped with your vitals, blood type (<span className="font-bold text-rose-400">{profile.bloodGroup}</span>), asthma (<span className="font-bold text-rose-400">{profile.asthma ? 'Yes' : 'No'}</span>) and allergies (<span className="font-bold text-rose-400">{profile.allergies}</span>).
                  </p>
                  <div className="flex items-center gap-2 mt-2 font-mono text-[10px] text-slate-400">
                    <span>ETA: {hospitalEta} mins</span>
                    <span>•</span>
                    <span>Distance: {hospitalDistance}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-bold">ER READY</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, 
  MapPin, 
  CircleDot, 
  ShieldAlert, 
  ShieldCheck, 
  MessageSquare, 
  Send, 
  Gauge, 
  User, 
  Lock, 
  Play, 
  HelpCircle,
  Clock,
  ArrowRight,
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { Ride, Driver } from '../types';
import { SosButton } from './SosButton';
import LiveJourneyMap from './LiveJourneyMap';

interface RideTrackerViewProps {
  activeRide: Ride | null;
  onRefresh: () => void;
  onFileDispute: (rideId: string, reason: string) => Promise<void>;
  drivers: Driver[];
  onPushRiderLocation: (rideId: string, lat: number, lng: number) => Promise<void>;
  onRateRide: (id: string, rating: number) => Promise<void>;
  onPayRide?: (id: string, reference?: string, method?: string, status?: string) => Promise<void>;
}

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export default function RideTrackerView({
  activeRide,
  onRefresh,
  onFileDispute,
  drivers,
  onPushRiderLocation,
  onRateRide,
  onPayRide
}: RideTrackerViewProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  console.log("Active Ride:", activeRide);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { 
      role: 'model', 
      parts: [{ text: "Hello! I am ZipRide's Intelligent Safety & Fare Assistant. Ask me any questions about our pricing formulas (base ₹20, variable ₹12/km & ₹1.5/min), current dynamic weather surcharges, traffic factors, or how our real-time bad-driving fare drop refunds work!" }] 
    }
  ]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [showSafetyConfirm, setShowSafetyConfirm] = useState(false);
  const [safetyLog, setSafetyLog] = useState<string[]>([]);
  const [disputeFiled, setDisputeFiled] = useState(false);
  const [complaintText, setComplaintText] = useState('');
  
  const [showQRPanel, setShowQRPanel] = useState(false);
  const [merchantUpiId, setMerchantUpiId] = useState('zipride@upi');
  const [isSuccessPaid, setIsSuccessPaid] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [selectedApp, setSelectedApp] = useState<'GooglePay' | 'PhonePe' | 'Paytm' | 'BHIM' | 'AmazonPay' | 'Cash' | 'Razorpay' | 'Stripe'>('GooglePay');
  const [paymentInfoMessage, setPaymentInfoMessage] = useState('');

  // Payment/Rating Modal States refactored to Finite State Machine (FSM)
  type RideState = 
    | 'accepted' 
    | 'arriving' 
    | 'started' 
    | 'in_progress' 
    | 'completed' 
    | 'payment_pending' 
    | 'payment_processing' 
    | 'payment_success' 
    | 'rating' 
    | 'closed';

  const [rideState, setRideState] = useState<RideState>('closed');
  const [paymentTimeoutActive, setPaymentTimeoutActive] = useState(false);
  const paymentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [completedRide, setCompletedRide] = useState<Ride | null>(null);
  const prevRideIdRef = useRef<string | null>(null);

  const transitionTo = (nextState: RideState) => {
    if (rideState === nextState) return;
    console.log(`[RideState] Transition: Current State = ${rideState}, Next State = ${nextState}, Timestamp = ${new Date().toISOString()}`);
    setRideState(nextState);

    // side-effects on state entry
    if (nextState === 'payment_processing') {
      setPaymentTimeoutActive(false);
      if (paymentTimeoutRef.current) clearTimeout(paymentTimeoutRef.current);
      paymentTimeoutRef.current = setTimeout(() => {
        console.log(`[RideState] Payment processing timed out. Timestamp = ${new Date().toISOString()}`);
        setPaymentTimeoutActive(true);
      }, 10000); // 10 seconds timeout
    } else {
      if (paymentTimeoutRef.current) {
        clearTimeout(paymentTimeoutRef.current);
        paymentTimeoutRef.current = null;
      }
      setPaymentTimeoutActive(false);
    }
  };

  const mapStatusToState = (status: string, payStatus?: string): RideState => {
    if (status === 'completed') {
      if (payStatus === 'paid') return 'payment_success';
      if (payStatus === 'processing') return 'payment_processing';
      return 'payment_pending';
    }
    if (status === 'cancelled') return 'closed';
    if (status === 'booked' || status === 'assigned') return 'accepted';
    if (status === 'pickup' || status === 'arrived') return 'arriving';
    if (status === 'en_route') return 'started';
    if (status === 'in_progress' || status === 'anomaly') return 'in_progress';
    return 'accepted';
  };

  // Reset/sync FSM states on ride transition/change and handle New Ride Created / Ride Reset
  useEffect(() => {
    if (activeRide) {
      const isNewRide = prevRideIdRef.current !== activeRide.id;
      if (isNewRide) {
        console.log("New Ride Created");
        prevRideIdRef.current = activeRide.id;
        
        // Reset all states for a completely fresh ride session
        setCompletedRide(null);
        setDisputeFiled(false);
        setComplaintText('');
        setShowQRPanel(false);
        setSafetyLog([]);
        setShowSafetyConfirm(false);
        setPaymentInfoMessage('');
        setIsPaying(false);
        setIsSuccessPaid(activeRide.paymentStatus === 'paid');
        
        const initial = mapStatusToState(activeRide.status, activeRide.paymentStatus);
        transitionTo(initial);
        console.log("Ride Reset");
      } else {
        // If it's an existing ride, update states unless in terminal override states
        const ignoreStates: RideState[] = ['payment_processing', 'payment_success', 'rating', 'closed'];
        if (!ignoreStates.includes(rideState)) {
          const targetState = mapStatusToState(activeRide.status, activeRide.paymentStatus);
          if (targetState !== rideState) {
            transitionTo(targetState);
          }
        } else if (rideState === 'payment_processing' && activeRide.paymentStatus === 'paid') {
          transitionTo('payment_success');
        }
      }

      // Sync Payment Open log
      if (activeRide.status === 'completed' && activeRide.paymentStatus !== 'paid' && !isSuccessPaid && rideState === 'payment_pending') {
        console.log("Payment Open");
      }
    } else {
      // Clear all states if no active ride is present
      setCompletedRide(null);
      setIsSuccessPaid(false);
      setIsPaying(false);
      setDisputeFiled(false);
      setComplaintText('');
      setShowQRPanel(false);
      setSafetyLog([]);
      setShowSafetyConfirm(false);
      if (prevRideIdRef.current) {
        console.log("Ride Reset");
      }
      prevRideIdRef.current = null;
      transitionTo('closed');
    }
  }, [activeRide?.id, activeRide?.status, activeRide?.paymentStatus]);

  const handleLaunchAppAndPay = async (appName: typeof selectedApp) => {
    if (!activeRide) return;
    setSelectedApp(appName);
    
    console.log("Payment Open");
    transitionTo('payment_processing');
    setIsPaying(true);

    if (onPayRide) {
      await onPayRide(activeRide.id, undefined, appName, 'processing');
    }

    if (appName === 'Cash') {
      setTimeout(async () => {
        // If timed out or cancelled during verification, ignore timeout callback
        if (paymentTimeoutRef.current === null) return;

        const refCode = `CASH-${Math.floor(100000 + Math.random() * 900000)}`;
        console.log("Payment Success");
        setIsSuccessPaid(true);
        setIsPaying(false);
        setCompletedRide(activeRide);

        // Open rating screen once and close payment
        transitionTo('rating');
        console.log("Rating Open");

        if (onPayRide) {
          await onPayRide(activeRide.id, refCode, 'Cash', 'paid');
        }
      }, 1500);
      return;
    }

    if (appName === 'Razorpay' || appName === 'Stripe') {
      setPaymentInfoMessage(`${appName} gateway integration is ready. Simulation will proceed.`);
      setTimeout(() => setPaymentInfoMessage(''), 3000);
      return;
    }

    // Generate UPI String
    const upiString = `upi://pay?pa=${merchantUpiId}&pn=ZipRide&am=${activeRide.finalFare.toFixed(2)}&cu=INR&tn=Ride-${activeRide.id}`;
    
    // Map to deep link
    let deepLink = upiString;
    if (appName === 'GooglePay') {
      deepLink = `gpay://upi/pay?pa=${merchantUpiId}&pn=ZipRide&am=${activeRide.finalFare.toFixed(2)}&cu=INR&tn=Ride-${activeRide.id}`;
    } else if (appName === 'PhonePe') {
      deepLink = `phonepe://upi/pay?pa=${merchantUpiId}&pn=ZipRide&am=${activeRide.finalFare.toFixed(2)}&cu=INR&tn=Ride-${activeRide.id}`;
    } else if (appName === 'Paytm') {
      deepLink = `paytmmp://upi/pay?pa=${merchantUpiId}&pn=ZipRide&am=${activeRide.finalFare.toFixed(2)}&cu=INR&tn=Ride-${activeRide.id}`;
    } else if (appName === 'BHIM') {
      deepLink = `bhim://upi/pay?pa=${merchantUpiId}&pn=ZipRide&am=${activeRide.finalFare.toFixed(2)}&cu=INR&tn=Ride-${activeRide.id}`;
    } else if (appName === 'AmazonPay') {
      deepLink = `amazonpay://upi/pay?pa=${merchantUpiId}&pn=ZipRide&am=${activeRide.finalFare.toFixed(2)}&cu=INR&tn=Ride-${activeRide.id}`;
    }

    console.log(`Launching deep link for ${appName}: ${deepLink}`);

    // Attempt to open custom protocol with standard fallback
    try {
      window.location.href = deepLink;
    } catch (e) {
      console.warn("Deep link redirection failed, default fallback standard link launched:", upiString);
      try {
        window.open(upiString, '_blank');
      } catch (err) {}
    }

    // Simulate completion
    setTimeout(async () => {
      // If timed out or cancelled during verification, ignore timeout callback
      if (paymentTimeoutRef.current === null) return;

      const refCode = `TXN-${appName.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
      console.log("Payment Success");
      setIsSuccessPaid(true);
      setIsPaying(false);
      setCompletedRide(activeRide);

      // Open rating screen once
      transitionTo('rating');
      console.log("Rating Open");

      if (onPayRide) {
        await onPayRide(activeRide.id, refCode, appName, 'paid');
      }
    }, 2500);
  };

  const handleRatingSelect = async (stars: number) => {
    const rideToRate = activeRide || completedRide;
    if (!rideToRate) return;
    
    console.log("Rating Submitted:", stars);
    if (onRateRide) {
      await onRateRide(rideToRate.id, stars);
    }
    
    // Move FSM state to closed
    transitionTo('closed');
    
    // Fully clear ride-completion state
    console.log("Ride Reset");
    localStorage.setItem(`zipride_dismissed_passenger_ride_${rideToRate.id}`, 'true');
    prevRideIdRef.current = null;
    setCompletedRide(null);
    setDisputeFiled(false);
    setComplaintText('');
    setShowQRPanel(false);
    setSafetyLog([]);
    setShowSafetyConfirm(false);
    setPaymentInfoMessage('');
    setIsPaying(false);
    setIsSuccessPaid(false);
    
    onRefresh();
    
    // Redirect to booking
    window.history.pushState(null, '', '/booking');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Poll for active ride updates every 2 seconds if active
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    if (activeRide && ['booked', 'assigned', 'pickup', 'en_route', 'anomaly'].includes(activeRide.status)) {
      pollInterval = setInterval(() => {
        onRefresh();
      }, 2000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeRide]);

  // Get assigned driver details from drivers pool
  const assignedDriver = activeRide?.driverId
    ? drivers.find(d => d.id === activeRide.driverId)
    : null;

  // Push rider location to backend for driver sync
  useEffect(() => {
    if (!activeRide || !activeRide.gpsLat || !activeRide.gpsLng) return;
    // Push rider's pickup location as their position
    onPushRiderLocation(activeRide.id, activeRide.gpsLat, activeRide.gpsLng);
  }, [activeRide?.id, activeRide?.gpsLat]);

  // Sync scroll on chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Check for overspeed or harsh brake dynamically in state
  useEffect(() => {
    if (activeRide) {
      const logs: string[] = [];
      if (activeRide.overspeedEvents > 0) {
        logs.push(`⚠️ Overspeed threshold matched! Dynamic refund discount of -₹${(activeRide.overspeedEvents * 15).toFixed(2)} applied.`);
      }
      if (activeRide.harshBrakeEvents > 0) {
        logs.push(`⚠️ Harsh braking detected! Dynamic refund discount of -₹${(activeRide.harshBrakeEvents * 10).toFixed(2)} applied.`);
      }
      setSafetyLog(logs);

      // Trigger safety prompt on new anomalies
      if (activeRide.speed > 80 && !showSafetyConfirm) {
        setShowSafetyConfirm(true);
      }
    }
  }, [activeRide?.overspeedEvents, activeRide?.harshBrakeEvents]);

  // Tiny custom regex Markdown parse helper (robust, inline)
  const parseMarkdown = (text: string) => {
    const rawLines = text.split('\n');
    return rawLines.map((line, idx) => {
      let content = line;
      
      // Parse Bold
      content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Parse Headings
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="font-bold text-theme-text-primary text-sm mt-3 mb-1">{content.slice(4)}</h4>;
      }
      if (line.startsWith('- ')) {
        return <li key={idx} className="list-disc ml-4 mt-1 text-theme-text-secondary font-medium pl-1 text-[11px]">{content.slice(2)}</li>;
      }
      
      return <p key={idx} className="leading-relaxed mt-1 text-theme-text-secondary text-[11px] font-medium" dangerouslySetInnerHTML={{ __html: content }} />;
    });
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', parts: [{ text: userMessage }] }]);
    setIsSendingChat(true);

    try {
      const response = await fetch('/api/gemini/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage,
          history: chatMessages
        })
      });
      const data = await response.json();
      
      setChatMessages((prev) => [
        ...prev, 
        { role: 'model', parts: [{ text: data.answer || "I'm having some trouble parsing that. Please try again." }] }
      ]);
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev, 
        { role: 'model', parts: [{ text: "Error connecting to AI Assistant. Please check server configuration." }] }
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRide || !complaintText.trim()) return;

    try {
      await onFileDispute(activeRide.id, complaintText);
      setDisputeFiled(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Trajectory percentages
  const bikeXPct = activeRide ? 10 + activeRide.progress * 0.8 : 10;
  const bikeYPct = activeRide ? 70 - Math.sin((activeRide.progress / 100) * Math.PI) * 45 : 70;

  return (
    <div className="space-y-6">
      
      {!activeRide ? (
        <div className="bg-theme-card border border-theme-border rounded-2xl py-16 px-6 text-center max-w-xl mx-auto flex flex-col items-center shadow-xs">
          <Navigation className="w-12 h-12 text-slate-300 mb-3 animate-bounce" />
          <h3 className="text-lg font-bold text-theme-text-primary">No Active Ride in Progress</h3>
          <p className="text-xs text-theme-text-secondary max-w-[340px] mt-1 mb-5">You are not currently monitoring any ride. Create a booking on the Book tab and turn on driver console acceptance.</p>
          <button 
            onClick={() => onRefresh()}
            className="px-5 py-2.5 bg-brand-emerald hover:bg-brand-emerald-dark font-semibold text-white rounded-xl text-xs shadow-sm transition"
          >
            Check Active Jobs
          </button>
        </div>
      ) : activeRide.status === 'cancelled' ? (
        <div className="bg-theme-card border border-theme-border rounded-2xl py-16 px-6 text-center max-w-xl mx-auto flex flex-col items-center shadow-xs">
          <ShieldAlert className="w-12 h-12 text-rose-500 mb-3 animate-bounce" />
          <h3 className="text-lg font-bold text-theme-text-primary">Ride Cancelled</h3>
          <p className="text-xs text-theme-text-secondary max-w-[340px] mt-1 mb-5">This ride was cancelled. Please book a new ride to proceed.</p>
          <button 
            onClick={() => {
              localStorage.setItem(`zipride_dismissed_passenger_ride_${activeRide.id}`, 'true');
              onRefresh();
              window.history.pushState(null, '', '/booking');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="px-5 py-2.5 bg-brand-emerald hover:bg-brand-emerald-dark font-semibold text-white rounded-xl text-xs shadow-sm transition cursor-pointer border-0"
          >
            Book New Ride
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* MAP VISUALIZATION & SPEED FEED (LG Col 8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Real-time OpenStreetMap Leaflet Map */}
            <div className="relative bg-slate-950 border border-slate-900 rounded-2xl h-[340px] overflow-hidden flex items-center justify-center z-0">
              <LiveJourneyMap
                apiKey=""
                hasValidKey={false}
                pickupName={activeRide.pickup}
                dropName={activeRide.drop}
                pickupCoords={activeRide.routePath && activeRide.routePath.length > 0 ? activeRide.routePath[0] : { lat: activeRide.riderLat || activeRide.gpsLat || 13.0827, lng: activeRide.riderLng || activeRide.gpsLng || 80.2707 }}
                dropCoords={activeRide.routePath && activeRide.routePath.length > 0 ? activeRide.routePath[activeRide.routePath.length - 1] : { lat: activeRide.gpsLat || 13.0827, lng: activeRide.gpsLng || 80.2707 }}
                distanceKm={activeRide.distanceKm}
                isTrackingMode={true}
                rideProgressPct={activeRide.progress}
                rideSpeedKmH={activeRide.speed}
                rideStatus={activeRide.status}
                routePathOverride={activeRide.routePath}
              />

              {activeRide && ['booked', 'accepted', 'in_progress', 'assigned', 'pickup', 'en_route', 'arrived', 'anomaly', 'completed'].includes(activeRide.status) && (
                <SosButton rideId={activeRide.id} onClick={onRefresh} />
              )}
            </div>

            {/* Assigned Driver Details Card */}
            {activeRide.driverId && (
              <div className="bg-theme-card border border-theme-border/80 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase text-theme-text-secondary font-bold">ASSIGNED DRIVER</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">LIVE</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-brand-emerald shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1.5">
                    <div>
                      <span className="text-[10px] text-theme-text-secondary font-mono uppercase block">Name</span>
                      <span className="text-sm font-bold text-theme-text-primary">{assignedDriver?.name || activeRide.driverName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-theme-text-secondary font-mono uppercase block">Vehicle</span>
                      <span className="text-sm font-bold text-theme-text-primary">{assignedDriver?.vehicle || activeRide.driverVehicle || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-theme-text-secondary font-mono uppercase block">Rating</span>
                      <span className="text-sm font-bold text-theme-text-primary">{assignedDriver?.rating || activeRide.driverRating || '—'}★</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-theme-text-secondary font-mono uppercase block">Phone</span>
                      <span className="text-sm font-bold text-theme-text-primary">{assignedDriver?.phone || activeRide.driverPhone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-theme-text-secondary font-mono uppercase block">Type</span>
                      <span className="text-sm font-bold text-theme-text-primary">{assignedDriver?.vehicleType || activeRide.driverVehicleType || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-theme-text-secondary font-mono uppercase block">Driver ID</span>
                      <span className="text-sm font-mono font-bold text-theme-text-primary">{activeRide.driverId}</span>
                    </div>
                  </div>
                </div>
                {activeRide.driverLat && activeRide.driverLng && (
                  <div className="mt-3 pt-3 border-t border-theme-border flex items-center gap-2 text-[10px] font-mono text-theme-text-secondary">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>Driver GPS: {activeRide.driverLat.toFixed(4)}, {activeRide.driverLng.toFixed(4)}</span>
                    <span className="text-slate-300">|</span>
                    <span>ETA: {activeRide.driverLat && activeRide.gpsLat ? ((Math.abs(activeRide.driverLat - activeRide.gpsLat) + Math.abs((activeRide.driverLng || 0) - activeRide.gpsLng)) * 111 * 2.1).toFixed(1) : '—'} min</span>
                  </div>
                )}
              </div>
            )}

            {/* Live Telemetry warning overlays */}
            {safetyLog.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600 block">⚠️ SAFETY TELEMETRY THRESHOLD ALERTS:</span>
                <div className="space-y-1">
                  {safetyLog.map((log, idx) => (
                    <div key={idx} className="text-xs font-semibold text-rose-700 leading-normal">{log}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Mid-Trip System Fare Adjustment Approval Override */}
            {activeRide.adjustmentStatus === 'pending' && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200">
                    <span className="text-amber-600 text-lg">🚦</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-amber-900 flex items-center gap-2">
                      Fare Adjustment Detected
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-mono">System Triggered</span>
                    </h4>
                    
                    <p className="text-sm font-medium text-amber-800 mt-1">
                      Reason: <span className="font-bold">
                        {activeRide.adjustmentTrigger === 'weather' ? 'Weather escalated to heavy rain mid-trip' :
                         activeRide.adjustmentTrigger === 'diversion' ? 'Mandatory route diversion detected by GPS' :
                         activeRide.adjustmentTrigger === 'rider_stop' ? 'Additional stop requested by rider' :
                         activeRide.adjustmentTrigger === 'traffic' ? 'Severe traffic delay beyond estimated time' :
                         activeRide.adjustmentTrigger === 'force_majeure' ? 'Road closure confirmed — alternate route taken' : 
                         'Live trip conditions updated'}
                      </span>
                    </p>

                    <div className="mt-4 p-3 bg-theme-card/60 border border-amber-200/60 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-amber-800/80 font-medium">Original locked fare:</span>
                        <span className="font-mono text-theme-text-secondary line-through">₹{activeRide.finalFare}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-amber-800/80 font-medium">Adjustment:</span>
                        <span className="font-mono text-amber-600 font-bold">+₹{activeRide.adjustmentAmount}</span>
                      </div>
                      <div className="border-t border-amber-200/60 pt-2 flex justify-between items-center">
                        <span className="text-amber-900 font-bold">New Total:</span>
                        <span className="font-mono text-amber-900 font-black text-lg">₹{(activeRide.finalFare + (activeRide.adjustmentAmount || 0)).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/rides/${activeRide.id}/adjustment/respond`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'accept' })
                        });
                        if (res.ok) onRefresh();
                      } catch (e) { console.error(e) }
                    }}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition active:scale-95 text-sm flex items-center justify-center gap-2"
                  >
                    ✓ Accept Adjustment
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/rides/${activeRide.id}/adjustment/respond`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'dispute' })
                        });
                        if (res.ok) onRefresh();
                      } catch (e) { console.error(e) }
                    }}
                    className="flex-shrink-0 bg-theme-card border border-amber-300 hover:bg-amber-100 text-amber-800 font-bold py-3 px-5 rounded-xl shadow-sm transition active:scale-95 text-sm"
                  >
                    ✗ Dispute
                  </button>
                </div>
              </div>
            )}

            {activeRide.adjustmentStatus === 'disputed' && (
              <div className="bg-theme-bg border border-theme-border rounded-2xl p-4 shadow-sm flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-theme-text-primary text-sm">Fare Adjustment Disputed</h4>
                  <p className="text-xs text-theme-text-secondary mt-1">You disputed the +₹{activeRide.adjustmentAmount} charge. Original locked fare of <span className="font-mono font-bold">₹{activeRide.finalFare}</span> applies pending operations review. Decision within 2 hours.</p>
                </div>
              </div>
            )}

            {/* Ride Status Variables Summary Panel */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              
              {/* Dynamic Cost */}
              <div className="bg-theme-card border border-theme-border/80 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-mono uppercase text-theme-text-secondary font-bold block">DYNAMIC LOCKED FARE</span>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <h3 className="text-2xl font-black font-mono text-theme-text-primary tracking-tight">₹{activeRide.finalFare}</h3>
                  {activeRide.behaviorDiscount > 0 && (
                    <span className="text-[10px] text-emerald-500 font-bold font-mono">(-₹{activeRide.behaviorDiscount})</span>
                  )}
                </div>
              </div>

              {/* Safety Rating */}
              <div className="bg-theme-card border border-theme-border/80 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-mono uppercase text-theme-text-secondary font-bold block">SAFETY INDEX SCORE</span>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <h3 className={`text-2xl font-black font-mono tracking-tight ${activeRide.safetyScore < 80 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {activeRide.safetyScore}%
                  </h3>
                  {activeRide.safetyScore < 100 ? (
                    <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                </div>
              </div>

              {/* Distance Info */}
              <div className="bg-theme-card border border-theme-border/80 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-mono uppercase text-theme-text-secondary font-bold block">REMAINING DISTANCE</span>
                <h3 className="text-2xl font-black font-mono text-theme-text-primary tracking-tight mt-1.5">
                  {(activeRide.distanceKm * (1 - activeRide.progress / 100)).toFixed(2)} km
                </h3>
              </div>

              {/* ETA Mins */}
              <div className="bg-theme-card border border-theme-border/80 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-mono uppercase text-theme-text-secondary font-bold block">REMAINING TIME ETA</span>
                <h3 className="text-2xl font-black font-mono text-theme-text-primary tracking-tight mt-1.5">
                  {(activeRide.durationMin * (1 - activeRide.progress / 100)).toFixed(1)} mins
                </h3>
              </div>

            </div>

            {/* Unsafe Rider safety confirmation panel overlay */}
            {showSafetyConfirm && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-yellow-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-yellow-800 text-sm">We Detected Unsafe Driving Sells!</h4>
                    <p className="text-xs text-yellow-700 leading-relaxed mt-0.5">Your pilot exceeded dynamic monsoon parameters or deceleration limits. Safety teams require physical status confirmation immediately.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSafetyConfirm(false);
                      setSafetyLog(prev => [...prev, "Rider physically declared 'I feel safe' via active overlay."]);
                    }}
                    className="flex-1 bg-brand-emerald text-white hover:bg-brand-emerald-dark font-bold text-xs py-2.5 rounded-xl transition shadow"
                  >
                    I Feel Safe & Secure
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSafetyConfirm(false);
                      setComplaintText("Triggered active emergency overlay: driver is steering aggressively and ignored limit calls.");
                    }}
                    className="flex-1 bg-rose-500 text-white hover:bg-rose-600 font-bold text-xs py-2.5 rounded-xl transition shadow"
                  >
                    Escalate to Operations
                  </button>
                </div>
              </div>
            )}

            {/* PAYMENT PANEL — Always visible during active ride */}
            {(() => {
              console.log('[RideTracker] Rendering payment panel. status:', activeRide.status, '| paymentStatus:', activeRide.paymentStatus);
              return null;
            })()}
            <div className="space-y-6">

              {/* PAYMENT PANEL — Always visible during active ride */}
              {(rideState === 'payment_success' || activeRide.paymentStatus === 'paid') ? (
                /* Transaction Success Receipt Screen */
                <div className="bg-theme-card border-2 border-brand-emerald rounded-2xl p-6 shadow-lg space-y-5">
                  <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-555/15 border-4 border-brand-emerald/30 text-brand-emerald flex items-center justify-center mb-3 animate-bounce">
                      <span className="text-2xl font-bold">✓</span>
                    </div>
                    <h4 className="text-lg font-black text-theme-text-primary">Payment Successful</h4>
                    <p className="text-xs text-theme-text-secondary mt-1">Thank you for riding with ZipRide!</p>
                  </div>

                  <div className="bg-theme-bg/50 border border-theme-border rounded-2xl p-4 space-y-3.5 text-xs font-semibold">
                    <div className="flex justify-between items-center">
                      <span className="text-theme-text-secondary">Transaction Reference:</span>
                      <span className="font-mono text-theme-text-primary text-right select-all">{activeRide.paymentReference || 'TXN-MOCK-994103'}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-theme-border/40 pt-2.5">
                      <span className="text-theme-text-secondary">Ride ID:</span>
                      <span className="font-mono text-theme-text-primary text-right">{activeRide.id}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-theme-border/40 pt-2.5">
                      <span className="text-theme-text-secondary">Amount Paid:</span>
                      <span className="font-mono text-indigo-500 font-black text-sm text-right">₹{activeRide.finalFare.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-theme-border/40 pt-2.5">
                      <span className="text-theme-text-secondary">Date & Time:</span>
                      <span className="text-theme-text-primary text-right">{activeRide.paidAt ? new Date(activeRide.paidAt).toLocaleString() : new Date().toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem(`zipride_dismissed_passenger_ride_${activeRide.id}`, 'true');
                      onRefresh();
                      window.history.pushState(null, '', '/booking');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }}
                    className="w-full bg-[#00C896] hover:bg-[#00b384] text-white py-3.5 rounded-xl font-bold transition shadow-sm text-xs mt-4 flex items-center justify-center gap-1.5 cursor-pointer border-0"
                  >
                    Close & Book New Ride
                  </button>
                </div>
              ) : (
                /* QR Payment Panel (Enhanced UPI Portal) - Always visible during active rides */
                <div className={`bg-theme-card border-2 border-brand-emerald rounded-2xl p-6 shadow-lg space-y-5 animate-in zoom-in-95 duration-200 ${activeRide.status !== 'completed' ? 'opacity-85' : ''}`}>
                  {activeRide.status !== 'completed' && (
                    <div className="p-3 bg-amber-50/90 dark:bg-amber-955/20 border border-amber-250 dark:border-amber-900/30 text-[11px] text-amber-700 dark:text-amber-400 rounded-xl font-bold leading-relaxed">
                      ⚠️ Ride not completed yet. Payment will be processed after trip completion.
                    </div>
                  )}
                  <div className="flex items-center justify-between border-b border-theme-border pb-3">
                    <div>
                      <h3 className="text-base font-black text-theme-text-primary tracking-tight">PAY FOR YOUR RIDE</h3>
                      <p className="text-[10px] text-theme-text-secondary mt-0.5 font-mono">Simulated Secure Gateway Panel</p>
                    </div>
                  </div>

                  {/* Processing Loader Screen */}
                  {activeRide.paymentStatus === 'processing' || isPaying ? (
                    <div className="flex flex-col items-center text-center py-8 space-y-4 animate-in fade-in duration-300">
                      <div className="w-12 h-12 border-4 border-brand-emerald border-t-transparent rounded-full animate-spin"></div>
                      <div>
                        <h4 className="text-sm font-bold text-theme-text-primary">Verifying Settle Request</h4>
                        <p className="text-xs text-theme-text-secondary mt-1">Processing via {selectedApp}. Please approve the payment popup inside your selected app.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Ride Meta Info */}
                      <div className="grid grid-cols-2 gap-3 text-xs bg-theme-bg/50 border border-theme-border rounded-xl p-3">
                        <div>
                          <span className="text-[9px] text-theme-text-secondary font-mono uppercase block">Ride ID</span>
                          <span className="text-theme-text-primary font-mono font-bold">{activeRide.id}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-theme-text-secondary font-mono uppercase block">Driver Name</span>
                          <span className="text-theme-text-primary font-bold">{activeRide.driverName || 'ZipRide Partner'}</span>
                        </div>
                        <div className="col-span-2 border-t border-theme-border/50 pt-1.5 mt-1">
                          <span className="text-[9px] text-theme-text-secondary font-mono uppercase block">Pickup</span>
                          <span className="text-theme-text-primary font-semibold truncate block" title={activeRide.pickup}>{activeRide.pickup}</span>
                        </div>
                        <div className="col-span-2 border-t border-theme-border/50 pt-1.5">
                          <span className="text-[9px] text-theme-text-secondary font-mono uppercase block">Destination</span>
                          <span className="text-theme-text-primary font-semibold truncate block" title={activeRide.drop}>{activeRide.drop}</span>
                        </div>
                        <div className="col-span-2 border-t border-theme-border/50 pt-1.5 flex justify-between items-center">
                          <span className="text-[10px] text-theme-text-primary font-bold uppercase">Total Fare</span>
                          <span className="text-indigo-500 text-base font-black font-mono">₹{activeRide.finalFare.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Dynamic Clickable QR Code */}
                      <div 
                        onClick={() => {
                          if (activeRide.status === 'completed') {
                            setPaymentInfoMessage("Scan QR Code to open standard UPI app selector. Or select an option below for deep linking.");
                          }
                        }}
                        className={`flex flex-col items-center bg-white dark:bg-slate-900 border border-theme-border rounded-2xl p-4 shadow-xs transition relative group ${activeRide.status !== 'completed' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-55/50 dark:hover:bg-slate-800/50'}`}
                        title={activeRide.status === 'completed' ? "Click for options" : "Ride not completed"}
                      >
                        <div className="flex items-center justify-between w-full mb-3 text-[9px] font-mono text-slate-500 uppercase">
                          <span>UPI SCANNER DETAILS</span>
                          <span className="text-brand-emerald font-bold font-mono">{activeRide.status === 'completed' ? 'CLICK QR TO INFO' : 'LOCKED'}</span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs relative">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                              `upi://pay?pa=${merchantUpiId}&pn=ZipRide&am=${activeRide.finalFare.toFixed(2)}&cu=INR&tn=Ride-${activeRide.id}`
                            )}`}
                            alt="UPI Payment QR Code"
                            className="w-36 h-36 object-contain"
                          />
                          {activeRide.status !== 'completed' && (
                            <div className="absolute inset-0 bg-slate-950/80 rounded-xl flex flex-col items-center justify-center p-2 text-center text-white">
                              <Lock className="w-6 h-6 text-amber-500 mb-1 animate-bounce" />
                              <span className="text-[8px] font-bold uppercase tracking-wider">Locked Until Completed</span>
                            </div>
                          )}
                        </div>

                        {paymentInfoMessage && (
                          <div className="w-full mt-2 bg-indigo-550/10 text-indigo-650 p-2 rounded-lg text-[10px] text-center font-bold animate-pulse">
                            {paymentInfoMessage}
                          </div>
                        )}

                        <div className="w-full mt-3 space-y-1.5 text-[10px] border-t border-slate-105 dark:border-slate-800 pt-2 text-slate-650 dark:text-slate-350">
                          <div className="flex justify-between">
                            <span>Merchant ID:</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{merchantUpiId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Reference:</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{activeRide.id}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-center text-[10px] font-mono font-bold text-theme-text-secondary uppercase">
                        — OR —
                      </div>

                      {/* Choose UPI App grid */}
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-theme-text-secondary mb-2.5">Choose Payment App</label>
                        <div className="grid grid-cols-2 gap-2 text-xs font-bold text-theme-text-primary">
                          <button
                            type="button"
                            onClick={() => handleLaunchAppAndPay('GooglePay')}
                            disabled={activeRide.status !== 'completed'}
                            className="flex items-center gap-2 p-2.5 border border-theme-border bg-theme-bg hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                            <span>Google Pay</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLaunchAppAndPay('PhonePe')}
                            disabled={activeRide.status !== 'completed'}
                            className="flex items-center gap-2 p-2.5 border border-theme-border bg-theme-bg hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-550 shrink-0" />
                            <span>PhonePe</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLaunchAppAndPay('Paytm')}
                            disabled={activeRide.status !== 'completed'}
                            className="flex items-center gap-2 p-2.5 border border-theme-border bg-theme-bg hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
                            <span>Paytm</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLaunchAppAndPay('BHIM')}
                            disabled={activeRide.status !== 'completed'}
                            className="flex items-center gap-2 p-2.5 border border-theme-border bg-theme-bg hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                            <span>BHIM UPI</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLaunchAppAndPay('AmazonPay')}
                            disabled={activeRide.status !== 'completed'}
                            className="flex items-center gap-2 p-2.5 border border-theme-border bg-theme-bg hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                            <span>Amazon Pay</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLaunchAppAndPay('Cash')}
                            disabled={activeRide.status !== 'completed'}
                            className="flex items-center gap-2 p-2.5 border border-theme-border bg-theme-bg hover:bg-emerald-50 dark:hover:bg-emerald-955/20 text-emerald-600 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>Cash Settle</span>
                          </button>
                        </div>
                      </div>

                      {/* Future Ready Gateways */}
                      <div className="border-t border-theme-border/60 pt-3">
                        <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-theme-text-secondary mb-2">Future Ready Gateways</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleLaunchAppAndPay('Razorpay')}
                            disabled={activeRide.status !== 'completed'}
                            className="flex-1 text-[10px] font-bold py-2 border border-dashed border-theme-border bg-theme-bg/30 text-theme-text-secondary opacity-60 rounded-lg cursor-not-allowed hover:opacity-80 transition disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            Razorpay (Sim)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLaunchAppAndPay('Stripe')}
                            disabled={activeRide.status !== 'completed'}
                            className="flex-1 text-[10px] font-bold py-2 border border-dashed border-theme-border bg-theme-bg/30 text-theme-text-secondary opacity-60 rounded-lg cursor-not-allowed hover:opacity-80 transition disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            Stripe (Sim)
                          </button>
                        </div>
                      </div>

                      {/* Configurable UPI Merchant Selector */}
                      <div className="flex items-center justify-between text-[11px] border-t border-theme-border pt-3">
                        <span className="font-bold text-theme-text-secondary">Merchant Account:</span>
                        <select
                          value={merchantUpiId}
                          onChange={(e) => setMerchantUpiId(e.target.value)}
                          disabled={activeRide.status !== 'completed'}
                          className="bg-theme-bg border border-theme-border rounded-lg px-2 py-1 text-xs font-mono font-bold text-theme-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="zipride@upi">zipride@upi</option>
                          <option value="projectdemo@paytm">projectdemo@paytm</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Rating & Dispute form remains available only when ride is completed */}
              {activeRide.status === 'completed' && (
                <div className="bg-theme-card border border-theme-border rounded-2xl p-6 shadow-xs space-y-4">
                  {/* Stars Rating selection */}
                  <div className="border-b border-theme-border pb-4">
                    <span className="text-xs font-bold text-theme-text-primary block">Rate Your Commute</span>
                    <p className="text-[11px] text-theme-text-secondary mt-0.5">Let us know how your driver performed.</p>
                    
                    {activeRide.rating ? (
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-amber-550 text-sm">★</span>
                        <span className="text-xs font-bold text-theme-text-primary">You rated this trip {activeRide.rating} stars</span>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRatingSelect(star)}
                            className="text-lg text-theme-text-secondary hover:text-amber-500 cursor-pointer transition-colors"
                            id={`rate-star-${star}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 border-b border-theme-border pb-3">
                    <ShieldAlert className="w-5 h-5 text-brand-emerald" />
                    <h4 className="font-bold text-theme-text-primary text-sm">File Dynamic Safe Shield Report</h4>
                  </div>
                  
                  {disputeFiled ? (
                    <div className="p-4 bg-emerald-55 text-theme-text-primary border border-emerald-100 rounded-xl space-y-1">
                      <span className="font-bold text-emerald-800 text-xs text-center block">Dispute Filed Successfully!</span>
                      <p className="text-[11px] text-theme-text-secondary text-center">Your operations analyst summary has booted. Head to the Disputes tab to watch Gemini analytical decision trees.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleComplaint} className="space-y-4">
                      <p className="text-xs text-theme-text-secondary">Provide an operational note about any transit overspeeding risks, harsh driving, or surcharges to initiate fully automated dispute adjudication.</p>
                      <textarea
                        value={complaintText}
                        onChange={(e) => setComplaintText(e.target.value)}
                        placeholder="Comment on overspeeding/harsh braking or fare billing issues..."
                        rows={3}
                        className="w-full bg-theme-bg border border-theme-border p-3 text-xs font-semibold text-theme-text-primary rounded-xl outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/10 transition"
                      />
                      <button
                        type="submit"
                        disabled={!complaintText.trim()}
                        className="bg-slate-900 text-white hover:bg-black disabled:bg-slate-200 disabled:text-theme-text-secondary text-xs font-bold py-2.5 px-5 rounded-xl cursor-pointer disabled:cursor-not-allowed transition"
                      >
                        File Analysis Dispute
                      </button>
                    </form>
                  )}
                </div>
              )}

            </div>
            {/* END PAYMENT PANEL */}

          </div>

          {/* AI HELPFUL AGENT CHAT BOT ASSISTANT (LG Col 4) */}
          <div className="lg:col-span-4 bg-theme-card border border-theme-border rounded-2xl h-[560px] flex flex-col justify-between overflow-hidden shadow-xs">
            
            {/* Chat header */}
            <div className="p-4 border-b border-theme-border bg-theme-bg/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-emerald/15 flex items-center justify-center text-brand-emerald shrink-0">
                  <MessageSquare className="w-4 h-4 shrink-0" />
                </div>
                <div>
                  <span className="text-xs font-bold text-theme-text-primary block">ZipRide AI Copilot</span>
                  <span className="text-[9px] font-mono text-theme-text-secondary block font-bold leading-none uppercase">Grounded policy support</span>
                </div>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </div>

            {/* Chat message body feeds */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4.5 bg-theme-bg/30">
              {chatMessages.map((msg, index) => {
                const isModel = msg.role === 'model';
                return (
                  <div key={index} className={`flex ${isModel ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 border shadow-xs ${
                      isModel 
                        ? 'bg-theme-card border-theme-border text-theme-text-primary' 
                        : 'bg-slate-900 border-slate-900 text-white'
                    }`}>
                      {isModel ? (
                        <div className="space-y-1.5">
                          {parseMarkdown(msg.parts[0].text)}
                        </div>
                      ) : (
                        <p className="text-xs leading-relaxed font-semibold">{msg.parts[0].text}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {isSendingChat && (
                <div className="flex justify-start">
                  <div className="bg-theme-card border border-theme-border rounded-2xl p-4 flex items-center gap-2 text-theme-text-secondary">
                    <span className="w-2 h-2 rounded-full bg-brand-emerald animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-brand-emerald animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-brand-emerald animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Message input triggers */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-theme-border bg-theme-card flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about weather fee or safety refunds..."
                className="flex-1 bg-theme-bg border border-theme-border rounded-xl px-4 text-xs font-semibold text-theme-text-primary outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/10 transition"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isSendingChat}
                className="w-10 h-10 rounded-xl bg-brand-emerald hover:bg-brand-emerald-dark text-white flex items-center justify-center shrink-0 transition shadow disabled:opacity-50"
              >
                <Send className="w-4 h-4 shrink-0" />
              </button>
            </form>
          </div>

        </div>
      )}

      {/* PAYMENT MODAL OVERLAY */}
      {(rideState === 'payment_pending' || rideState === 'payment_processing') && (activeRide || completedRide) && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-theme-card border-2 border-brand-emerald rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <div>
                <h3 className="text-base font-black text-theme-text-primary tracking-tight">PAY FOR YOUR RIDE</h3>
                <p className="text-[10px] text-theme-text-secondary mt-0.5 font-mono">Simulated Secure Gateway Panel</p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  console.log("Payment Failed");
                  if (onPayRide && (activeRide || completedRide)) {
                    onPayRide((activeRide || completedRide)!.id, undefined, selectedApp, 'failed');
                  }
                  transitionTo('closed');
                  // redirect to booking
                  localStorage.setItem(`zipride_dismissed_passenger_ride_${(activeRide || completedRide)!.id}`, 'true');
                  onRefresh();
                  window.history.pushState(null, '', '/booking');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-theme-text-secondary hover:text-theme-text-primary text-xs font-bold border-0 bg-transparent cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Processing Loader Screen or Timeout Screen */}
            {rideState === 'payment_processing' ? (
              paymentTimeoutActive ? (
                <div className="flex flex-col items-center text-center py-6 space-y-4 animate-in fade-in duration-300">
                  <ShieldAlert className="w-12 h-12 text-rose-500 animate-bounce" />
                  <div>
                    <h4 className="text-sm font-bold text-theme-text-primary">Payment verification timed out.</h4>
                    <p className="text-xs text-theme-text-secondary mt-1">We couldn't verify your transaction status. Please retry or cancel.</p>
                  </div>
                  <div className="flex gap-3 w-full pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        console.log("Payment Open");
                        handleLaunchAppAndPay(selectedApp);
                      }}
                      className="flex-1 bg-brand-emerald hover:bg-brand-emerald-dark text-slate-950 py-3 rounded-xl text-xs font-bold transition cursor-pointer border-0"
                    >
                      Retry Payment
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        console.log("Payment Failed");
                        if (onPayRide && (activeRide || completedRide)) {
                          await onPayRide((activeRide || completedRide)!.id, undefined, selectedApp, 'failed');
                        }
                        transitionTo('payment_pending');
                      }}
                      className="flex-1 bg-theme-bg border border-theme-border hover:bg-theme-hover-bg text-theme-text-secondary py-3 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center py-8 space-y-4 animate-in fade-in duration-300">
                  <div className="w-12 h-12 border-4 border-brand-emerald border-t-transparent rounded-full animate-spin"></div>
                  <div>
                    <h4 className="text-sm font-bold text-theme-text-primary">Verifying Settle Request</h4>
                    <p className="text-xs text-theme-text-secondary mt-1">Processing via {selectedApp}. Please approve the payment popup inside your selected app.</p>
                  </div>
                </div>
              )
            ) : (
              <>
                {/* Ride Meta Info */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-theme-bg/50 border border-theme-border rounded-xl p-3 font-semibold">
                  <div>
                    <span className="text-[9px] text-theme-text-secondary font-mono uppercase block">Ride ID</span>
                    <span className="text-theme-text-primary font-mono font-bold">{(activeRide || completedRide)?.id}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-theme-text-secondary font-mono uppercase block">Driver Name</span>
                    <span className="text-theme-text-primary font-bold">{(activeRide || completedRide)?.driverName || 'ZipRide Partner'}</span>
                  </div>
                  <div className="col-span-2 border-t border-theme-border/50 pt-1.5 flex justify-between items-center">
                    <span className="text-[10px] text-theme-text-primary font-bold uppercase">Total Fare</span>
                    <span className="text-indigo-500 text-base font-black font-mono">₹{(activeRide || completedRide)?.finalFare.toFixed(2)}</span>
                  </div>
                </div>

                {/* Dynamic Clickable QR Code */}
                <div className="flex flex-col items-center bg-white dark:bg-slate-900 border border-theme-border rounded-2xl p-4 shadow-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        `upi://pay?pa=${merchantUpiId}&pn=ZipRide&am=${(activeRide || completedRide)?.finalFare.toFixed(2)}&cu=INR&tn=Ride-${(activeRide || completedRide)?.id}`
                      )}`}
                      alt="UPI Payment QR Code"
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                </div>

                <div className="text-center text-[10px] font-mono font-bold text-theme-text-secondary uppercase">
                  — OR —
                </div>

                {/* Choose UPI App grid */}
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-theme-text-secondary mb-2">Choose Payment App</label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-theme-text-primary">
                    {['GooglePay', 'PhonePe', 'Paytm', 'Cash'].map((app) => (
                      <button
                        key={app}
                        type="button"
                        onClick={() => handleLaunchAppAndPay(app as any)}
                        className="flex items-center gap-2 p-2.5 border border-theme-border bg-theme-bg hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-xl transition cursor-pointer"
                      >
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          app === 'GooglePay' ? 'bg-blue-500' :
                          app === 'PhonePe' ? 'bg-purple-550' :
                          app === 'Paytm' ? 'bg-sky-550 font-bold shrink-0 text-sky-500' : 'bg-emerald-550 font-bold shrink-0 text-emerald-500'
                        }`} />
                        <span>{app === 'GooglePay' ? 'Google Pay' : app === 'PhonePe' ? 'PhonePe' : app === 'Paytm' ? 'Paytm' : 'Cash (Settle)'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* RATING MODAL OVERLAY */}
      {rideState === 'rating' && (activeRide || completedRide) && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-theme-card border border-theme-border rounded-3xl p-8 shadow-2xl max-w-sm w-full space-y-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-brand-emerald/10 border border-brand-emerald/20 flex items-center justify-center mx-auto text-[#00C896] animate-pulse">
              <Check className="w-8 h-8" strokeWidth={3} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-theme-text-primary leading-tight">Ride Completed Successfully 🎉</h3>
              <p className="text-xs text-theme-text-secondary leading-relaxed">
                Thank you for riding with ZipRide 🚕<br />
                Your feedback helps us deliver safer and better journeys every day.
              </p>
            </div>

            <div className="bg-theme-bg/50 border border-theme-border/60 rounded-2xl p-4 space-y-3">
              <span className="text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider font-mono">How was your ride today?</span>
              <div className="flex justify-center gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    onClick={() => handleRatingSelect(star)}
                    whileHover={{ scale: 1.25, rotate: 15 }}
                    whileTap={{ scale: 0.9 }}
                    className="text-3xl text-slate-400 hover:text-amber-400 cursor-pointer transition-colors border-0 bg-transparent"
                    id={`modal-rate-star-${star}`}
                  >
                    ★
                  </motion.button>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-theme-text-secondary font-medium">Your feedback is instantly synced to improve driver reputation scores.</p>
          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, CloudRain, Sun, Cloud, Shield, Fuel, Navigation, AlertTriangle, 
  AlertCircle, Accessibility, Activity, PhoneCall, ChevronDown, ChevronUp, 
  MessageSquare, X, Send, Trash2, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: Date;
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
  const [isOpen, setIsOpen] = useState(true);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const greeting = `Hello! I am your RideMate Companion. 🚗 I have live access to your safety telemetry, route options, weather conditions, and driver details. Ask me anything!`;
    return [{ id: 'init', sender: 'ai', text: greeting, timestamp: new Date() }];
  });

  const prevTrafficRef = useRef<string | null>(null);
  const prevWeatherRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages, isThinking]);

  // Voice output for visual impairment accessibility
  const speakIfVisuallyImpaired = (text: string) => {
    try {
      const profile = ZipRideRepository.getProfile();
      if (profile.accessibilityRequirements?.includes('Visually Impaired') && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[*#_`~]/g, '');
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(cleanText));
      }
    } catch (e) {
      console.warn('Speech synthesis failed:', e);
    }
  };

  // Proactive Alerts Detector
  useEffect(() => {
    if (!trafficLevel || !weatherCondition) return;

    // Traffic change warning trigger
    if (prevTrafficRef.current && prevTrafficRef.current !== trafficLevel) {
      const isHeavy = trafficLevel.toLowerCase().includes('heavy') || trafficLevel.toLowerCase().includes('severe') || trafficLevel.toLowerCase().includes('congestion') || trafficLevel.toLowerCase().includes('gridlock');
      const wasHeavy = prevTrafficRef.current.toLowerCase().includes('heavy') || prevTrafficRef.current.toLowerCase().includes('severe') || prevTrafficRef.current.toLowerCase().includes('congestion') || prevTrafficRef.current.toLowerCase().includes('gridlock');
      
      if (isHeavy && !wasHeavy) {
        const alertMsg = `⚠️ Traffic level has increased to ${trafficLevel} along the route. Dynamic surcharges might be active. Recommending switching to the Eco Route if available.`;
        setMessages(prev => [
          ...prev, 
          { id: `traffic-alert-${Date.now()}`, sender: 'system', text: alertMsg, timestamp: new Date() }
        ]);
        setSelectedCard('traffic');
        speakIfVisuallyImpaired(`Traffic level has increased to ${trafficLevel} along the route.`);
      }
    }

    // Weather change warning trigger
    if (prevWeatherRef.current && prevWeatherRef.current !== weatherCondition) {
      const isRainy = weatherCondition.toLowerCase().includes('rain') || weatherCondition.toLowerCase().includes('storm') || weatherCondition.toLowerCase().includes('drizzle') || weatherCondition.toLowerCase().includes('monsoon');
      const wasRainy = prevWeatherRef.current.toLowerCase().includes('rain') || prevWeatherRef.current.toLowerCase().includes('storm') || prevWeatherRef.current.toLowerCase().includes('drizzle') || prevWeatherRef.current.toLowerCase().includes('monsoon');
      
      if (isRainy && !wasRainy) {
        const alertMsg = `🌧️ Rain detected near your location. Road traction is reduced. Driver's speed cap has been lowered for safety. Suggesting Cab or Auto for shelter.`;
        setMessages(prev => [
          ...prev, 
          { id: `weather-alert-${Date.now()}`, sender: 'system', text: alertMsg, timestamp: new Date() }
        ]);
        setSelectedCard('weather');
        speakIfVisuallyImpaired(`Rain has started. Road traction is reduced.`);
      }
    }

    prevTrafficRef.current = trafficLevel;
    prevWeatherRef.current = weatherCondition;
  }, [trafficLevel, weatherCondition]);

  const wt = (weatherCondition || '').toLowerCase();
  const isRainy = wt.includes('rain') || wt.includes('storm') || wt.includes('drizzle') || wt.includes('monsoon');
  
  const tf = (trafficLevel || '').toLowerCase();
  const isHeavyTraffic = tf.includes('heavy') || tf.includes('severe') || tf.includes('congestion') || tf.includes('gridlock');
  const isModTraffic = tf.includes('moderate');

  const isChildSafety = localStorage.getItem('zipride_child_safety_active') === 'true';
  const isWomenSafety = localStorage.getItem('zipride_women_safety_active') === 'true';
  const isSafetyCaution = isChildSafety || isWomenSafety;

  const currentRoute = routes && routes.length > 0 ? routes[selectedRouteIndex] : null;
  const roadHealth = currentRoute ? currentRoute.roadHealthScore : 88;
  const isPoorRoad = roadHealth < 75;

  // Configuration for Smart AI Cards
  const cards = [
    {
      id: 'weather',
      title: 'Weather',
      icon: isRainy ? <CloudRain className="h-4.5 w-4.5 text-blue-400" /> : <Sun className="h-4.5 w-4.5 text-yellow-400" />,
      status: isRainy ? 'warning' : 'nominal',
      statusText: isRainy ? 'Storm Alert' : 'Nominal',
      color: isRainy ? 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10' : 'border-theme-border bg-theme-bg/60 hover:bg-theme-bg',
      description: isRainy ? 'Rain hazards active' : 'Ideal riding conditions',
      details: isRainy ? [
        "🌧️ Wet road conditions: traction decreased by 35%.",
        "🛡️ Driver speed automatically capped for maximum safety.",
        "☔ Suggest booking enclosed Cab/Auto for weather shelter."
      ] : [
        "☀️ Sky is clear, wind conditions are ideal.",
        "🏍️ Recommended vehicle: Bike (fastest commute)."
      ],
      actions: isRainy ? [
        { label: "Book Covered Auto", action: "switch_auto" },
        { label: "View Rain Forecast", action: "view_rain" }
      ] : []
    },
    {
      id: 'traffic',
      title: 'Traffic',
      icon: <Navigation className={`h-4.5 w-4.5 ${isHeavyTraffic ? 'text-rose-400' : isModTraffic ? 'text-amber-400' : 'text-emerald-400'}`} />,
      status: isHeavyTraffic ? 'warning' : isModTraffic ? 'caution' : 'nominal',
      statusText: isHeavyTraffic ? 'Heavy' : isModTraffic ? 'Moderate' : 'Nominal',
      color: isHeavyTraffic ? 'border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10' : isModTraffic ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10' : 'border-theme-border bg-theme-bg/60 hover:bg-theme-bg',
      description: isHeavyTraffic ? 'Gridlock on main routes' : 'Flowing smoothly',
      details: isHeavyTraffic ? [
        "🚦 Major bottlenecks on key flyovers and main street junctions.",
        "⏱️ Delay estimation: +12 to 18 minutes.",
        "🌱 Eco alternative route available (bypasses main corridors)."
      ] : [
        "🟢 Average speed: 42 km/h.",
        "⏱️ Nominal delay: 0-3 mins."
      ],
      actions: isHeavyTraffic ? [
        { label: "Switch to Eco Route", action: "switch_eco" }
      ] : []
    },
    {
      id: 'safety',
      title: 'Safety',
      icon: <Shield className={`h-4.5 w-4.5 ${isSafetyCaution ? 'text-emerald-400' : 'text-theme-text-secondary'}`} />,
      status: 'nominal',
      statusText: 'Armed',
      color: 'border-theme-border bg-theme-bg/60 hover:bg-theme-bg',
      description: 'GPS shield active',
      details: [
        `🔒 GPS Geofencing: Armed and monitoring route deviations.`,
        `🛡️ Women Safety: ${isWomenSafety ? 'ACTIVE (Guardian SMS sharing live)' : 'Inactive'}`,
        `👶 Child Safety: ${isChildSafety ? 'ACTIVE (Destination verification required)' : 'Inactive'}`,
        `🏍️ Helmet check sensor: Confirmed (Verified by Driver).`
      ],
      actions: [
        { label: "Share Live Trip", action: "share_trip" },
        { label: "Emergency SOS", action: "trigger_sos" }
      ]
    },
    {
      id: 'fare',
      title: 'Fare Rate',
      icon: <Fuel className="h-4.5 w-4.5 text-indigo-400" />,
      status: (isHeavyTraffic || isRainy) ? 'caution' : 'nominal',
      statusText: (isHeavyTraffic || isRainy) ? 'Surge Dynamic' : 'Eco Standard',
      color: (isHeavyTraffic || isRainy) ? 'border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10' : 'border-theme-border bg-theme-bg/60 hover:bg-theme-bg',
      description: (isHeavyTraffic || isRainy) ? 'Surge surcharge active' : 'Optimized rate',
      details: [
        "💳 Base Fare: ₹50.00",
        `⏱️ Commute time surcharge: ₹${(isHeavyTraffic || isRainy) ? '25.00 (Surge)' : '0.00'}`,
        `🌱 Eco-Saver adjustment applied.`,
        "🛡️ Price Lock: Active (Your fare will not increase if trip is delayed)."
      ],
      actions: [
        { label: "View Price Policy", action: "price_policy" }
      ]
    },
    {
      id: 'road',
      title: 'Road Quality',
      icon: <AlertCircle className={`h-4.5 w-4.5 ${isPoorRoad ? 'text-amber-400' : 'text-theme-text-secondary'}`} />,
      status: 'nominal',
      statusText: `${roadHealth}% Score`,
      color: isPoorRoad ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10' : 'border-theme-border bg-theme-bg/60 hover:bg-theme-bg',
      description: isPoorRoad ? 'Hazards reported nearby' : 'Excellent surface health',
      details: isPoorRoad ? [
        "🚧 Multiple potholes reported 1.2km ahead.",
        "🚦 Barricaded road works near subway tunnel.",
        "🛡️ Route optimization algorithm recommends slower speed."
      ] : [
        "🟢 Asphalt quality: Good. High friction index.",
        "🚧 0 construction alerts reported along this path."
      ],
      actions: [
        { label: "View Local Hazards", action: "view_hazards" }
      ]
    },
    {
      id: 'hospital',
      title: 'Hospitals',
      icon: <Activity className="h-4.5 w-4.5 text-rose-400" />,
      status: 'info',
      statusText: 'Mapped',
      color: 'border-theme-border bg-theme-bg/60 hover:bg-theme-bg',
      description: 'Emergency trauma care',
      details: [
        "🏥 Nearest Level-1 Trauma Care: Apollo Health City.",
        "📍 Distance from route midpoint: 1.8 km (approx. 4 mins).",
        "📞 Hospital direct reception: +91 44 2829 0200.",
        "🚨 Direct dispatch connection activated."
      ],
      actions: [
        { label: "Call Apollo Hospital", action: "call_hospital" }
      ]
    },
    {
      id: 'emergency',
      title: 'Contacts',
      icon: <PhoneCall className="h-4.5 w-4.5 text-rose-500" />,
      status: 'info',
      statusText: 'Synced',
      color: 'border-theme-border bg-theme-bg/60 hover:bg-theme-bg',
      description: 'SMS Broadcast active',
      details: [
        "📞 Primary contact: Police Control Room (112)",
        "👪 Guardian: Aishwarya (+91 9444102938)",
        "📡 Satellite SMS dispatch ready: broadcasts current coordinates every 30 seconds if SOS triggered."
      ],
      actions: [
        { label: "SMS Guardian Now", action: "sms_guardian" },
        { label: "Hotline 112 Dial", action: "call_police" }
      ]
    }
  ];

  const getChatResponse = (query: string): string => {
    const q = query.toLowerCase();
    
    if (q.includes('safe') || q.includes('security') || q.includes('protect')) {
      const parts = [
        "🛡️ **Live Safety Telemetry Assessment:**",
        "• **Driver Check:** Partner is verified with a 4.8★ rating.",
        "• **GPS Geoshield:** Armed. Checking route deviations every 15s.",
        `• **Women Safety Mode:** ${localStorage.getItem('zipride_women_safety_active') === 'true' ? '🔴 ACTIVE (Emergency contact SMS broadcasting enabled)' : 'Inactive (Activate in Settings)'}`,
        `• **Child Safety Mode:** ${localStorage.getItem('zipride_child_safety_active') === 'true' ? '🔒 ACTIVE (Requires pickup PIN & guardian check at destination)' : 'Inactive'}`
      ];
      return parts.join('\n');
    }

    if (q.includes('fare') || q.includes('price') || q.includes('cost') || q.includes('calculate') || q.includes('charge')) {
      const wtText = (weatherCondition || '').toLowerCase();
      const trText = (trafficLevel || '').toLowerCase();
      const hasSurge = wtText.includes('rain') || wtText.includes('storm') || trText.includes('heavy') || trText.includes('severe') || trText.includes('congestion');
      
      const parts = [
        "💳 **Intelligent Fare Engine Breakdown:**",
        "• **Base Booking Fare:** ₹50.00",
        "• **Distance Fare:** ₹12.00 per kilometer",
        `• **Dynamic Surcharge Multiplier:** ${hasSurge ? '1.2x surge active due to inclement conditions' : '1.0x (Standard rate)'}`,
        "• **Price Lock Guarantee:** Secured. Your fare is locked regardless of traffic delays."
      ];
      return parts.join('\n');
    }

    if (q.includes('weather') || q.includes('rain') || q.includes('storm') || q.includes('cloud')) {
      const rainStatus = wt.includes('rain') || wt.includes('storm') || wt.includes('drizzle') || wt.includes('monsoon');
      return rainStatus 
        ? `🌧️ **Weather Alert:** Rain or wet road conditions detected (${weatherCondition}). We suggest using a Cab or Auto for shelter. For Bike rides, keep visor down. Driver speed is capped at 50-60 km/h.`
        : `☀️ **Weather Status:** Conditions are ${weatherCondition || 'clear'} with ideal visibility. It's a perfect time for a fast, eco-friendly ride!`;
    }

    if (q.includes('traffic') || q.includes('delay') || q.includes('congestion') || q.includes('jam')) {
      const isHeavy = tf.includes('heavy') || tf.includes('severe') || tf.includes('congestion') || tf.includes('gridlock');
      return isHeavy
        ? `🚦 **Traffic Delay Notice:** Heavy congestion detected along the main corridor. We recommend selecting the Eco Route, which bypasses the flyover bottleneck and saves ~12 minutes.`
        : `🟢 **Traffic flow:** Traffic is ${trafficLevel || 'Light'} along your route. Standard travel times apply.`;
    }

    if (q.includes('road') || q.includes('pothole') || q.includes('hazard') || q.includes('quality')) {
      const roadScore = currentRoute ? currentRoute.roadHealthScore : 88;
      return `🚧 **Road Condition Update:** The selected route road health index is **${roadScore}%**. There are ${roadScore < 75 ? 'multiple potholes and metro road construction blocks' : 'no major hazards'} reported on this pathway. Ride carefully!`;
    }

    if (q.includes('hospital') || q.includes('medical') || q.includes('doctor') || q.includes('emergency')) {
      return `🏥 **Emergency Medical Mapping:**\n• Nearest Trauma Center: Apollo Health City (1.8 km from route, ~4 mins arrival time).\n• Direct Desk Contact: +91 44 2829 0200.\n• Emergency vehicle pathing is pre-loaded on driver console.`;
    }

    if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('help')) {
      return `Hello! How can I assist you today? You can ask me questions like:
• "Is my ride safe? 🛡️"
• "How is the fare calculated? 💳"
• "Show road quality details 🚧"
• "Nearby hospitals? 🏥"
• "What is the weather alert? 🌧️"`;
    }

    return `I see you are asking about "${query}". I am currently monitoring your trip under ${weatherCondition || 'clear'} weather and ${trafficLevel || 'light'} traffic. Let me know if you need specific details on Safety, Fare Breakdown, Weather/Traffic updates, or Road Hazards!`;
  };

  const parseSuggestionsAndAlerts = (rawText: string) => {
    const suggestions: Array<{ action: string; label: string }> = [];
    const suggestionRegex = /\[SUGGESTION:\s*([A-Z_]+)\]\s*([^\n]+)/gi;
    let match;
    while ((match = suggestionRegex.exec(rawText)) !== null) {
      suggestions.push({
        action: match[1].toUpperCase(),
        label: match[2].trim()
      });
    }
    const cleanText = rawText
      .replace(/\[ALERT:\s*(WEATHER|TRAFFIC|SAFETY)\]\s*[^\n]+/gi, '')
      .replace(/\[SUGGESTION:\s*([A-Z_]+)\]\s*[^\n]+/gi, '')
      .trim();
    return { cleanText, suggestions };
  };

  const handleSuggestionClick = (action: string, label: string) => {
    if (action === 'SHOW_SAFER_ROUTE') {
      window.dispatchEvent(new CustomEvent('zipride_switch_route', { detail: { index: 1 } }));
      setMessages(prev => [
        ...prev,
        { id: `user-act-${Date.now()}`, sender: 'user', text: `Switch to safer route`, timestamp: new Date() },
        { id: `sys-act-${Date.now()}`, sender: 'system', text: `🌱 Eco Route selected. Map updating...`, timestamp: new Date() }
      ]);
      return;
    }
    if (action === 'EMERGENCY_HELP') {
      window.dispatchEvent(new Event('zipride_trigger_sos'));
      setMessages(prev => [
        ...prev,
        { id: `user-act-${Date.now()}`, sender: 'user', text: `Trigger Emergency SOS`, timestamp: new Date() },
        { id: `sys-act-${Date.now()}`, sender: 'system', text: `🚨 SOS BROADCAST ACTIVE. PCR emergency services and guardians notified.`, timestamp: new Date() }
      ]);
      return;
    }
    if (action === 'TRACK_DRIVER') {
      setMessages(prev => [
        ...prev,
        { id: `user-act-${Date.now()}`, sender: 'user', text: `Track Driver Location`, timestamp: new Date() },
        { id: `sys-act-${Date.now()}`, sender: 'system', text: `📍 GPS tracking centered on driver.`, timestamp: new Date() }
      ]);
      return;
    }
    handleSendMessage(label);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date()
    };

    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    setChatInput('');
    setIsThinking(true);

    try {
      const historyPayload = currentMessages
        .filter(m => m.id !== 'init' && (m.sender === 'user' || m.sender === 'ai'))
        .map(m => ({
          role: m.sender === 'user' ? ('user' as const) : ('model' as const),
          parts: [{ text: m.text }]
        }));

      if (historyPayload.length > 0) {
        historyPayload.pop();
      }

      const profile = ZipRideRepository.getProfile();
      const payload = {
        question: text,
        history: historyPayload,
        currentUser: profile ? profile.fullName : 'Saran',
        role: driverMode ? 'driver' : 'passenger',
        routes: routes,
        selectedRouteIndex: selectedRouteIndex,
        driverRating: activeRide ? (activeRide.driverRating || 4.8) : 4.8
      };

      const res = await fetch('/api/gemini/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let replyText = '';
      if (res.ok) {
        const data = await res.json();
        replyText = data.answer || "I'm sorry, I couldn't process that query.";
      } else {
        console.warn('Backend assist API failed, using local fallback.');
        replyText = getChatResponse(text);
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
      speakIfVisuallyImpaired(replyText);
    } catch (err) {
      console.error('RideMate AI fetch failed, using local fallback:', err);
      const fallbackText = getChatResponse(text);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: fallbackText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
      speakIfVisuallyImpaired(fallbackText);
    } finally {
      setIsThinking(false);
    }
  };

  const handleCardAction = (action: string, label: string) => {
    // Add user click context
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: `[Action Triggered] ${label}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    setTimeout(() => {
      let reply = '';
      if (action === 'switch_auto') {
        reply = "🚕 **Vehicle Request:** Requesting covered auto-rickshaw/cab assignment to bypass storm conditions. Searching for nearby available drivers...";
      } else if (action === 'view_rain') {
        reply = "🌧️ **Weather Radar Forecast:** Active storm band moving Northeast. Current precipitation intensity: 8.4mm/hr. Rain expected to clear in 22 minutes.";
      } else if (action === 'switch_eco') {
        reply = "🌱 **Eco Route Requested:** Updating navigation path to Bypass Flyover. Speed adjustments processed. This optimizes fuel consumption by 15%.";
        window.dispatchEvent(new CustomEvent('zipride_switch_route', { detail: { index: 1 } }));
      } else if (action === 'share_trip') {
        reply = "✉️ **Trip Shared:** Live GPS coordinates and vehicle number broadcasted to emergency contact (Aishwarya: +91 9444102938).";
      } else if (action === 'trigger_sos') {
        window.dispatchEvent(new Event('zipride_trigger_sos'));
        reply = "🚨 **SOS BROADCAST LIVE:** Local PCR vehicle alerted. Dispatch coordinates shared. Medical team standby armed.";
      } else if (action === 'price_policy') {
        reply = "💳 **Pricing Rules:**\n• Base Fare: ₹50.00\n• Distance rate: ₹12/km\n• Surcharge: Dynamic pricing caps surcharge at max 1.2x during gridlock/precipitation.";
      } else if (action === 'view_hazards') {
        reply = "🚧 **Live Hazards along Corridor:**\n1. Left-lane sewer trench at 0.8km.\n2. Ukkadam bridge logging: 0.2m depth (ride slow).";
      } else if (action === 'call_hospital') {
        reply = "🏥 **Dialing Emergency Desk:** Apollo Health City direct dial +91 44 2829 0200 connected.";
      } else if (action === 'sms_guardian') {
        reply = "✉️ **SMS Sent:** Guardian notified. Broadcast: 'ZipRide tracking status active. Current loc: Indiranagar corridor.'";
      } else if (action === 'call_police') {
        reply = "📞 **Line 112 Dialed:** PCR dispatch desk connection simulated.";
      } else {
        reply = `Action completed: ${label}`;
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsThinking(false);
      speakIfVisuallyImpaired(reply);
    }, 600);
  };

  const handleClearHistory = () => {
    setMessages([
      { 
        id: 'init', 
        sender: 'ai', 
        text: `Chat history cleared. How can I help you on your commute today?`, 
        timestamp: new Date() 
      }
    ]);
  };

  const activeAlertCount = cards.filter(c => c.status === 'warning').length;

  if (!isOpen) {
    return (
      <div className="bg-theme-card border border-theme-border rounded-2xl p-4 shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="bg-indigo-555 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/35">
                <Sparkles className="h-5 w-5 text-indigo-650 dark:text-indigo-400 animate-pulse" />
              </div>
              {activeAlertCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white border border-theme-card animate-bounce">
                  {activeAlertCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-black text-theme-text-primary text-sm tracking-tight flex items-center gap-1.5">
                RideMate AI
                {activeAlertCount > 0 && (
                  <span className="text-[9px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full border border-rose-500/20 font-bold uppercase tracking-wider">
                    {activeAlertCount} Alert{activeAlertCount > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-theme-text-secondary font-medium">Commute assistant online</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(true)}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition font-black tracking-wider uppercase cursor-pointer shadow-md border-0"
          >
            Open Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-theme-card border border-theme-border rounded-2xl p-5 shadow-2xl transition-all duration-300 flex flex-col h-[520px] max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-theme-border pb-3 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-50 dark:bg-indigo-950 p-2 rounded-xl border border-indigo-200 dark:border-indigo-500/25">
            <Sparkles className="h-5 w-5 text-indigo-650 dark:text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-black text-theme-text-primary text-sm flex items-center gap-1.5 tracking-tight">
              RideMate AI
              <span className="text-[9px] bg-indigo-500/15 text-indigo-650 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20 font-bold uppercase tracking-wider">
                Companion
              </span>
            </h3>
            <p className="text-[10px] text-theme-text-secondary font-medium font-mono">Telemetry & safety broker</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleClearHistory}
            className="text-[9px] bg-theme-bg hover:bg-theme-hover-bg border border-theme-border text-theme-text-secondary font-black py-1 px-2.5 rounded-lg transition font-mono uppercase cursor-pointer"
            title="Clear Chat History"
          >
            Clear
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-theme-text-secondary hover:text-theme-text-primary p-1.5 rounded-lg hover:bg-theme-hover-bg transition"
            title="Minimize"
          >
            <ChevronDown className="h-4.5 w-4.5 text-theme-text-secondary" />
          </button>
        </div>
      </div>

      {/* Volumetric Banner for Active Warnings */}
      {activeAlertCount > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/15 rounded-xl p-2.5 mb-3 flex items-center gap-2.5 shrink-0 animate-pulse">
          <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
          <div className="text-[11px] font-semibold text-rose-300 leading-tight">
            Safety Warning: {activeAlertCount} high-risk condition{activeAlertCount > 1 ? 's' : ''} detected. Adjust travel preferences.
          </div>
        </div>
      )}

      {/* Smart AI Cards Container (Horizontal Slider) */}
      <div className="mb-3 shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {cards.map((card) => {
            const isSelected = selectedCard === card.id;
            const hasAlert = card.status === 'warning';
            const hasCaution = card.status === 'caution';
            
            return (
              <button
                key={card.id}
                onClick={() => setSelectedCard(isSelected ? null : card.id)}
                className={`snap-start shrink-0 w-28 p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                  isSelected 
                    ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500/30' 
                    : card.color
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  {card.icon}
                  {hasAlert ? (
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  ) : hasCaution ? (
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  )}
                </div>
                <div className="text-[11px] font-bold text-white truncate">{card.title}</div>
                <div className={`text-[9px] font-bold font-mono mt-0.5 ${
                  hasAlert ? 'text-rose-400' : hasCaution ? 'text-amber-400' : 'text-slate-400'
                }`}>{card.statusText}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expandable Alert Details Card Area */}
      <AnimatePresence mode="wait">
        {selectedCard && (
          <motion.div
            key={selectedCard}
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 12 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            className="bg-theme-bg border border-theme-border rounded-xl p-3 text-[11px] space-y-2.5 shrink-0 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-theme-border pb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-theme-text-primary">
                {cards.find(c => c.id === selectedCard)?.icon}
                <span>{cards.find(c => c.id === selectedCard)?.title} Recommendations</span>
              </div>
              <button 
                onClick={() => setSelectedCard(null)} 
                className="text-theme-text-secondary hover:text-theme-text-primary p-0.5 hover:bg-theme-hover-bg rounded-md transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            
            <div className="space-y-1.5 text-theme-text-primary font-semibold leading-relaxed">
              {cards.find(c => c.id === selectedCard)?.details.map((detail, idx) => (
                <p key={idx}>{detail}</p>
              ))}
            </div>

            {/* Quick action buttons inside card */}
            {cards.find(c => c.id === selectedCard)?.actions.length ? (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-theme-border">
                {cards.find(c => c.id === selectedCard)?.actions.map((act, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCardAction(act.action, act.label)}
                    className="bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-650 dark:text-indigo-300 px-2.5 py-1 rounded-lg transition text-[10px] font-bold cursor-pointer"
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 mb-3 bg-theme-bg/35 border border-theme-border p-3.5 rounded-xl custom-scrollbar">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isSystem = msg.sender === 'system';
          
          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="bg-theme-bg border border-theme-border px-3.5 py-2 rounded-xl text-[10px] font-bold text-amber-600 dark:text-amber-300 leading-normal flex items-start gap-2 max-w-[90%]">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{msg.text}</span>
                </div>
              </div>
            );
          }

          const parsed = !isUser ? parseSuggestionsAndAlerts(msg.text) : { cleanText: msg.text, suggestions: [] };

          return (
            <div 
              key={msg.id} 
              className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
            >
              <div className={`flex items-start gap-2 max-w-[85%]`}>
                {!isUser && (
                  <div className="w-6 h-6 rounded-lg bg-indigo-555 border border-indigo-200 dark:border-indigo-500/35 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-650 dark:text-indigo-400" />
                  </div>
                )}
                
                <div className="space-y-1">
                  <div className={`rounded-2xl px-3.5 py-2.5 text-[11px] leading-relaxed whitespace-pre-wrap font-semibold shadow-sm ${
                    isUser 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-theme-bg border border-theme-border text-theme-text-primary rounded-tl-none'
                  }`}>
                    {parsed.cleanText}
                  </div>

                  {!isUser && parsed.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 pl-1">
                      {parsed.suggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(sug.action, sug.label)}
                          className="bg-indigo-600/15 hover:bg-indigo-650/20 border border-indigo-500/25 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg transition text-[9px] font-bold cursor-pointer"
                        >
                          {sug.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[8px] text-theme-text-secondary block px-1 font-medium font-mono text-right">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {isThinking && (
          <div className="flex justify-start animate-pulse">
            <div className="flex items-start gap-2 max-w-[85%]">
              <div className="w-6 h-6 rounded-lg bg-indigo-555 border border-indigo-200 dark:border-indigo-500/35 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-650 dark:text-indigo-400 animate-spin" />
              </div>
              <div className="bg-theme-bg border border-theme-border text-theme-text-secondary rounded-2xl rounded-tl-none px-3.5 py-2.5 text-[11px] font-bold flex items-center gap-1.5">
                <span>RideMate is thinking</span>
                <span className="flex gap-0.5 items-center mt-1">
                  <span className="w-1 h-1 bg-theme-text-secondary rounded-full animate-bounce" />
                  <span className="w-1 h-1 bg-theme-text-secondary rounded-full animate-bounce delay-75" />
                  <span className="w-1 h-1 bg-theme-text-secondary rounded-full animate-bounce delay-150" />
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick query chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 shrink-0 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => handleSendMessage("Is my ride safe?")}
          className="bg-theme-bg hover:bg-theme-hover-bg border border-theme-border text-theme-text-secondary hover:text-theme-text-primary px-2.5 py-1 rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer"
        >
          🛡️ Is my ride safe?
        </button>
        <button
          onClick={() => handleSendMessage("How is the fare calculated?")}
          className="bg-theme-bg hover:bg-theme-hover-bg border border-theme-border text-theme-text-secondary hover:text-theme-text-primary px-2.5 py-1 rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer"
        >
          💳 Fare break down
        </button>
        <button
          onClick={() => handleSendMessage("Show road quality details")}
          className="bg-theme-bg hover:bg-theme-hover-bg border border-theme-border text-theme-text-secondary hover:text-theme-text-primary px-2.5 py-1 rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer"
        >
          🚧 Road hazards
        </button>
        <button
          onClick={() => handleSendMessage("Nearby hospitals?")}
          className="bg-theme-bg hover:bg-theme-hover-bg border border-theme-border text-theme-text-secondary hover:text-theme-text-primary px-2.5 py-1 rounded-lg text-[10px] font-bold transition shrink-0 cursor-pointer"
        >
          🏥 Emergency hospitals
        </button>
      </div>

      {/* Input box */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(chatInput);
        }}
        className="flex gap-2 shrink-0 pt-2 border-t border-theme-border"
      >
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Ask RideMate AI..."
          className="flex-1 bg-theme-input-bg border border-theme-input-border focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs focus:outline-none text-theme-text-primary font-bold placeholder-theme-text-secondary transition-colors"
          disabled={isThinking}
        />
        <button
          type="submit"
          disabled={!chatInput.trim() || isThinking}
          className="w-9 h-9 rounded-xl bg-indigo-650 hover:bg-indigo-600 disabled:bg-theme-bg disabled:text-theme-text-secondary/50 text-white flex items-center justify-center transition shrink-0 shadow-md cursor-pointer border-0"
        >
          <Send className="w-4.5 h-4.5" />
        </button>
      </form>
    </div>
  );
};

export default RideMatePanel;

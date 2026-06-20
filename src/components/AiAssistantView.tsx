// src/components/AiAssistantView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Bot, User, Trash2, ArrowLeft, ShieldCheck, HelpCircle, AlertTriangle, CloudRain, Shield, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ZipRideRepository } from '../services/dbInterface';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface AiAssistantViewProps {
  currentUser: string | null;
  currentUserRole: 'passenger' | 'driver' | 'admin' | null;
  onSelectTab: (path: string) => void;
  systemState: any;
  activeRide: any;
}

interface ParsedMessage {
  text: string;
  alerts: Array<{ type: 'WEATHER' | 'TRAFFIC' | 'SAFETY'; title: string; desc: string }>;
  suggestions: Array<{ action: string; label: string }>;
}

const parseAssistantResponse = (rawText: string): ParsedMessage => {
  const alerts: ParsedMessage['alerts'] = [];
  const suggestions: ParsedMessage['suggestions'] = [];
  let cleanText = rawText;

  // Match [ALERT: TYPE] Content
  const alertRegex = /\[ALERT:\s*(WEATHER|TRAFFIC|SAFETY)\]\s*([^\n]+)/gi;
  let match;
  while ((match = alertRegex.exec(rawText)) !== null) {
    const type = match[1].toUpperCase() as 'WEATHER' | 'TRAFFIC' | 'SAFETY';
    const content = match[2].trim();
    
    let title = '';
    let desc = content;

    const splitIdx = content.indexOf('-');
    const colonIdx = content.indexOf(':');
    const sepIdx = splitIdx !== -1 ? splitIdx : colonIdx;

    if (sepIdx !== -1) {
      title = content.substring(0, sepIdx).trim();
      desc = content.substring(sepIdx + 1).trim();
    } else {
      if (type === 'WEATHER') title = 'Weather Alert';
      else if (type === 'TRAFFIC') title = 'Traffic Alert';
      else if (type === 'SAFETY') title = 'Safety Insight';
    }

    alerts.push({ type, title, desc });
  }

  // Match [SUGGESTION: ACTION] Label
  const suggestionRegex = /\[SUGGESTION:\s*([A-Z_]+)\]\s*([^\n]+)/gi;
  while ((match = suggestionRegex.exec(rawText)) !== null) {
    suggestions.push({
      action: match[1].toUpperCase(),
      label: match[2].trim()
    });
  }

  // Strip tags from message
  cleanText = cleanText
    .replace(/\[ALERT:\s*(WEATHER|TRAFFIC|SAFETY)\]\s*[^\n]+/gi, '')
    .replace(/\[SUGGESTION:\s*([A-Z_]+)\]\s*[^\n]+/gi, '')
    .trim();

  return { text: cleanText, alerts, suggestions };
};

const RideMateAvatar = ({ isThinking }: { isThinking?: boolean }) => (
  <div className="relative w-8 h-8 rounded-xl bg-theme-bg border border-[#00C896]/30 flex items-center justify-center shrink-0">
    <AnimatePresence>
      {isThinking ? (
        <>
          <motion.div
            initial={{ scale: 0.8, opacity: 0.6 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
            className="absolute inset-0 rounded-xl border border-[#00C896]/55 bg-[#00C896]/5"
          />
          <motion.div
            initial={{ scale: 0.8, opacity: 0.4 }}
            animate={{ scale: 2.1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.2, delay: 0.4, ease: "easeOut" }}
            className="absolute inset-0 rounded-xl border border-emerald-400/30"
          />
        </>
      ) : (
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.35, 0.15] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="absolute inset-0 rounded-xl bg-[#00C896]/10"
        />
      )}
    </AnimatePresence>

    <motion.div
      animate={isThinking ? {
        y: [0, -3, 0],
        rotate: [0, 90, 180, 270, 360],
        scale: [1, 1.15, 1]
      } : {
        scale: [1, 1.05, 1],
        rotate: [0, 5, 0, -5, 0]
      }}
      transition={isThinking ? {
        y: { repeat: Infinity, duration: 0.6, ease: "easeInOut" },
        rotate: { repeat: Infinity, duration: 2, ease: "linear" },
        scale: { repeat: Infinity, duration: 0.6, ease: "easeInOut" }
      } : {
        repeat: Infinity,
        duration: 4,
        ease: "easeInOut"
      }}
      className="text-[#00C896] drop-shadow-[0_0_8px_rgba(0,200,150,0.5)] z-10"
    >
      <Sparkles className="w-4.5 h-4.5 text-[#00C896]" />
    </motion.div>
    <div className="absolute inset-0 border border-[#00C896]/20 rounded-xl pointer-events-none" />
  </div>
);

export default function AiAssistantView({ currentUser, currentUserRole, onSelectTab, systemState, activeRide }: AiAssistantViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const prevTrafficRef = useRef<string | null>(null);
  const prevWeatherRef = useRef<string | null>(null);

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

  // Sync session chat history on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('zipride_chat_history');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved chat history:', e);
      }
    } else {
      const greeting = `Hello! I am your RideMate Companion. 🚗 I have live access to your safety telemetry, active route options, weather conditions, and driver details. Ask me anything!`;
      const initialMsgs: Message[] = [{ role: 'model', parts: [{ text: greeting }] }];
      setMessages(initialMsgs);
      sessionStorage.setItem('zipride_chat_history', JSON.stringify(initialMsgs));
    }
  }, []);

  const saveMessages = (newMsgs: Message[]) => {
    setMessages(newMsgs);
    sessionStorage.setItem('zipride_chat_history', JSON.stringify(newMsgs));
  };

  // Proactive Traffic & Weather Alerts
  useEffect(() => {
    if (!systemState?.config) return;

    const currentTraffic = systemState.config.traffic;
    const currentWeather = systemState.config.weather;

    // Proactive Traffic Alert
    if (prevTrafficRef.current && prevTrafficRef.current !== currentTraffic) {
      if (currentTraffic === 'Heavy Congestion' || currentTraffic === 'Gridlock') {
        const alertMsg = `Traffic increased by 25%.
Switching to Route 2 may save 8 minutes.

[ALERT: TRAFFIC] Surcharge Active - Traffic index is high (${currentTraffic}).
[SUGGESTION: SHOW_SAFER_ROUTE] Switch to Route 2`;

        setMessages(prev => {
          const newMsgs = [...prev, { role: 'model' as const, parts: [{ text: alertMsg }] }];
          sessionStorage.setItem('zipride_chat_history', JSON.stringify(newMsgs));
          return newMsgs;
        });
        speakIfVisuallyImpaired(`Traffic increased by 25 percent. Switching to Route 2 may save 8 minutes.`);
      }
    }

    // Proactive Weather Alert
    if (prevWeatherRef.current && prevWeatherRef.current !== currentWeather) {
      if (['Heavy Rain', 'Monsoon Storm'].includes(currentWeather)) {
        const alertMsg = `Heavy rain hazards detected near destination.
Speed cap adjusted to ${currentWeather === 'Monsoon Storm' ? '50' : '60'} km/h for maximum traction.

[ALERT: WEATHER] Heavy Rain Alert - Weather risk is high (${currentWeather}).
[SUGGESTION: SHOW_SAFER_ROUTE] View Safer Route`;

        setMessages(prev => {
          const newMsgs = [...prev, { role: 'model' as const, parts: [{ text: alertMsg }] }];
          sessionStorage.setItem('zipride_chat_history', JSON.stringify(newMsgs));
          return newMsgs;
        });
        speakIfVisuallyImpaired(`Heavy rain hazards detected. Speed cap adjusted for safety.`);
      }
    }

    prevTrafficRef.current = currentTraffic;
    prevWeatherRef.current = currentWeather;
  }, [systemState?.config?.traffic, systemState?.config?.weather]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    setInput('');
    await submitQueryDirectly(userText);
  };

  const submitQueryDirectly = async (text: string) => {
    const updatedMsgs = [...messages, { role: 'user' as const, parts: [{ text }] }];
    saveMessages(updatedMsgs);
    setIsTyping(true);

    const savedRoutesRaw = localStorage.getItem('zipride_routes_list');
    const savedSelectedIdx = localStorage.getItem('zipride_selected_route_index');
    let routes = undefined;
    let selectedRouteIndex = undefined;
    if (savedRoutesRaw) {
      try {
        routes = JSON.parse(savedRoutesRaw);
      } catch (e) {}
    }
    if (savedSelectedIdx) {
      selectedRouteIndex = parseInt(savedSelectedIdx) || 0;
    }

    try {
      const res = await fetch('/api/gemini/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          history: messages,
          currentUser: currentUser || 'Saran',
          role: currentUserRole || 'passenger',
          routes,
          selectedRouteIndex,
          driverRating: 4.8
        })
      });

      if (res.ok) {
        const data = await res.json();
        const modelText = data.answer || "I'm having trouble responding right now.";
        saveMessages([...updatedMsgs, { role: 'model' as const, parts: [{ text: modelText }] }]);
        speakIfVisuallyImpaired(modelText);
      } else {
        const errorText = "Error connecting to AI service.";
        saveMessages([...updatedMsgs, { role: 'model' as const, parts: [{ text: errorText }] }]);
        speakIfVisuallyImpaired(errorText);
      }
    } catch (err) {
      console.error('AI Chat Error:', err);
      const offlineText = "Network connection lost.";
      saveMessages([...updatedMsgs, { role: 'model' as const, parts: [{ text: offlineText }] }]);
      speakIfVisuallyImpaired(offlineText);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (action: string, label: string) => {
    if (action === 'SHOW_SAFER_ROUTE') {
      onSelectTab('/booking');
      return;
    }
    if (action === 'TRACK_DRIVER') {
      onSelectTab('/tracker');
      return;
    }
    if (action === 'EMERGENCY_HELP') {
      window.dispatchEvent(new Event('zipride_trigger_sos'));
      return;
    }
    submitQueryDirectly(label);
  };

  const handleClearHistory = () => {
    const greeting = `Chat history cleared. How can I assist you with ZipRide guidelines today?`;
    const initialMsgs: Message[] = [{ role: 'model', parts: [{ text: greeting }] }];
    saveMessages(initialMsgs);
  };

  const getSystemStatus = () => {
    if (activeRide?.hasActiveSOS || activeRide?.safetyScore < 70) {
      return { label: 'Alert', color: 'bg-rose-500/10 text-rose-500 border-rose-500/25', icon: '🔴' };
    }
    const weather = systemState?.config?.weather || 'Clear';
    const traffic = systemState?.config?.traffic || 'Light';
    if (['Heavy Rain', 'Monsoon Storm', 'High Winds'].includes(weather) || ['Heavy Congestion', 'Gridlock'].includes(traffic)) {
      return { label: 'Caution', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20', icon: '🟡' };
    }
    return { label: 'Safe', color: 'bg-emerald-500/15 text-[#00C896] border-emerald-500/20', icon: '🟢' };
  };

  const systemStatus = getSystemStatus();

  const presetQuestions = [
    "Explain the dynamic weather surcharges.",
    "Show me the traffic multipliers.",
    "Is my active ride safe?",
    "Why did the route fare increase?"
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-theme-card border border-theme-border rounded-2xl p-4 md:p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onSelectTab('/')}
            className="p-2.5 rounded-xl border border-theme-border bg-theme-bg text-theme-text-secondary hover:text-theme-text-primary transition cursor-pointer"
            title="Go back to Dashboard"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00C896] animate-ping" />
              <h2 className="text-lg font-black text-theme-text-primary tracking-tight">RideMate AI Companion Hub</h2>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${systemStatus.color}`}>
                {systemStatus.icon} {systemStatus.label}
              </span>
            </div>
            <p className="text-xs text-theme-text-secondary font-medium mt-1">Real-time safety co-pilot & dynamic operations intelligence portal.</p>
          </div>
        </div>

        <button 
          onClick={handleClearHistory}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-50/70 border border-rose-200/50 hover:bg-rose-50 hover:text-rose-700 text-rose-600 rounded-xl font-bold text-xs transition cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear History</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Grounded State Info */}
        <div className="lg:col-span-4 space-y-6">
          {/* User profile card */}
          <div className="bg-theme-card border border-theme-border rounded-2xl p-5 shadow-xs">
            <h4 className="text-xs font-mono font-bold text-theme-text-secondary uppercase tracking-wider mb-4">Companion Context</h4>
            <div className="flex items-center gap-3 border-b border-theme-border/60 pb-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-theme-bg border border-theme-border flex items-center justify-center text-brand-emerald shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-theme-text-primary">{currentUser || 'Saran'}</h5>
                <span className="text-[10px] text-theme-text-secondary font-bold font-mono uppercase tracking-wide bg-theme-bg border border-theme-border px-1.5 py-0.5 rounded mt-0.5 inline-block">
                  Role: {currentUserRole || 'passenger'}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-theme-text-secondary">Global Weather:</span>
                <span className="text-theme-text-primary font-bold">{systemState.config.weather}</span>
              </div>
              <div className="flex justify-between border-t border-theme-border/30 pt-2">
                <span className="text-theme-text-secondary">Global Traffic:</span>
                <span className="text-theme-text-primary font-bold">{systemState.config.traffic}</span>
              </div>
              <div className="flex justify-between border-t border-theme-border/30 pt-2">
                <span className="text-theme-text-secondary">Ecosystem Status:</span>
                <span className="text-[#00C896] font-mono font-extrabold uppercase">{systemStatus.label} Mode</span>
              </div>
            </div>
          </div>

          {/* Active Ride Card */}
          <div className="bg-theme-card border border-theme-border rounded-2xl p-5 shadow-xs">
            <h4 className="text-xs font-mono font-bold text-theme-text-secondary uppercase tracking-wider mb-4">Grounded Active Commute</h4>
            {activeRide ? (
              <div className="space-y-3">
                <div className="p-3 bg-brand-emerald/10 border border-brand-emerald/20 rounded-xl">
                  <span className="text-[9px] font-mono text-emerald-700 font-extrabold uppercase tracking-wide">COMMUTING • {activeRide.status.replace('_', ' ').toUpperCase()}</span>
                  <h5 className="text-xs font-bold text-theme-text-primary mt-0.5">Route: {activeRide.pickup} → {activeRide.drop}</h5>
                </div>

                <div className="space-y-2.5 text-xs font-semibold">
                  <div className="flex justify-between">
                    <span className="text-theme-text-secondary">Ride ID:</span>
                    <span className="font-mono text-theme-text-primary">{activeRide.id}</span>
                  </div>
                  <div className="flex justify-between border-t border-theme-border/30 pt-2">
                    <span className="text-theme-text-secondary">Driver:</span>
                    <span className="text-theme-text-primary font-bold">{activeRide.driverName || 'Finding Driver...'}</span>
                  </div>
                  <div className="flex justify-between border-t border-theme-border/30 pt-2">
                    <span className="text-theme-text-secondary">Locked Fare:</span>
                    <span className="text-indigo-500 font-bold">₹{activeRide.finalFare.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-theme-border/30 pt-2">
                    <span className="text-theme-text-secondary">Safety Score:</span>
                    <span className={`${activeRide.safetyScore >= 80 ? 'text-emerald-600' : 'text-rose-500'} font-bold`}>{activeRide.safetyScore}%</span>
                  </div>
                  <div className="flex justify-between border-t border-theme-border/30 pt-2">
                    <span className="text-theme-text-secondary">SOS Warnings:</span>
                    <span className={`${activeRide.hasActiveSOS ? 'text-rose-650 animate-pulse font-extrabold' : 'text-theme-text-secondary'}`}>
                      {activeRide.hasActiveSOS ? '🚨 ACTIVE SOS' : 'None'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-theme-text-secondary text-xs">
                <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <span>No active ride. Operational queries mode.</span>
              </div>
            )}
          </div>

          {/* Quick FAQ / Presets */}
          <div className="bg-theme-card border border-theme-border rounded-2xl p-5 shadow-xs">
            <h4 className="text-xs font-mono font-bold text-theme-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" />
              <span>Suggested RideMate Actions</span>
            </h4>
            <div className="space-y-2">
              {presetQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="w-full text-left p-2.5 rounded-xl border border-theme-border hover:border-brand-emerald bg-theme-bg/50 hover:bg-theme-hover-bg text-xs font-semibold text-theme-text-primary transition cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Chat Screen */}
        <div className="lg:col-span-8 bg-theme-card border border-theme-border rounded-2xl h-[550px] flex flex-col shadow-xs overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-theme-border/80 bg-theme-bg flex items-center gap-3 text-theme-text-primary">
            <RideMateAvatar isThinking={isTyping} />
            <div>
              <h3 className="text-sm font-extrabold text-theme-text-primary tracking-tight leading-none">RideMate Companion</h3>
              <p className="text-[10px] text-theme-text-secondary font-mono mt-1 uppercase tracking-wide">Real-Time grounded intelligence</p>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-theme-bg/20">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const parsed = parseAssistantResponse(msg.parts[0].text);

              return (
                <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-100`}>
                  <div className="flex items-start gap-3 max-w-[80%]">
                    {!isUser && <RideMateAvatar />}
                    
                    <div className="space-y-2 max-w-full">
                      {isUser ? (
                        <div className="rounded-2xl px-4 py-3 text-xs leading-relaxed font-semibold shadow-xs bg-brand-emerald text-white rounded-tr-none">
                          {msg.parts[0].text}
                        </div>
                      ) : (
                        parsed.text && (
                          <div className="rounded-2xl px-4 py-3 text-xs leading-relaxed font-semibold shadow-xs bg-theme-card border border-theme-border text-theme-text-primary rounded-tl-none">
                            {parsed.text}
                          </div>
                        )
                      )}

                      {/* Render Alert Cards */}
                      {!isUser && parsed.alerts.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {parsed.alerts.map((alert, idx) => {
                            let alertIcon = <Shield className="w-4.5 h-4.5 text-emerald-400 shrink-0" />;
                            let alertColor = 'bg-emerald-500/5 border-emerald-500/10';
                            if (alert.type === 'WEATHER') {
                              alertIcon = <CloudRain className="w-4.5 h-4.5 text-blue-400 shrink-0" />;
                              alertColor = 'bg-blue-500/5 border-blue-500/10';
                            } else if (alert.type === 'TRAFFIC') {
                              alertIcon = <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0" />;
                              alertColor = 'bg-amber-500/5 border-amber-500/10';
                            }
                            return (
                              <div key={idx} className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs text-theme-text-primary ${alertColor}`}>
                                {alertIcon}
                                <div>
                                  <span className="font-extrabold block text-theme-text-primary leading-none">{alert.title}</span>
                                  <span className="text-[10px] text-theme-text-secondary leading-normal block mt-1.5">{alert.desc}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Render Suggestions */}
                      {!isUser && parsed.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1.5">
                          {parsed.suggestions.map((sug, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSuggestionClick(sug.action, sug.label)}
                              className="px-3.5 py-2 bg-theme-bg border border-theme-border hover:border-brand-emerald hover:text-brand-emerald text-theme-text-primary rounded-xl text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <span>{sug.label}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {isTyping && (
              <div className="flex justify-start animate-pulse">
                <div className="flex items-start gap-3 max-w-[80%]">
                  <RideMateAvatar isThinking />
                  <div className="bg-theme-card border border-theme-border text-theme-text-secondary rounded-2xl rounded-tl-none px-4 py-3 text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs">
                    <span>RideMate is thinking</span>
                    <span className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 bg-theme-text-secondary rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-theme-text-secondary rounded-full animate-bounce delay-75" />
                      <span className="w-1.5 h-1.5 bg-theme-text-secondary rounded-full animate-bounce delay-150" />
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-theme-border bg-theme-card flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask RideMate Companion..."
              className="flex-1 bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-brand-emerald text-theme-text-primary"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="px-5 bg-brand-emerald hover:bg-brand-emerald-dark disabled:bg-theme-bg disabled:text-theme-text-secondary/50 text-white font-bold rounded-xl flex items-center justify-center transition shrink-0 shadow-md cursor-pointer text-xs border-0"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

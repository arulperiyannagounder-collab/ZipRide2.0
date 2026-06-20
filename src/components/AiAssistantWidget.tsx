// src/components/AiAssistantWidget.tsx
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Sparkles, Bot, AlertTriangle, CloudRain, Shield, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ZipRideRepository } from '../services/dbInterface';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface AiAssistantWidgetProps {
  currentUser: string | null;
  currentUserRole: 'passenger' | 'driver' | 'admin' | null;
  currentPath: string;
  activeRide?: any;
  systemState?: any;
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

  // Strip tags from the clean render text
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

export default function AiAssistantWidget({ currentUser, currentUserRole, currentPath, activeRide, systemState }: AiAssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  useEffect(() => {
    const saved = sessionStorage.getItem('zipride_chat_history');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved chat history:', e);
      }
    } else {
      const greeting = `Hello! I am your RideMate Companion. 🚗 I have live access to your safety telemetry, route options, weather conditions, and driver details. Ask me anything!`;
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
        setIsOpen(true);
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
        setIsOpen(true);
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
  }, [messages, isOpen, isTyping]);

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
      window.dispatchEvent(new CustomEvent('zipride_navigate', { detail: '/booking' }));
      setIsOpen(false);
      return;
    }
    if (action === 'TRACK_DRIVER') {
      window.dispatchEvent(new CustomEvent('zipride_navigate', { detail: '/tracker' }));
      setIsOpen(false);
      return;
    }
    if (action === 'EMERGENCY_HELP') {
      window.dispatchEvent(new Event('zipride_trigger_sos'));
      setIsOpen(false);
      return;
    }
    submitQueryDirectly(label);
  };

  const handleClearHistory = () => {
    const greeting = `Chat history cleared. How can I help you on your commute today?`;
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

  if (currentPath === '/login' || currentPath === '/ai-assistant') {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-brand-emerald hover:bg-brand-emerald-dark text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-all z-50 border-2 border-emerald-400 cursor-pointer"
        aria-label="AI RideMate Companion"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 md:w-96 w-[calc(100%-2rem)] max-h-[500px] h-[calc(100vh-8rem)] bg-theme-card border border-theme-border rounded-2xl shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-5 duration-200 overflow-hidden">
          {/* Header */}
          <div className="bg-theme-bg border-b border-theme-border text-theme-text-primary p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <RideMateAvatar isThinking={isTyping} />
              <div>
                <h4 className="text-sm font-black tracking-tight leading-none text-theme-text-primary flex items-center gap-1.5">
                  RideMate AI
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${systemStatus.color}`}>
                    {systemStatus.icon} {systemStatus.label}
                  </span>
                </h4>
                <span className="text-[10px] text-theme-text-secondary font-medium font-mono mt-1 block uppercase">Commute Companion</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleClearHistory}
                className="text-[9px] bg-theme-bg hover:bg-theme-hover-bg text-theme-text-secondary border border-theme-border font-bold py-1 px-2 rounded-lg transition font-mono uppercase cursor-pointer"
              >
                Clear
              </button>
              <button onClick={() => setIsOpen(false)} className="text-theme-text-secondary hover:text-theme-text-primary p-1 cursor-pointer bg-transparent border-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Message Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-theme-bg/30">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const parsed = parseAssistantResponse(msg.parts[0].text);

              return (
                <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-150`}>
                  <div className={`flex items-start gap-2 max-w-[85%]`}>
                    {!isUser && <RideMateAvatar />}
                    
                    <div className="space-y-2 max-w-full">
                      {isUser ? (
                        <div className="rounded-2xl px-3.5 py-2 text-xs leading-relaxed whitespace-pre-wrap font-medium shadow-2xs bg-brand-emerald text-white rounded-tr-none">
                          {msg.parts[0].text}
                        </div>
                      ) : (
                        parsed.text && (
                          <div className="rounded-2xl px-3.5 py-2 text-xs leading-relaxed whitespace-pre-wrap font-medium shadow-2xs bg-theme-card border border-theme-border text-theme-text-primary rounded-tl-none">
                            {parsed.text}
                          </div>
                        )
                      )}

                      {/* Render Alert Cards for Models */}
                      {!isUser && parsed.alerts.length > 0 && (
                        <div className="space-y-1.5 mt-1.5">
                          {parsed.alerts.map((alert, idx) => {
                            let alertIcon = <Shield className="w-4 h-4 text-emerald-400 shrink-0" />;
                            let alertColor = 'bg-emerald-500/5 border-emerald-500/10';
                            if (alert.type === 'WEATHER') {
                              alertIcon = <CloudRain className="w-4 h-4 text-blue-400 shrink-0" />;
                              alertColor = 'bg-blue-500/5 border-blue-500/10';
                            } else if (alert.type === 'TRAFFIC') {
                              alertIcon = <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
                              alertColor = 'bg-amber-500/5 border-amber-500/10';
                            }
                            return (
                              <div key={idx} className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs text-theme-text-primary ${alertColor}`}>
                                {alertIcon}
                                <div>
                                  <span className="font-bold block text-[11px] text-theme-text-primary leading-none">{alert.title}</span>
                                  <span className="text-[10px] text-theme-text-secondary leading-normal block mt-1">{alert.desc}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Render Suggestions for Models */}
                      {!isUser && parsed.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {parsed.suggestions.map((sug, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSuggestionClick(sug.action, sug.label)}
                              className="px-3 py-1.5 bg-theme-bg border border-theme-border hover:border-brand-emerald hover:text-brand-emerald text-theme-text-primary rounded-xl text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
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
                <div className="flex items-start gap-2 max-w-[85%]">
                  <RideMateAvatar isThinking />
                  <div className="bg-theme-card border border-theme-border text-theme-text-secondary rounded-2xl rounded-tl-none px-3.5 py-2 text-xs font-mono font-bold flex items-center gap-1.5 shadow-2xs">
                    <span>Companion is thinking</span>
                    <span className="flex gap-0.5 items-center">
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

          {/* Form */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-theme-border bg-theme-card flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask RideMate..."
              className="flex-1 bg-theme-bg border border-theme-border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-brand-emerald text-theme-text-primary font-medium"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="w-9 h-9 rounded-xl bg-brand-emerald hover:bg-brand-emerald-dark disabled:bg-theme-bg disabled:text-theme-text-secondary/50 text-white flex items-center justify-center transition shrink-0 shadow-sm cursor-pointer border-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

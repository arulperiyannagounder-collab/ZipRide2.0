import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000); // Auto-dismiss after 4 seconds
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      
      {/* Toast container: top-right fixed positioning with stack */}
      <div className="fixed top-6 right-6 z-9999 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => {
          let bgClass = 'bg-white/90 border-slate-200 text-slate-800';
          let Icon = Info;
          let iconColor = 'text-blue-500';

          if (toast.type === 'success') {
            bgClass = 'bg-emerald-50/95 border-emerald-200 text-emerald-800';
            Icon = CheckCircle;
            iconColor = 'text-emerald-500';
          } else if (toast.type === 'warning') {
            bgClass = 'bg-amber-50/95 border-amber-200 text-amber-800';
            Icon = AlertTriangle;
            iconColor = 'text-amber-500';
          } else if (toast.type === 'error') {
            bgClass = 'bg-rose-50/95 border-rose-200 text-rose-800';
            Icon = AlertCircle;
            iconColor = 'text-rose-500';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg backdrop-blur-md transition-all duration-300 animate-slide-in-right ${bgClass}`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${iconColor} mt-0.5`} />
              <div className="flex-1 text-xs font-semibold leading-relaxed">
                {toast.message}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 transition shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

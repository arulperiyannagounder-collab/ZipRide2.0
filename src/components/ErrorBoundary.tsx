import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught runtime error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-theme-bg flex items-center justify-center p-6 text-center">
          <div className="bg-theme-card border border-theme-border rounded-3xl p-8 max-w-md w-full shadow-lg space-y-6">
            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto animate-bounce">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-theme-text-primary">Something Went Wrong</h3>
              <p className="text-xs text-slate-505 text-theme-text-secondary leading-relaxed">
                An unexpected interface crash occurred. We have logged the error details internally.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-theme-bg rounded-2xl p-4 border border-theme-border text-left text-[11px] font-mono text-theme-text-secondary overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full py-3.5 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class RootErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Pearlexperiences application error caught:', error, errorInfo);
    this.setState({ errorInfo });

    // Check if auto-recovery hasn't run yet in this session to prevent reload loops
    const autoRecovered = sessionStorage.getItem('px_auto_recovered');
    if (!autoRecovered) {
      sessionStorage.setItem('px_auto_recovered', 'true');
      try {
        localStorage.clear();
      } catch (_) {}
      window.location.reload();
    }
  }

  private handleReturnToApp = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-5 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-white p-2 border border-stone-700 flex items-center justify-center mx-auto shadow-md">
              <img src="/logo.png" alt="Pearlexperiences Logo" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold tracking-tight">Pearl Experience ERP</h1>
              <p className="text-xs text-stone-400">
                Recovering system session. Click below to continue directly to login.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={this.handleReturnToApp}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors shadow-lg"
              >
                Continue to Pearl Experience
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);

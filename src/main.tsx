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
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}
    window.location.reload();
  };

  private copyErrorDetails = () => {
    const errorText = `Pearlexperiences Error:\n${this.state.error?.name || 'Error'}: ${this.state.error?.message || 'Unknown'}\n\nStack:\n${this.state.error?.stack || 'No stack'}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || 'No component stack'}`;
    navigator.clipboard?.writeText(errorText).then(() => {
      alert('Error details copied to clipboard!');
    }).catch(() => {
      alert(errorText);
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-xl w-full bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-white p-1 border border-stone-700 flex items-center justify-center mx-auto shadow-md">
              <img src="/logo.png" alt="Pearlexperiences Logo" className="w-full h-full object-contain" />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-xl font-bold tracking-tight">Pearlexperiences ERP</h1>
              <p className="text-xs text-stone-400">
                The application encountered an unexpected client state. Click below to reload or reset cached local data.
              </p>
            </div>

            {/* Diagnostic Alert Box */}
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-left text-xs text-red-200 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5 text-red-300">
                <span>⚠ Error Caught:</span>
              </div>
              <p className="font-mono text-[11px] break-words text-red-100">
                {this.state.error?.message || 'An unexpected client-side exception occurred.'}
              </p>
            </div>

            {/* Collapsible Details */}
            {this.state.error?.stack && (
              <details className="text-left text-xs bg-stone-950/80 p-3 rounded-xl border border-stone-800/80 text-stone-400">
                <summary className="cursor-pointer text-[11px] font-semibold text-stone-300 hover:text-white select-none">
                  Show Technical Trace Details
                </summary>
                <pre className="mt-2 text-[10px] font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto text-stone-400">
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex flex-wrap gap-2.5 justify-center pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 active:bg-stone-900 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 transition-colors"
              >
                Reset All Cache & Relogin
              </button>
              <button
                type="button"
                onClick={this.copyErrorDetails}
                className="px-3 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 text-xs rounded-xl border border-stone-700/60 transition-colors"
                title="Copy error details to clipboard"
              >
                Copy Details
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

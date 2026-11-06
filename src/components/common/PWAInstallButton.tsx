import React from 'react';
import { Download, Smartphone, CheckCircle, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'pill';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstalled, installPWA, showIOSInstructions, setShowIOSInstructions } = usePWAInstall();

  // If already running standalone on home screen, show a subtle "Installed" indicator or hide
  if (isInstalled && variant === 'header') {
    return (
      <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>App Installed</span>
      </div>
    );
  }

  return (
    <>
      {variant === 'header' && (
        <button
          type="button"
          onClick={installPWA}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 rounded-lg shadow-sm transition-all active:scale-95 border border-emerald-600/50 min-h-[38px] ${className}`}
          title="Download and install Pearlexperiences as a mobile/desktop app"
        >
          <Download className="w-3.5 h-3.5 animate-bounce" />
          <span>Download App</span>
        </button>
      )}

      {variant === 'pill' && (
        <button
          type="button"
          onClick={installPWA}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-900 dark:text-emerald-200 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 transition-colors shadow-2xs ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install PWA App</span>
        </button>
      )}

      {variant === 'banner' && !isInstalled && (
        <div className={`p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950 to-stone-900 border border-emerald-800/80 text-white shadow-sm flex items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-700/80 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Smartphone className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <span>Install Pearlexperiences App</span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">PWA</span>
              </div>
              <p className="text-[11px] text-stone-300 mt-0.5">
                Install on your phone or desktop for 1-tap offline-ready access.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={installPWA}
            className="shrink-0 px-3 py-1.5 text-xs font-bold text-stone-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install Now</span>
          </button>
        </div>
      )}

      {/* iOS Safari Installation Guidance Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Install on iOS (iPhone / iPad)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSInstructions(false)}
                className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-700 dark:text-stone-300">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  Tap the <strong>Share</strong> button at the bottom of Safari:
                  <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-400">
                    <Share className="w-3.5 h-3.5" />
                    <span>Share Icon (Square with upward arrow)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  Scroll down the menu and tap:
                  <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-400">
                    <PlusSquare className="w-3.5 h-3.5" />
                    <span>Add to Home Screen</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  Tap <strong>Add</strong> in the top right corner. The Pearlexperiences icon will appear on your Home Screen!
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSInstructions(false)}
              className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

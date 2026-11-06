import { useState, useEffect } from 'react';

export interface PWAInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  installPWA: () => Promise<boolean>;
  showIOSInstructions: boolean;
  setShowIOSInstructions: (show: boolean) => void;
}

let globalDeferredPrompt: any = null;

export const usePWAInstall = (): PWAInstallState => {
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isAppleDevice);

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('PWA service worker registration notice:', err);
        });
      });
    }

    // Capture install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e;
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Handle when app is successfully installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      globalDeferredPrompt = null;
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    if (globalDeferredPrompt) {
      setCanInstall(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = async (): Promise<boolean> => {
    if (isInstalled) {
      alert('Pearlexperiences ERP is already installed on your device.');
      return true;
    }

    if (isIOS) {
      setShowIOSInstructions(true);
      return false;
    }

    if (globalDeferredPrompt) {
      try {
        globalDeferredPrompt.prompt();
        const { outcome } = await globalDeferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setCanInstall(false);
          globalDeferredPrompt = null;
          return true;
        }
      } catch (err) {
        console.warn('PWA prompt error:', err);
      }
    } else {
      // If prompt not available yet (browser auto-gates or desktop instructions)
      alert(
        'To install Pearlexperiences as an app on your phone or desktop:\n\n' +
        '• Chrome/Edge: Tap the Install icon (⬇) in the browser address bar or Menu (⋮) → "Install app".\n' +
        '• Safari (iOS): Tap the Share button (⬆) and select "Add to Home Screen".'
      );
    }
    return false;
  };

  return {
    canInstall,
    isInstalled,
    isIOS,
    installPWA,
    showIOSInstructions,
    setShowIOSInstructions,
  };
};


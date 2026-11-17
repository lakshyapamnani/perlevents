/**
 * Location Tracking Service for Pearl Experiences ERP
 * Optimized for minimal bandwidth consumption, reduced hosting storage,
 * PWA background tracking keep-alive, and sound + vibration alerts on removal from background.
 */
import { ref, onValue, off, set, get } from 'firebase/database';
import { database, isFirebaseConfigured } from './firebase';

export interface LiveLocationRecord {
  userId: string;
  fullName: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  isSharing: boolean;
  lastUpdated: number;
  error?: string | null;
}

export type SalespersonLocationStatus = 'sharing' | 'stale' | 'stopped' | 'denied';

// Optimization Constants:
export const STALE_LOCATION_THRESHOLD_MS = 4 * 60 * 1000;
const STATIONARY_HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000;
const MOVING_MIN_INTERVAL_MS = 45 * 1000;
const MIN_MOVEMENT_DISTANCE_METERS = 25;
const MAX_CONTINUOUS_TRACKING_MS = 8 * 60 * 60 * 1000;

/**
 * Triggers hardware vibration pattern on supported mobile devices
 */
export function triggerAlertVibration(pattern: number[] = [400, 200, 400, 200, 600]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (e) {
    console.warn('Vibration could not trigger:', e);
  }
}

/**
 * Synthesizes an audible warning alarm tone using Web Audio API
 */
export function playAlertSound(volume = 0.5) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Beep 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(volume, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Beep 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(880, now + 0.25);
    gain2.gain.setValueAtTime(volume, now + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.43);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.25);
    osc2.stop(now + 0.45);

    // Alert Tone 3
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(1320, now + 0.5);
    osc3.frequency.exponentialRampToValueAtTime(440, now + 0.95);
    gain3.gain.setValueAtTime(volume, now + 0.5);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.98);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.5);
    osc3.stop(now + 1.0);
  } catch (e) {
    console.warn('Could not synthesize alert audio:', e);
  }
}

/**
 * Inaudible silent audio oscillator loop.
 * In PWAs and mobile browsers (iOS Safari, Android Chrome), playing audio flags
 * the web app as an active background media task, which prevents the OS power manager
 * from freezing the process and allows navigator.geolocation.watchPosition to continue
 * broadcasting in the background.
 */
class SilentAudioKeepAlive {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;

  start() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.osc = this.ctx.createOscillator();
      this.gain = this.ctx.createGain();
      // Inaudible 20Hz tone at near-zero gain
      this.osc.frequency.setValueAtTime(20, this.ctx.currentTime);
      this.gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.osc.connect(this.gain);
      this.gain.connect(this.ctx.destination);
      this.osc.start();
    } catch (e) {
      console.warn('Could not start silent audio keep-alive:', e);
    }
  }

  stop() {
    try {
      this.osc?.stop();
      this.ctx?.close();
    } catch (_) {}
    this.ctx = null;
    this.osc = null;
    this.gain = null;
  }
}

/**
 * Rounds coordinate to 5 decimal places (~1.1 meter accuracy)
 */
function roundCoord(val: number): number {
  return Math.round(val * 100000) / 100000;
}

/**
 * Calculates distance between two coordinates in meters
 */
function getDistanceFromLatLonInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

class LocationTracker {
  private watchId: number | null = null;
  private backgroundIntervalId: any = null;
  private currentUserId: string | null = null;
  private currentUserFullName: string = '';
  private lastSentTime: number = 0;
  private lastSentLat: number | null = null;
  private lastSentLng: number | null = null;
  private isCurrentlySharing: boolean = false;
  private lifecycleBound: boolean = false;
  private autoStopTimer: any = null;
  private wakeLockSentinel: any = null;
  private audioKeepAlive = new SilentAudioKeepAlive();
  private listeners: Set<(status: { isSharing: boolean; lastUpdated?: number; accuracy?: number; error?: string | null }) => void> = new Set();

  constructor() {
    this.handlePageHide = this.handlePageHide.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleFreeze = this.handleFreeze.bind(this);
  }

  public subscribeStatus(listener: (status: { isSharing: boolean; lastUpdated?: number; accuracy?: number; error?: string | null }) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(status: { isSharing: boolean; lastUpdated?: number; accuracy?: number; error?: string | null }) {
    this.listeners.forEach((cb) => cb(status));
  }

  public getIsSharing(): boolean {
    return this.isCurrentlySharing;
  }

  /**
   * Called when app is removed from background or page is unloaded / frozen / closed
   */
  private handlePageHide() {
    if (this.isCurrentlySharing && this.currentUserId) {
      // User or OS swiped away/removed the app from background!
      // 1. Play audible alert tone
      playAlertSound();
      // 2. Vibrate mobile hardware
      triggerAlertVibration([400, 200, 400, 200, 600]);

      // 3. Persist removal flag in localStorage so when re-opened, user is alerted
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          'perlevents_tracking_swiped_away',
          JSON.stringify({
            userId: this.currentUserId,
            fullName: this.currentUserFullName,
            timestamp: Date.now(),
          })
        );
      }
    }
  }

  private handleFreeze() {
    if (this.isCurrentlySharing) {
      playAlertSound();
      triggerAlertVibration([400, 200, 400, 200, 600]);
    }
  }

  /**
   * Called when app transitions between foreground & background
   */
  private handleVisibilityChange() {
    if (typeof document === 'undefined') return;

    if (document.visibilityState === 'visible') {
      // Check if tracking was previously interrupted / swiped away
      if (typeof localStorage !== 'undefined') {
        const swiped = localStorage.getItem('perlevents_tracking_swiped_away');
        if (swiped) {
          localStorage.removeItem('perlevents_tracking_swiped_away');
          // Alert user that tracking was paused/interrupted
          playAlertSound(0.7);
          triggerAlertVibration([300, 150, 300, 150, 500]);
          this.notifyListeners({
            isSharing: this.isCurrentlySharing,
            error: 'Alert: App was removed from background. Location tracking is active and syncing.',
          });
        }
      }

      // Re-acquire fresh coordinates immediately on return to foreground
      if (this.isCurrentlySharing && this.currentUserId) {
        this.requestSingleLocationUpdate();
      }
    }
  }

  /**
   * Starts tracking and sharing position to Firebase RTDB with PWA background support
   */
  public async startSharing(userId: string, fullName: string): Promise<{ success: boolean; error?: string }> {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      const err = 'Geolocation is not supported by your browser or device.';
      this.notifyListeners({ isSharing: false, error: err });
      return { success: false, error: err };
    }

    this.currentUserId = userId;
    this.currentUserFullName = fullName;

    // Attach lifecycle listeners once
    if (!this.lifecycleBound && typeof window !== 'undefined') {
      window.addEventListener('pagehide', this.handlePageHide);
      window.addEventListener('beforeunload', this.handlePageHide);
      document.addEventListener('freeze', this.handleFreeze);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      this.lifecycleBound = true;
    }

    // Clear existing watch if any
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.backgroundIntervalId) {
      clearInterval(this.backgroundIntervalId);
      this.backgroundIntervalId = null;
    }

    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
    }

    // Start silent audio keep-alive to enable background location on mobile PWAs
    this.audioKeepAlive.start();

    // Try acquiring Screen WakeLock if available
    try {
      if ('wakeLock' in navigator && (navigator as any).wakeLock) {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      }
    } catch (_) {}

    // Safety auto-stop after 8 hours
    this.autoStopTimer = setTimeout(() => {
      if (this.isCurrentlySharing) {
        this.stopSharing();
        this.notifyListeners({
          isSharing: false,
          error: 'Location sharing auto-stopped after 8 hours to conserve battery & bandwidth.',
        });
      }
    }, MAX_CONTINUOUS_TRACKING_MS);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          this.isCurrentlySharing = true;
          const { latitude, longitude, accuracy } = position.coords;
          const now = Date.now();

          const roundedLat = roundCoord(latitude);
          const roundedLng = roundCoord(longitude);

          await this.writeLocationToFirebase({
            userId,
            fullName,
            latitude: roundedLat,
            longitude: roundedLng,
            accuracy: Math.round(accuracy),
            isSharing: true,
            lastUpdated: now,
          });

          this.lastSentTime = now;
          this.lastSentLat = roundedLat;
          this.lastSentLng = roundedLng;

          this.notifyListeners({
            isSharing: true,
            lastUpdated: now,
            accuracy: Math.round(accuracy),
            error: null,
          });

          // 1. Continuous watchPosition
          this.startWatchPosition();

          // 2. Periodic background fallback poller (ensures background location keeps firing in PWA)
          this.startBackgroundPoller();

          resolve({ success: true });
        },
        async (error) => {
          this.isCurrentlySharing = false;
          this.audioKeepAlive.stop();

          let errorMessage = 'Failed to get location';
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'Location permission was denied. Please allow location access in your browser settings.';
            playAlertSound();
            triggerAlertVibration([300, 150, 300]);
            await this.writeLocationToFirebase({
              userId,
              fullName,
              isSharing: false,
              lastUpdated: Date.now(),
              error: 'PERMISSION_DENIED',
            });
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = 'GPS position is currently unavailable.';
          } else if (error.code === error.TIMEOUT) {
            errorMessage = 'Location request timed out. Please try again.';
          }

          this.notifyListeners({
            isSharing: false,
            error: errorMessage,
          });
          resolve({ success: false, error: errorMessage });
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  /**
   * Continuous Watch with Adaptive Bandwidth-Saving Logic
   */
  private startWatchPosition() {
    if (!navigator.geolocation || !this.currentUserId) return;

    this.watchId = navigator.geolocation.watchPosition(
      async (position) => {
        if (!this.isCurrentlySharing || !this.currentUserId) return;

        const { latitude, longitude, accuracy } = position.coords;
        const now = Date.now();
        const timeSinceLastSent = now - this.lastSentTime;

        const roundedLat = roundCoord(latitude);
        const roundedLng = roundCoord(longitude);

        let distanceMoved = 0;
        if (this.lastSentLat !== null && this.lastSentLng !== null) {
          distanceMoved = getDistanceFromLatLonInMeters(
            this.lastSentLat,
            this.lastSentLng,
            roundedLat,
            roundedLng
          );
        }

        const isSignificantMove = distanceMoved >= MIN_MOVEMENT_DISTANCE_METERS;
        let shouldWrite = false;

        if (isSignificantMove && timeSinceLastSent >= MOVING_MIN_INTERVAL_MS) {
          shouldWrite = true;
        } else if (!isSignificantMove && timeSinceLastSent >= STATIONARY_HEARTBEAT_INTERVAL_MS) {
          shouldWrite = true;
        }

        if (shouldWrite) {
          await this.writeLocationToFirebase({
            userId: this.currentUserId,
            fullName: this.currentUserFullName,
            latitude: roundedLat,
            longitude: roundedLng,
            accuracy: Math.round(accuracy),
            isSharing: true,
            lastUpdated: now,
          });

          this.lastSentTime = now;
          this.lastSentLat = roundedLat;
          this.lastSentLng = roundedLng;

          this.notifyListeners({
            isSharing: true,
            lastUpdated: now,
            accuracy: Math.round(accuracy),
            error: null,
          });
        }
      },
      (error) => {
        console.warn('Geolocation watchPosition notification:', error.message);
        if (error.code === error.PERMISSION_DENIED) {
          playAlertSound();
          triggerAlertVibration([500, 200, 500]);
          this.stopSharing();
          this.notifyListeners({
            isSharing: false,
            error: 'Location permission was revoked.',
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 15000,
      }
    );
  }

  /**
   * Periodic background fallback poller:
   * Fires every 60 seconds to ensure coordinates keep transmitting even if OS throttles watchPosition
   */
  private startBackgroundPoller() {
    if (this.backgroundIntervalId) {
      clearInterval(this.backgroundIntervalId);
    }

    this.backgroundIntervalId = setInterval(() => {
      if (this.isCurrentlySharing && this.currentUserId) {
        this.requestSingleLocationUpdate();
      }
    }, 60000);
  }

  private requestSingleLocationUpdate() {
    if (!navigator.geolocation || !this.currentUserId || !this.isCurrentlySharing) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const now = Date.now();
        const roundedLat = roundCoord(latitude);
        const roundedLng = roundCoord(longitude);

        let distanceMoved = 0;
        if (this.lastSentLat !== null && this.lastSentLng !== null) {
          distanceMoved = getDistanceFromLatLonInMeters(
            this.lastSentLat,
            this.lastSentLng,
            roundedLat,
            roundedLng
          );
        }

        if (distanceMoved >= MIN_MOVEMENT_DISTANCE_METERS || now - this.lastSentTime >= STATIONARY_HEARTBEAT_INTERVAL_MS) {
          await this.writeLocationToFirebase({
            userId: this.currentUserId!,
            fullName: this.currentUserFullName,
            latitude: roundedLat,
            longitude: roundedLng,
            accuracy: Math.round(accuracy),
            isSharing: true,
            lastUpdated: now,
          });

          this.lastSentTime = now;
          this.lastSentLat = roundedLat;
          this.lastSentLng = roundedLng;

          this.notifyListeners({
            isSharing: true,
            lastUpdated: now,
            accuracy: Math.round(accuracy),
            error: null,
          });
        }
      },
      (err) => {
        console.warn('Background poller position error:', err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 20000,
      }
    );
  }

  /**
   * Stops sharing location cleanly
   */
  public async stopSharing(): Promise<void> {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.backgroundIntervalId) {
      clearInterval(this.backgroundIntervalId);
      this.backgroundIntervalId = null;
    }

    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }

    // Stop silent audio keep-alive
    this.audioKeepAlive.stop();

    // Release wake lock
    try {
      this.wakeLockSentinel?.release();
      this.wakeLockSentinel = null;
    } catch (_) {}

    this.isCurrentlySharing = false;

    if (this.currentUserId) {
      try {
        await this.writeLocationToFirebase({
          userId: this.currentUserId,
          fullName: this.currentUserFullName,
          isSharing: false,
          lastUpdated: Date.now(),
        });
      } catch (err) {
        console.warn('Error updating stopped location status:', err);
      }
    }

    this.notifyListeners({
      isSharing: false,
      lastUpdated: Date.now(),
      error: null,
    });
  }

  /**
   * Minimal Payload Writer
   */
  private async writeLocationToFirebase(data: LiveLocationRecord): Promise<boolean> {
    if (!database || !isFirebaseConfigured() || !data.userId) return false;
    try {
      const nodeRef = ref(database, `liveLocations/${data.userId}`);
      
      const payload: Record<string, any> = {
        userId: data.userId,
        fullName: data.fullName,
        isSharing: data.isSharing,
        lastUpdated: data.lastUpdated,
      };

      if (data.isSharing && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        payload.latitude = data.latitude;
        payload.longitude = data.longitude;
        payload.accuracy = data.accuracy || 15;
      }

      if (data.error) {
        payload.error = data.error;
      }

      await set(nodeRef, payload);
      return true;
    } catch (err) {
      console.warn('Failed to write location to Firebase RTDB:', err);
      return false;
    }
  }
}

export const locationTracker = new LocationTracker();

/**
 * Subscribes to all live locations in Firebase RTDB (for Admin & Partner views)
 */
export function subscribeToAllLiveLocations(
  callback: (locations: Record<string, LiveLocationRecord>) => void
): () => void {
  if (!database || !isFirebaseConfigured()) {
    callback({});
    return () => {};
  }

  try {
    const locationsRef = ref(database, 'liveLocations');
    const listener = onValue(
      locationsRef,
      (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          callback(val as Record<string, LiveLocationRecord>);
        } else {
          callback({});
        }
      },
      (error) => {
        console.warn('Realtime liveLocations listener error:', error.message);
      }
    );

    return () => off(locationsRef, 'value', listener);
  } catch (err) {
    console.warn('Failed setting up liveLocations listener:', err);
    return () => {};
  }
}

/**
 * Fetch initial live locations directly from Firebase RTDB
 */
export async function getLiveLocationsSnapshot(): Promise<Record<string, LiveLocationRecord>> {
  if (!database || !isFirebaseConfigured()) return {};
  try {
    const locationsRef = ref(database, 'liveLocations');
    const snap = await get(locationsRef);
    if (snap.exists()) {
      return (snap.val() || {}) as Record<string, LiveLocationRecord>;
    }
    return {};
  } catch (err) {
    console.warn('Error fetching liveLocations snapshot:', err);
    return {};
  }
}

/**
 * Determines real-time salesperson location status
 */
export function computeLocationStatus(record?: LiveLocationRecord): SalespersonLocationStatus {
  if (!record) return 'stopped';
  if (record.error === 'PERMISSION_DENIED') return 'denied';
  if (!record.isSharing) return 'stopped';

  const ageMs = Date.now() - record.lastUpdated;
  if (ageMs > STALE_LOCATION_THRESHOLD_MS) {
    return 'stale';
  }
  return 'sharing';
}

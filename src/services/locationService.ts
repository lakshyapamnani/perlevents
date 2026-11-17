/**
 * Location Tracking Service for Pearl Experiences ERP
 * Optimized for minimal bandwidth consumption, reduced hosting storage,
 * and smart battery-friendly adaptive GPS updates.
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
// 1. Staleness threshold: 4 minutes
export const STALE_LOCATION_THRESHOLD_MS = 4 * 60 * 1000;

// 2. Stationary Heartbeat: If salesperson hasn't moved (>25m), only ping once every 3 minutes
const STATIONARY_HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000;

// 3. Moving Interval: When actively moving, limit updates to once every 45 seconds
const MOVING_MIN_INTERVAL_MS = 45 * 1000;

// 4. Movement Threshold: Ignore jitter/drift under 25 meters
const MIN_MOVEMENT_DISTANCE_METERS = 25;

// 5. Auto-Stop Safety Limit: 8 hours maximum continuous session to prevent overnight data burn
const MAX_CONTINUOUS_TRACKING_MS = 8 * 60 * 60 * 1000;

/**
 * Rounds coordinate to 5 decimal places (~1.1 meter accuracy)
 * Eliminates redundant 10+ digits of float string overhead in JSON storage and network packets
 */
function roundCoord(val: number): number {
  return Math.round(val * 100000) / 100000;
}

/**
 * Calculates distance between two coordinates in meters using Haversine formula
 */
function getDistanceFromLatLonInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of the earth in meters
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
  private currentUserId: string | null = null;
  private currentUserFullName: string = '';
  private sessionStartTime: number = 0;
  private lastSentTime: number = 0;
  private lastSentLat: number | null = null;
  private lastSentLng: number | null = null;
  private isCurrentlySharing: boolean = false;
  private unloadBound: boolean = false;
  private autoStopTimer: any = null;
  private listeners: Set<(status: { isSharing: boolean; lastUpdated?: number; accuracy?: number; error?: string | null }) => void> = new Set();

  constructor() {
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
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

  private handleBeforeUnload() {
    if (this.isCurrentlySharing && this.currentUserId) {
      // Best-effort stop on page close to avoid orphaned "sharing" state
      this.stopSharing();
    }
  }

  /**
   * Starts tracking and sharing position to Firebase RTDB
   */
  public async startSharing(userId: string, fullName: string): Promise<{ success: boolean; error?: string }> {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      const err = 'Geolocation is not supported by your browser or device.';
      this.notifyListeners({ isSharing: false, error: err });
      return { success: false, error: err };
    }

    this.currentUserId = userId;
    this.currentUserFullName = fullName;
    this.sessionStartTime = Date.now();

    // Attach unload listener once
    if (!this.unloadBound && typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
      this.unloadBound = true;
    }

    // Clear existing watch if any
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
    }

    // Safety auto-stop after 8 hours (prevents battery drain & data waste if forgotten)
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

          this.startWatchPosition();
          resolve({ success: true });
        },
        async (error) => {
          this.isCurrentlySharing = false;
          let errorMessage = 'Failed to get location';
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'Location permission was denied. Please allow location access in your browser settings.';
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

        // Case 1: Significant movement (>= 25m) and at least 45 seconds elapsed
        if (isSignificantMove && timeSinceLastSent >= MOVING_MIN_INTERVAL_MS) {
          shouldWrite = true;
        }
        // Case 2: Stationary (< 25m), send low-frequency heartbeat every 3 minutes to keep connection alive
        else if (!isSignificantMove && timeSinceLastSent >= STATIONARY_HEARTBEAT_INTERVAL_MS) {
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
   * Stops sharing location and strips unnecessary coordinate payload from storage
   */
  public async stopSharing(): Promise<void> {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }

    this.isCurrentlySharing = false;

    if (this.currentUserId) {
      try {
        // Bandwidth & Storage saving: omit coordinates when stopped
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
   * Minimal Payload Writer: Only saves defined non-null fields to Firebase RTDB
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
 * Subscribes to all live locations in Firebase RTDB (for Admin view)
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

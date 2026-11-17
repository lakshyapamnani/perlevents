/**
 * Location Tracking Service for Pearl Experiences ERP
 * Handles salesperson GPS tracking and Firebase Realtime Database sync.
 */
import { ref, onValue, off, set, get } from 'firebase/database';
import { database, isFirebaseConfigured } from './firebase';

export interface LiveLocationRecord {
  userId: string;
  fullName: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  isSharing: boolean;
  lastUpdated: number;
  error?: string | null;
}

export type SalespersonLocationStatus = 'sharing' | 'stale' | 'stopped' | 'denied';

export const STALE_LOCATION_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
const THROTTLE_MIN_INTERVAL_MS = 30 * 1000; // 30 seconds
const MIN_DISTANCE_METERS = 15; // 15 meters for early update

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
  private lastSentTime: number = 0;
  private lastSentLat: number | null = null;
  private lastSentLng: number | null = null;
  private isCurrentlySharing: boolean = false;
  private listeners: Set<(status: { isSharing: boolean; lastUpdated?: number; accuracy?: number; error?: string | null }) => void> = new Set();

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

    // Check existing watch
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    return new Promise((resolve) => {
      // First obtain current position immediately to verify permission
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          this.isCurrentlySharing = true;
          const { latitude, longitude, accuracy } = position.coords;
          const now = Date.now();

          await this.writeLocationToFirebase({
            userId,
            fullName,
            latitude,
            longitude,
            accuracy: Math.round(accuracy),
            isSharing: true,
            lastUpdated: now,
          });

          this.lastSentTime = now;
          this.lastSentLat = latitude;
          this.lastSentLng = longitude;

          this.notifyListeners({
            isSharing: true,
            lastUpdated: now,
            accuracy: Math.round(accuracy),
            error: null,
          });

          // Start watchPosition for continuous updates
          this.startWatchPosition();
          resolve({ success: true });
        },
        async (error) => {
          this.isCurrentlySharing = false;
          let errorMessage = 'Failed to get location';
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'Location permission was denied. Please allow location access in your browser settings.';
            // Record permission denied in Firebase so Admin sees it
            await this.writeLocationToFirebase({
              userId,
              fullName,
              latitude: 0,
              longitude: 0,
              accuracy: 0,
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

  private startWatchPosition() {
    if (!navigator.geolocation || !this.currentUserId) return;

    this.watchId = navigator.geolocation.watchPosition(
      async (position) => {
        if (!this.isCurrentlySharing || !this.currentUserId) return;

        const { latitude, longitude, accuracy } = position.coords;
        const now = Date.now();
        const timeSinceLastSent = now - this.lastSentTime;

        let shouldUpdate = false;

        // Force update if interval exceeds 30-60 seconds
        if (timeSinceLastSent >= THROTTLE_MIN_INTERVAL_MS) {
          shouldUpdate = true;
        } else if (
          this.lastSentLat !== null &&
          this.lastSentLng !== null &&
          getDistanceFromLatLonInMeters(this.lastSentLat, this.lastSentLng, latitude, longitude) >= MIN_DISTANCE_METERS &&
          timeSinceLastSent >= 10000
        ) {
          // Meaningful movement of >= 15 meters and at least 10s elapsed
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          await this.writeLocationToFirebase({
            userId: this.currentUserId,
            fullName: this.currentUserFullName,
            latitude,
            longitude,
            accuracy: Math.round(accuracy),
            isSharing: true,
            lastUpdated: now,
          });

          this.lastSentTime = now;
          this.lastSentLat = latitude;
          this.lastSentLng = longitude;

          this.notifyListeners({
            isSharing: true,
            lastUpdated: now,
            accuracy: Math.round(accuracy),
            error: null,
          });
        }
      },
      (error) => {
        console.warn('Geolocation watchPosition error:', error.message);
        if (error.code === error.PERMISSION_DENIED) {
          this.stopSharing();
          this.notifyListeners({
            isSharing: false,
            error: 'Location permission denied by browser.',
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
   * Stops sharing location and marks status in Firebase
   */
  public async stopSharing(): Promise<void> {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.isCurrentlySharing = false;

    if (this.currentUserId) {
      try {
        await this.writeLocationToFirebase({
          userId: this.currentUserId,
          fullName: this.currentUserFullName,
          latitude: this.lastSentLat || 0,
          longitude: this.lastSentLng || 0,
          accuracy: 0,
          isSharing: false,
          lastUpdated: Date.now(),
        });
      } catch (err) {
        console.warn('Error marking location stopped in Firebase:', err);
      }
    }

    this.notifyListeners({
      isSharing: false,
      lastUpdated: Date.now(),
      error: null,
    });
  }

  private async writeLocationToFirebase(data: LiveLocationRecord): Promise<boolean> {
    if (!database || !isFirebaseConfigured() || !data.userId) return false;
    try {
      const nodeRef = ref(database, `liveLocations/${data.userId}`);
      await set(nodeRef, {
        userId: data.userId,
        fullName: data.fullName,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        isSharing: data.isSharing,
        lastUpdated: data.lastUpdated,
        error: data.error || null,
      });
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

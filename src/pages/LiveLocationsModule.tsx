import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LiveLocationRecord,
  subscribeToAllLiveLocations,
  computeLocationStatus,
  SalespersonLocationStatus,
  STALE_LOCATION_THRESHOLD_MS,
} from '../services/locationService';
import {
  MapPin,
  Radio,
  Clock,
  MapPinOff,
  Search,
  ExternalLink,
  Navigation,
  Compass,
  AlertTriangle,
  RefreshCw,
  Eye,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet icon paths in Vite/bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function formatLastUpdated(timestamp?: number): string {
  if (!timestamp) return 'Never';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return new Date(timestamp).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const LiveLocationsModule: React.FC = () => {
  const { allUsersList } = useAuth();
  const [locations, setLocations] = useState<Record<string, LiveLocationRecord>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sharing' | 'stale' | 'stopped'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [, setTicker] = useState<number>(0);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  // 1. Subscribe to Firebase liveLocations
  useEffect(() => {
    const unsubscribe = subscribeToAllLiveLocations((liveData) => {
      setLocations(liveData || {});
    });

    // Re-check staleness every 15 seconds
    const interval = setInterval(() => {
      setTicker((prev) => prev + 1);
    }, 15000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Filter salespersons
  const salespersons = useMemo(() => {
    return allUsersList.filter((u) => u.role === 'salesperson');
  }, [allUsersList]);

  // Merge salesperson user profiles with live location records
  const salespersonLocationData = useMemo(() => {
    return salespersons.map((sp) => {
      const loc = locations[sp.uid];
      const status: SalespersonLocationStatus = computeLocationStatus(loc);
      return {
        profile: sp,
        location: loc,
        status,
      };
    });
  }, [salespersons, locations]);

  // Summary counts
  const summary = useMemo(() => {
    let total = salespersonLocationData.length;
    let sharing = 0;
    let stale = 0;
    let stopped = 0;

    salespersonLocationData.forEach((item) => {
      if (item.status === 'sharing') sharing++;
      else if (item.status === 'stale') stale++;
      else stopped++;
    });

    return { total, sharing, stale, stopped };
  }, [salespersonLocationData]);

  // Filtered salespersons by search and status
  const filteredSalespersons = useMemo(() => {
    return salespersonLocationData.filter((item) => {
      const matchesSearch =
        item.profile.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.profile.email && item.profile.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.profile.phone && item.profile.phone.includes(searchQuery));

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'sharing') return item.status === 'sharing';
      if (statusFilter === 'stale') return item.status === 'stale';
      if (statusFilter === 'stopped') return item.status === 'stopped' || item.status === 'denied';

      return true;
    });
  }, [salespersonLocationData, searchQuery, statusFilter]);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center on India / Mumbai region
    const defaultLat = 19.1136;
    const defaultLng = 72.8697;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 11,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
    };
  }, []);

  // Create custom marker icon
  const createMarkerIcon = (
    fullName: string,
    status: SalespersonLocationStatus,
    isSelected: boolean
  ) => {
    const initials = fullName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const isLive = status === 'sharing';
    const isStale = status === 'stale';

    const bgClass = isLive
      ? 'bg-emerald-600 border-white'
      : isStale
      ? 'bg-amber-500 border-white'
      : 'bg-stone-500 border-white';

    const ringClass = isSelected
      ? 'ring-4 ring-emerald-400 ring-offset-2'
      : isLive
      ? 'shadow-lg shadow-emerald-500/40'
      : 'shadow-md';

    const pulseHtml = isLive
      ? `<span class="absolute -top-1 -right-1 flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
        </span>`
      : '';

    return L.divIcon({
      className: 'custom-salesperson-marker',
      html: `
        <div class="relative flex items-center justify-center">
          ${pulseHtml}
          <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 ${bgClass} ${ringClass} transition-transform transform hover:scale-110">
            ${initials}
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -22],
    });
  };

  // 3. Update Markers on Map when locations or selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkers = markersRef.current;
    const activeCoords: [number, number][] = [];

    // Process each salesperson with an active or stale location
    salespersonLocationData.forEach((item) => {
      const { profile, location, status } = item;
      const uid = profile.uid;

      // Only display markers for salespersons that have shared valid coordinates
      const hasCoords =
        location &&
        typeof location.latitude === 'number' &&
        typeof location.longitude === 'number' &&
        location.latitude !== 0 &&
        location.longitude !== 0 &&
        (status === 'sharing' || status === 'stale');

      if (hasCoords && location) {
        const lat = location.latitude;
        const lng = location.longitude;
        activeCoords.push([lat, lng]);

        const isSelected = selectedUserId === uid;
        const icon = createMarkerIcon(profile.fullName, status, isSelected);

        const statusLabel =
          status === 'sharing'
            ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">● Live Sharing</span>'
            : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">● Stale Location</span>';

        const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        const popupContent = `
          <div class="p-1 min-w-[210px] font-sans">
            <div class="flex items-center justify-between gap-2 border-b border-stone-200 pb-2 mb-2">
              <span class="font-bold text-sm text-stone-900">${profile.fullName}</span>
              ${statusLabel}
            </div>
            <div class="space-y-1 text-xs text-stone-600 mb-3">
              <div class="flex justify-between">
                <span class="text-stone-400">Accuracy:</span>
                <span class="font-semibold text-stone-800">±${location.accuracy || 15}m</span>
              </div>
              <div class="flex justify-between">
                <span class="text-stone-400">Last Update:</span>
                <span class="font-semibold text-stone-800">${formatLastUpdated(location.lastUpdated)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-stone-400">Coordinates:</span>
                <span class="font-mono text-[11px] text-stone-700">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
              </div>
            </div>
            <a 
              href="${googleMapsUrl}" 
              target="_blank" 
              rel="noopener noreferrer"
              class="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition-colors shadow-sm text-center no-underline"
            >
              <span>Open in Google Maps</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
            </a>
          </div>
        `;

        if (currentMarkers[uid]) {
          // Update existing marker
          currentMarkers[uid].setLatLng([lat, lng]);
          currentMarkers[uid].setIcon(icon);
          currentMarkers[uid].getPopup()?.setContent(popupContent);
        } else {
          // Create new marker
          const marker = L.marker([lat, lng], { icon })
            .bindTooltip(profile.fullName, {
              permanent: true,
              direction: 'top',
              offset: [0, -18],
              className: 'leaflet-salesperson-label',
            })
            .bindPopup(popupContent, { maxWidth: 280 })
            .addTo(map);

          marker.on('click', () => {
            setSelectedUserId(uid);
          });

          currentMarkers[uid] = marker;
        }
      } else {
        // Remove marker if salesperson is stopped/not sharing
        if (currentMarkers[uid]) {
          currentMarkers[uid].remove();
          delete currentMarkers[uid];
        }
      }
    });

    // Cleanup markers for removed users
    Object.keys(currentMarkers).forEach((uid) => {
      const stillValid = salespersonLocationData.some(
        (sp) => sp.profile.uid === uid && (sp.status === 'sharing' || sp.status === 'stale')
      );
      if (!stillValid) {
        currentMarkers[uid].remove();
        delete currentMarkers[uid];
      }
    });

    // Automatically fit all available markers if appropriate and no specific user was just selected
    if (activeCoords.length > 0 && !selectedUserId) {
      const bounds = L.latLngBounds(activeCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [salespersonLocationData, selectedUserId]);

  // Center on salesperson when clicked from the list
  const handleSelectSalesperson = (uid: string) => {
    setSelectedUserId(uid);
    const map = mapInstanceRef.current;
    const marker = markersRef.current[uid];
    const data = salespersonLocationData.find((d) => d.profile.uid === uid);

    if (map && marker && data?.location) {
      const lat = data.location.latitude;
      const lng = data.location.longitude;
      map.flyTo([lat, lng], 16, { duration: 1.2 });
      marker.openPopup();
    }
  };

  const activeSharingCount = summary.sharing;

  return (
    <div className="space-y-6 pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
              Live Salesperson Locations
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Tracking
            </span>
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Real-time GPS tracking of field sales team and banquet venue visits
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-500">
          <Compass className="w-4 h-4 text-emerald-600" />
          <span>Realtime Database Sync Active</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Salespersons */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Total Team
            </span>
            <div className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-0.5">
              {summary.total}
            </div>
            <span className="text-[11px] text-stone-400">Registered salespersons</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300">
            <Navigation className="w-5 h-5" />
          </div>
        </div>

        {/* Currently Sharing */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-emerald-200 dark:border-emerald-950/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              Sharing Location
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {summary.sharing}
            </div>
            <span className="text-[11px] text-emerald-600/70">Broadcasting live GPS</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Radio className="w-5 h-5" />
          </div>
        </div>

        {/* Location Stale */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-950/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
              Location Stale
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {summary.stale}
            </div>
            <span className="text-[11px] text-amber-600/70">&gt;2 mins without update</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Not Sharing */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Not Sharing
            </span>
            <div className="text-2xl font-black text-stone-600 dark:text-stone-300 mt-0.5">
              {summary.stopped}
            </div>
            <span className="text-[11px] text-stone-400">GPS inactive / stopped</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500">
            <MapPinOff className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Split Layout: Salesperson List on Left, Interactive Map on Right */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Section: Salesperson Cards List */}
        <div className="w-full lg:w-96 flex-shrink-0 space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search salesperson by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                }`}
              >
                All ({salespersonLocationData.length})
              </button>
              <button
                onClick={() => setStatusFilter('sharing')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  statusFilter === 'sharing'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                Live ({summary.sharing})
              </button>
              <button
                onClick={() => setStatusFilter('stale')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  statusFilter === 'stale'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                }`}
              >
                Stale ({summary.stale})
              </button>
              <button
                onClick={() => setStatusFilter('stopped')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  statusFilter === 'stopped'
                    ? 'bg-stone-600 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                }`}
              >
                Stopped ({summary.stopped})
              </button>
            </div>
          </div>

          {/* Salesperson Cards Scrollable List */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredSalespersons.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                <MapPinOff className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                  No salespersons found
                </p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Try adjusting your search or filter
                </p>
              </div>
            ) : (
              filteredSalespersons.map((item) => {
                const { profile, location, status } = item;
                const isSelected = selectedUserId === profile.uid;
                const initials = profile.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                const isSharing = status === 'sharing';
                const isStale = status === 'stale';
                const isDenied = status === 'denied';

                const hasLocation =
                  location &&
                  typeof location.latitude === 'number' &&
                  typeof location.longitude === 'number' &&
                  location.latitude !== 0 &&
                  location.longitude !== 0;

                return (
                  <div
                    key={profile.uid}
                    onClick={() => hasLocation && handleSelectSalesperson(profile.uid)}
                    className={`p-3.5 rounded-2xl border transition-all text-left ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20'
                        : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-700 shadow-sm'
                    } ${hasLocation ? 'cursor-pointer' : 'cursor-default opacity-85'}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSharing
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                              : isStale
                              ? 'bg-amber-500 text-white ring-2 ring-amber-400'
                              : isDenied
                              ? 'bg-rose-500 text-white ring-2 ring-rose-400'
                              : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {initials}
                        </div>
                        {isSharing && (
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white"></span>
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                            {profile.fullName}
                          </h4>
                          {/* Status Badge */}
                          {isSharing && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 whitespace-nowrap">
                              ● Sharing
                            </span>
                          )}
                          {isStale && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 whitespace-nowrap">
                              ● Stale
                            </span>
                          )}
                          {isDenied && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 whitespace-nowrap">
                              ● Denied
                            </span>
                          )}
                          {status === 'stopped' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 whitespace-nowrap">
                              Stopped
                            </span>
                          )}
                        </div>

                        {/* Last updated and accuracy */}
                        <div className="flex items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-stone-400" />
                            {formatLastUpdated(location?.lastUpdated)}
                          </span>
                          {hasLocation && location?.accuracy && (
                            <span className="flex items-center gap-1">
                              <Compass className="w-3 h-3 text-stone-400" />
                              ±{location.accuracy}m
                            </span>
                          )}
                        </div>

                        {/* Location Availability & Coordinates */}
                        {hasLocation ? (
                          <div className="mt-2 flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800/80">
                            <span className="text-[10px] text-stone-400 font-mono">
                              {location?.latitude.toFixed(4)}, {location?.longitude.toFixed(4)}
                            </span>
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 hover:underline">
                              <span>Focus on Map</span>
                              <Eye className="w-3 h-3" />
                            </span>
                          </div>
                        ) : (
                          <div className="mt-2 text-[10px] text-stone-400 italic">
                            {isDenied
                              ? 'Location permission denied by user'
                              : 'Location sharing is turned off'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Section: Interactive Leaflet Map */}
        <div className="flex-1 w-full min-w-0">
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Live Field Map
                </h3>
              </div>
              <div className="text-xs text-stone-500">
                {activeSharingCount > 0 ? (
                  <span className="text-emerald-600 font-semibold">
                    {activeSharingCount} active {activeSharingCount === 1 ? 'marker' : 'markers'}
                  </span>
                ) : (
                  <span className="text-stone-400">0 active markers</span>
                )}
              </div>
            </div>

            {/* Map Container */}
            <div className="relative w-full h-[520px] lg:h-[620px] rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950">
              <div ref={mapContainerRef} className="w-full h-full z-0" />

              {/* Empty state overlay if zero sharing */}
              {activeSharingCount === 0 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-lg flex items-center gap-2.5 max-w-sm text-center">
                  <MapPinOff className="w-4 h-4 text-stone-400 flex-shrink-0" />
                  <p className="text-xs text-stone-600 dark:text-stone-300">
                    No salespersons currently sharing live location. Field team can turn on GPS
                    sharing from their mobile home dashboard.
                  </p>
                </div>
              )}
            </div>

            {/* Map helper legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-stone-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Active Sharing</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>Stale (&gt;2 mins)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-stone-400"></span>
                  <span>Stopped</span>
                </span>
              </div>

              <span>Click any salesperson marker to view coordinates & Google Maps link</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

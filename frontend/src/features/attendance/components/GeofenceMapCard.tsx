import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Navigation,
  Compass,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Building2,
  ExternalLink,
  Layers,
  Bike,
  Car,
  Footprints,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'sonner';
import {
  OFFICE_PRESETS,
  findNearestOffice,
  haversineDistance,
  type OfficePreset,
} from '../utils/office-presets';

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return haversineDistance(lat1, lon1, lat2, lon2);
}

interface GeofenceMapCardProps {
  officeId?: string;
  onOfficeChange?: (office: OfficePreset) => void;
  userAvatarUrl?: string;
}

type MapLayerType = 'osm' | 'satellite';

export function GeofenceMapCard({
  officeId,
  onOfficeChange,
  userAvatarUrl,
}: GeofenceMapCardProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const officeMarkerRef = useRef<L.Marker | null>(null);
  const connectLineRef = useRef<L.Polyline | null>(null);

  const [activeOffice, setActiveOffice] = useState<OfficePreset>(
    OFFICE_PRESETS.find((o) => o.id === officeId) ?? OFFICE_PRESETS[0]!,
  );
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [layerType, setLayerType] = useState<MapLayerType>('osm');

  // Update active office when prop changes
  useEffect(() => {
    if (officeId) {
      const office = OFFICE_PRESETS.find((o) => o.id === officeId);
      if (office) setActiveOffice(office);
    }
  }, [officeId]);

  // Helper to switch tile layer (FREE providers - no API key required)
  const applyTileLayer = useCallback((map: L.Map, type: MapLayerType) => {
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    if (type === 'satellite') {
      // ArcGIS World Imagery - FREE, no API key needed
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: '&copy; Esri, Maxar, Earthstar Geographics',
        },
      ).addTo(map);
    } else {
      // OpenStreetMap France (HOT) - FREE tile server, CORS-friendly, no API key
      // More reliable than tile.openstreetmap.org which blocks some referers
      tileLayerRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          subdomains: 'abc',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors, Tiles HOT',
          crossOrigin: true,
        },
      ).addTo(map);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [activeOffice.lat, activeOffice.lng],
      zoom: 16,
      zoomControl: false,
    });

    applyTileLayer(map, layerType);

    L.control.zoom({ position: 'topright' }).addTo(map);
    mapInstanceRef.current = map;

    // Invalidate size immediately and after mount transitions
    const timer1 = setTimeout(() => map.invalidateSize(), 150);
    const timer2 = setTimeout(() => map.invalidateSize(), 600);

    // Watch container resize
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      ro.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [activeOffice.lat, activeOffice.lng, applyTileLayer, layerType]);

  // Handle layer type changes
  const toggleMapLayer = () => {
    const nextLayer: MapLayerType = layerType === 'osm' ? 'satellite' : 'osm';
    setLayerType(nextLayer);
    if (mapInstanceRef.current) {
      applyTileLayer(mapInstanceRef.current, nextLayer);
    }
  };

  // Add geofence circle & office marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old circle/marker
    map.eachLayer((layer) => {
      if (
        layer instanceof L.Circle ||
        (layer instanceof L.Marker && layer !== userMarkerRef.current)
      ) {
        map.removeLayer(layer);
      }
    });
    if (connectLineRef.current) {
      map.removeLayer(connectLineRef.current);
      connectLineRef.current = null;
    }

    // Geofence Circle
    const circle = L.circle([activeOffice.lat, activeOffice.lng], {
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.16,
      weight: 2.5,
      dashArray: '6, 6',
      radius: activeOffice.radiusMeters,
    }).addTo(map);

    circle.bindTooltip(
      isVi ? `Ranh giới Geofence FPT (${activeOffice.radiusMeters}m)` : `FPT Geofence Perimeter (${activeOffice.radiusMeters}m)`,
      { permanent: false, direction: 'top' },
    );

    // Office marker with custom building icon (SVG via divIcon)
    const buildingIcon = L.divIcon({
      className: 'office-building-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translateY(-8px);">
          <div style="background: white; border: 3px solid #1d4ed8; border-radius: 12px; padding: 6px 10px; box-shadow: 0 8px 24px rgba(29,78,216,0.35); display: flex; align-items: center; gap: 8px;">
            <img src="${activeOffice.buildingSvg}" alt="${activeOffice.nameEn}" style="width: 32px; height: 38px; display: block;" onerror="this.style.display='none'" />
            <div>
              <div style="font-size: 11px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.3px; line-height: 1.1;">${activeOffice.nameVi}</div>
              <div style="font-size: 8px; color: #64748b; font-weight: 600; margin-top: 2px;">${activeOffice.addressVi}</div>
            </div>
          </div>
          <div style="width: 0; height: 0; border-left: 9px solid transparent; border-right: 9px solid transparent; border-top: 11px solid #1d4ed8; margin-top: -1px;"></div>
          <div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); width: 14px; height: 14px; background: #1d4ed8; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 5px rgba(29,78,216,0.25); animation: officePulse 2s ease-in-out infinite;"></div>
        </div>
      `,
      iconSize: [220, 80],
      iconAnchor: [110, 50],
    });

    const officeMarker = L.marker([activeOffice.lat, activeOffice.lng], { icon: buildingIcon, zIndexOffset: 1000 }).addTo(map);
    officeMarker.bindPopup(`
      <div style="padding: 6px; font-family: system-ui, sans-serif; min-width: 220px;">
        <b style="color: #1e3a8a; font-size: 13px;">${isVi ? activeOffice.nameVi : activeOffice.nameEn}</b>
        <p style="margin: 4px 0 0; font-size: 11px; color: #475569;">${isVi ? activeOffice.addressVi : activeOffice.addressEn}</p>
        <div style="margin-top: 6px; display: inline-block; background: #eff6ff; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">
          ${isVi ? `Bán kính Geofence: ${activeOffice.radiusMeters}m` : `Radius: ${activeOffice.radiusMeters}m`}
        </div>
      </div>
    `);
    officeMarkerRef.current = officeMarker;

    // Add CSS for animations if not present
    if (!document.getElementById('geofence-animations')) {
      const style = document.createElement('style');
      style.id = 'geofence-animations';
      style.textContent = `
        @keyframes officePulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(29,78,216,0.25); }
          50% { box-shadow: 0 0 0 12px rgba(29,78,216,0.04); }
        }
        @keyframes userPing {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes dashFlow {
          to { stroke-dashoffset: -32; }
        }
        .connect-line-animated {
          animation: dashFlow 1.2s linear infinite;
        }
        .leaflet-container {
          width: 100% !important;
          height: 100% !important;
          background: #e2e8f0;
        }
      `;
      document.head.appendChild(style);
    }

    // Fit bounds to office + user
    if (userLocation) {
      const bounds = L.latLngBounds(
        [[activeOffice.lat, activeOffice.lng], [userLocation.lat, userLocation.lng]],
      );
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
    } else {
      map.setView([activeOffice.lat, activeOffice.lng], 16);
    }
  }, [activeOffice, userLocation, isVi]);

  // Request user location
  const locateUser = useCallback(() => {
    if (!navigator.geolocation) {
      const msg = isVi ? 'Trình duyệt không hỗ trợ Geolocation API' : 'Geolocation is not supported by your browser';
      setGpsError(msg);
      toast.error(msg);
      return;
    }
    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const uLat = position.coords.latitude;
        const uLng = position.coords.longitude;
        const uAcc = Math.round(position.coords.accuracy);
        setUserLocation({ lat: uLat, lng: uLng, accuracy: uAcc });
        setIsLocating(false);

        const dist = calculateDistanceMeters(uLat, uLng, activeOffice.lat, activeOffice.lng);
        setDistanceMeters(dist);

        // Auto-detect nearest office (suggest, but don't auto-switch)
        const nearest = findNearestOffice(uLat, uLng);
        if (nearest.office.id !== activeOffice.id && nearest.distanceMeters < 5000) {
          toast.info(
            isVi
              ? `Bạn đang gần ${nearest.office.nameVi} hơn (${Math.round(nearest.distanceMeters)}m)`
              : `You are closer to ${nearest.office.nameEn} (${Math.round(nearest.distanceMeters)}m)`,
          );
        }

        const map = mapInstanceRef.current;
        if (!map) return;

        // User marker with avatar
        const isInside = dist <= activeOffice.radiusMeters;
        const userColor = isInside ? '#10b981' : '#2563eb';

        const avatarHtml = userAvatarUrl
          ? `<img src="${userAvatarUrl}" style="width: 100%; height: 100%; border-radius: 9999px; object-fit: cover;" onerror="this.style.display='none'" />`
          : `<div style="width: 100%; height: 100%; border-radius: 9999px; background: ${userColor};"></div>`;

        const userIcon = L.divIcon({
          className: 'user-marker',
          html: `
            <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background: ${userColor}; opacity: 0.35; animation: userPing 1.6s ease-out infinite;"></div>
              <div style="position: relative; width: 26px; height: 26px; border-radius: 9999px; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.35); overflow: hidden; background: white;">
                ${avatarHtml}
              </div>
            </div>
          `,
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        });

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([uLat, uLng]);
          userMarkerRef.current.setIcon(userIcon);
        } else {
          userMarkerRef.current = L.marker([uLat, uLng], { icon: userIcon }).addTo(map);
        }

        // Polyline connecting user to office with glowing route effect
        if (connectLineRef.current) {
          connectLineRef.current.setLatLngs([
            [activeOffice.lat, activeOffice.lng],
            [uLat, uLng],
          ]);
        } else {
          const line = L.polyline(
            [[activeOffice.lat, activeOffice.lng], [uLat, uLng]],
            {
              color: isInside ? '#10b981' : '#2563eb',
              weight: 5,
              dashArray: '10, 14',
              opacity: 0.9,
              className: 'connect-line-animated',
            },
          ).addTo(map);
          connectLineRef.current = line;
        }

        // Fit bounds with padding
        const bounds = L.latLngBounds([
          [activeOffice.lat, activeOffice.lng],
          [uLat, uLng],
        ]);
        map.fitBounds(bounds, { padding: [70, 70], maxZoom: 17 });

        const hasNotified = sessionStorage.getItem('worksync_gps_notified');
        if (!hasNotified) {
          sessionStorage.setItem('worksync_gps_notified', 'true');
          if (dist <= activeOffice.radiusMeters) {
            toast.success(
              isVi
                ? `Bạn đang trong khuôn viên ${activeOffice.nameVi} (~${Math.round(dist)}m)`
                : `You are inside ${activeOffice.nameEn} perimeter (~${Math.round(dist)}m)`,
              { id: 'gps-status-toast' },
            );
          } else {
            toast.info(
              isVi
                ? `Khoảng cách tới ${activeOffice.nameVi}: ~${(dist / 1000).toFixed(1)}km`
                : `Distance to ${activeOffice.nameEn}: ~${(dist / 1000).toFixed(1)}km`,
              { id: 'gps-status-toast' },
            );
          }
        }
      },
      (err) => {
        setIsLocating(false);
        let errMsg: string;
        if (err.code === 1) {
          errMsg = isVi
            ? 'Quyền truy cập vị trí GPS bị từ chối. Hãy bật quyền vị trí cho trình duyệt và thử lại.'
            : 'GPS location permission denied. Please enable location access in your browser settings and try again.';
        } else if (err.code === 2) {
          errMsg = isVi
            ? 'Không thể xác định vị trí GPS. Kiểm tra kết nối mạng hoặc GPS thiết bị.'
            : 'Cannot determine GPS location. Check your network connection or device GPS.';
        } else if (err.code === 3) {
          errMsg = isVi
            ? 'Hết thời gian chờ GPS. Bấm "Vị trí của tôi" để thử lại.'
            : 'GPS request timed out. Click "My Location" to try again.';
        } else {
          errMsg = isVi
            ? 'Không thể xác định vị trí GPS'
            : 'Unable to determine GPS location';
        }
        setGpsError(errMsg);
        toast.error(errMsg, { duration: 5000 });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }, [activeOffice, isVi, userAvatarUrl]);

  // Auto trigger on mount
  useEffect(() => {
    locateUser();
  }, [locateUser]);

  const resetToOffice = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([activeOffice.lat, activeOffice.lng], 16, { duration: 1.2 });
    }
  };

  const handleOfficeChange = (id: string) => {
    const office = OFFICE_PRESETS.find((o) => o.id === id);
    if (office) {
      setActiveOffice(office);
      onOfficeChange?.(office);
      if (userMarkerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      if (connectLineRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(connectLineRef.current);
        connectLineRef.current = null;
      }
      setUserLocation(null);
      setDistanceMeters(null);
    }
  };

  const isWithinGeofence = distanceMeters !== null && distanceMeters <= activeOffice.radiusMeters;

  // Open Google Maps directions in new tab
  const openGoogleMapsDirection = () => {
    if (!userLocation) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${activeOffice.lat},${activeOffice.lng}`,
        '_blank',
      );
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${activeOffice.lat},${activeOffice.lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  // Travel time estimates
  const bikeMinutes = distanceMeters ? Math.max(1, Math.round((distanceMeters / 1000 / 32) * 60)) : null;
  const carMinutes = distanceMeters ? Math.max(1, Math.round((distanceMeters / 1000 / 42) * 60)) : null;
  const walkMinutes = distanceMeters ? Math.max(1, Math.round((distanceMeters / 1000 / 4.5) * 60)) : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md transition-all duration-200 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                {isVi ? activeOffice.nameVi : activeOffice.nameEn}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200/60">
                {activeOffice.code}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isVi ? activeOffice.addressVi : activeOffice.addressEn}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Office Selector */}
          <select
            value={activeOffice.id}
            onChange={(e) => handleOfficeChange(e.target.value)}
            className="h-8 px-2.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          >
            {OFFICE_PRESETS.map((o) => (
              <option key={o.id} value={o.id}>
                {isVi ? o.nameVi : o.nameEn}
              </option>
            ))}
          </select>

          {distanceMeters !== null ? (
            isWithinGeofence ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {isVi ? `Trong ranh giới (${Math.round(distanceMeters)}m)` : `In Geofence (${Math.round(distanceMeters)}m)`}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {isVi
                    ? `Cách ${distanceMeters > 1000 ? `${(distanceMeters / 1000).toFixed(1)}km` : `${Math.round(distanceMeters)}m`}`
                    : `${distanceMeters > 1000 ? `${(distanceMeters / 1000).toFixed(1)}km` : `${Math.round(distanceMeters)}m`} away`}
                </span>
              </div>
            )
          ) : gpsError ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
              <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>{gpsError}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              <span>{isVi ? 'Đang đo GPS...' : 'Locating GPS...'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 aspect-[21/11] min-h-[320px] bg-slate-100 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Map Type Switcher (Top Right) */}
        <div className="absolute top-3 right-14 z-[400] flex items-center">
          <button
            onClick={toggleMapLayer}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/95 backdrop-blur text-slate-700 hover:text-blue-600 rounded-lg text-xs font-bold border border-slate-200 shadow-sm transition-all hover:shadow"
            title={isVi ? 'Chuyển lớp bản đồ' : 'Toggle Map Layer'}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">
              {layerType === 'osm' ? (isVi ? 'Vệ tinh' : 'Satellite') : isVi ? 'Đường phố' : 'Streets'}
            </span>
          </button>
        </div>

        {/* Control buttons (Bottom Right) */}
        <div className="absolute bottom-3 right-3 z-[400] flex items-center gap-2">
          <button
            onClick={resetToOffice}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/95 backdrop-blur text-slate-700 hover:text-blue-600 rounded-lg text-xs font-bold border border-slate-200 shadow-sm transition-all hover:shadow"
            title={isVi ? 'Về trung tâm văn phòng' : 'Center on office'}
          >
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">{isVi ? 'Văn phòng' : 'Office'}</span>
          </button>
          <button
            onClick={locateUser}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition-all disabled:opacity-50"
            title={isVi ? 'Lấy lại tọa độ' : 'Refresh GPS'}
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? (isVi ? 'Đang tìm...' : 'Locating...') : isVi ? 'Vị trí của tôi' : 'My Location'}</span>
          </button>
        </div>

        {/* Live status banner (Top Left) */}
        <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-sm flex items-center gap-2 text-xs font-semibold text-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>
            {isVi ? `Bán kính chuẩn: ${activeOffice.radiusMeters}m` : `Geofence: ${activeOffice.radiusMeters}m`}
          </span>
          {userLocation && (
            <span className="text-[11px] text-slate-500 hidden md:inline">
              • {isVi ? 'Sai số' : 'Accuracy'}: ±{userLocation.accuracy}m
            </span>
          )}
        </div>
      </div>

      {/* Travel Route Estimates & Navigation Bar */}
      {userLocation && distanceMeters !== null && (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              {isVi ? 'Ước tính di chuyển:' : 'Travel estimates:'}
            </span>

            {/* Motorbike */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold shadow-2xs">
              <Bike className="w-3.5 h-3.5 text-blue-600" />
              <span>{isVi ? 'Xe máy:' : 'Bike:'}</span>
              <strong className="text-slate-900 font-bold font-mono">~{bikeMinutes}m</strong>
            </div>

            {/* Car */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold shadow-2xs">
              <Car className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isVi ? 'Ô tô:' : 'Car:'}</span>
              <strong className="text-slate-900 font-bold font-mono">~{carMinutes}m</strong>
            </div>

            {/* Walking */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold shadow-2xs">
              <Footprints className="w-3.5 h-3.5 text-amber-600" />
              <span>{isVi ? 'Đi bộ:' : 'Walk:'}</span>
              <strong className="text-slate-900 font-bold font-mono">
                {walkMinutes && walkMinutes > 120 ? `${(walkMinutes / 60).toFixed(1)}h` : `~${walkMinutes}m`}
              </strong>
            </div>
          </div>

          {/* Direct Google Maps Navigation Button */}
          <button
            onClick={openGoogleMapsDirection}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all self-start md:self-auto"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{isVi ? 'Mở Google Maps chỉ đường' : 'Open Google Maps Directions'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

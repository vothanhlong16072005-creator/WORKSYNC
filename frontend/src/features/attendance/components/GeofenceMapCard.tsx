import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Navigation, Compass, AlertCircle, CheckCircle2, ShieldCheck, Building2 } from 'lucide-react';
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

export function GeofenceMapCard({
  officeId,
  onOfficeChange,
  userAvatarUrl,
}: GeofenceMapCardProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
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

  // Update active office when prop changes
  useEffect(() => {
    if (officeId) {
      const office = OFFICE_PRESETS.find((o) => o.id === officeId);
      if (office) setActiveOffice(office);
    }
  }, [officeId]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [activeOffice.lat, activeOffice.lng],
      zoom: 16,
      zoomControl: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [activeOffice.lat, activeOffice.lng]);

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
      fillOpacity: 0.15,
      weight: 2,
      dashArray: '6, 6',
      radius: activeOffice.radiusMeters,
    }).addTo(map);
    circle.bindTooltip(
      isVi ? `Ranh giới Geofence (${activeOffice.radiusMeters}m)` : `Geofence Perimeter (${activeOffice.radiusMeters}m)`,
      { permanent: false, direction: 'top' },
    );

    // Office marker with custom building icon (SVG via divIcon)
    const buildingIcon = L.divIcon({
      className: 'office-building-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translateY(-8px);">
          <div style="background: white; border: 3px solid #1d4ed8; border-radius: 12px; padding: 6px 8px; box-shadow: 0 6px 16px rgba(29,78,216,0.35); display: flex; align-items: center; gap: 6px;">
            <img src="${activeOffice.buildingSvg}" alt="${activeOffice.nameEn}" style="width: 28px; height: 36px; display: block;" onerror="this.style.display='none'" />
            <div>
              <div style="font-size: 9px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.3px; line-height: 1;">${activeOffice.code}</div>
              <div style="font-size: 7px; color: #64748b; font-weight: 600; margin-top: 1px;">${activeOffice.city}</div>
            </div>
          </div>
          <div style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid #1d4ed8; margin-top: -1px;"></div>
          <div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); width: 12px; height: 12px; background: #1d4ed8; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 4px rgba(29,78,216,0.25); animation: officePulse 2s ease-in-out infinite;"></div>
        </div>
      `,
      iconSize: [180, 80],
      iconAnchor: [90, 50],
    });
    const officeMarker = L.marker([activeOffice.lat, activeOffice.lng], { icon: buildingIcon, zIndexOffset: 1000 }).addTo(map);
    officeMarker.bindPopup(`
      <div style="padding: 6px; font-family: system-ui, sans-serif; min-width: 200px;">
        <b style="color: #1e3a8a; font-size: 13px;">${isVi ? activeOffice.nameVi : activeOffice.nameEn}</b>
        <p style="margin: 4px 0 0; font-size: 11px; color: #475569;">${isVi ? activeOffice.addressVi : activeOffice.addressEn}</p>
        <div style="margin-top: 6px; display: inline-block; background: #eff6ff; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">
          ${isVi ? `Bán kính: ${activeOffice.radiusMeters}m` : `Radius: ${activeOffice.radiusMeters}m`}
        </div>
      </div>
    `);
    officeMarkerRef.current = officeMarker;

    // Add CSS for animations
    if (!document.getElementById('geofence-animations')) {
      const style = document.createElement('style');
      style.id = 'geofence-animations';
      style.textContent = `
        @keyframes officePulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(29,78,216,0.25); }
          50% { box-shadow: 0 0 0 10px rgba(29,78,216,0.05); }
        }
        @keyframes userPing {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes dashFlow {
          to { stroke-dashoffset: -26; }
        }
        .connect-line-animated {
          animation: dashFlow 1.2s linear infinite;
        }
      `;
      document.head.appendChild(style);
    }

    // Fit bounds to office + user
    if (userLocation) {
      const bounds = L.latLngBounds(
        [[activeOffice.lat, activeOffice.lng], [userLocation.lat, userLocation.lng]],
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
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

        // User marker with avatar (or colored dot)
        const isInside = dist <= activeOffice.radiusMeters;
        const userColor = isInside ? '#10b981' : '#f59e0b';

        const avatarHtml = userAvatarUrl
          ? `<img src="${userAvatarUrl}" style="width: 100%; height: 100%; border-radius: 9999px; object-fit: cover;" onerror="this.style.display='none'" />`
          : `<div style="width: 100%; height: 100%; border-radius: 9999px; background: ${userColor};"></div>`;

        const userIcon = L.divIcon({
          className: 'user-marker',
          html: `
            <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background: ${userColor}; opacity: 0.4; animation: userPing 1.5s ease-out infinite;"></div>
              <div style="position: relative; width: 22px; height: 22px; border-radius: 9999px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); overflow: hidden;">
                ${avatarHtml}
              </div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([uLat, uLng]);
          userMarkerRef.current.setIcon(userIcon);
        } else {
          userMarkerRef.current = L.marker([uLat, uLng], { icon: userIcon }).addTo(map);
        }

        // Polyline connecting user to office
        if (connectLineRef.current) {
          connectLineRef.current.setLatLngs([
            [activeOffice.lat, activeOffice.lng],
            [uLat, uLng],
          ]);
        } else {
          const line = L.polyline(
            [[activeOffice.lat, activeOffice.lng], [uLat, uLng]],
            {
              color: isInside ? '#10b981' : '#f59e0b',
              weight: 4,
              dashArray: '8, 12',
              opacity: 0.85,
              className: 'connect-line-animated',
            },
          ).addTo(map);
          connectLineRef.current = line;
        }

        // Fit bounds
        const bounds = L.latLngBounds([
          [activeOffice.lat, activeOffice.lng],
          [uLat, uLng],
        ]);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });

        if (dist <= activeOffice.radiusMeters) {
          toast.success(
            isVi
              ? `Bạn đang trong khuôn viên ${activeOffice.nameVi} (~${Math.round(dist)}m)`
              : `You are inside ${activeOffice.nameEn} perimeter (~${Math.round(dist)}m)`,
          );
        } else {
          toast.info(
            isVi
              ? `Vị trí cách ${activeOffice.nameVi} ~${(dist / 1000).toFixed(1)}km`
              : `Location is ~${(dist / 1000).toFixed(1)}km from ${activeOffice.nameEn}`,
          );
        }
      },
      (err) => {
        setIsLocating(false);
        const errMsg =
          err.code === 1
            ? isVi
              ? 'Quyền truy cập vị trí GPS bị từ chối'
              : 'GPS location permission denied'
            : isVi
            ? 'Không thể xác định vị trí GPS'
            : 'Unable to determine GPS location';
        setGpsError(errMsg);
        toast.error(errMsg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
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
      // Clear user marker to avoid stale position
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
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
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
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

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200/80 aspect-[21/10] min-h-[280px] bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Control buttons */}
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

        {/* Live status banner */}
        <div className="absolute top-3 left-3 z-[400] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-sm flex items-center gap-2 text-xs font-semibold text-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>
            {isVi ? `Geofence an toàn: ${activeOffice.radiusMeters}m` : `Secure Geofence: ${activeOffice.radiusMeters}m`}
          </span>
          {userLocation && (
            <span className="text-[11px] text-slate-500 hidden md:inline">
              • {isVi ? 'Sai số' : 'Accuracy'}: ±{userLocation.accuracy}m
            </span>
          )}
        </div>

        {/* Distance label badge (visible when both markers shown) */}
        {userLocation && distanceMeters !== null && (
          <div className="absolute top-3 right-16 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-sm text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-mono text-slate-900">
                {distanceMeters > 1000
                  ? `${(distanceMeters / 1000).toFixed(2)}km`
                  : `${Math.round(distanceMeters)}m`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

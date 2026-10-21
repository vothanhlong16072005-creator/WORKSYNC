/**
 * Multi-office presets for FPT Software complex locations.
 * All 3 offices use the same 500m geofence radius per FPT standard.
 *
 * Tọa độ tham khảo (cần confirm chính xác với HR):
 * - Đà Nẵng: FPT Complex, Nam Kỳ Khởi Nghĩa, Hòa Hải
 * - Hà Nội: FPT Software Tower, Phạm Văn Bạch, Cầu Giấy
 * - TP.HCM: FPT Tân Thuận, KCN Tân Thuận, Quận 7
 */

export interface OfficePreset {
  id: 'dn' | 'hn' | 'hcm';
  code: string;
  nameVi: string;
  nameEn: string;
  addressVi: string;
  addressEn: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  /** Path to SVG building icon (relative to /public) */
  buildingSvg: string;
  city: string;
}

export const OFFICE_PRESETS: readonly OfficePreset[] = [
  {
    id: 'dn',
    code: 'FPT_DN',
    nameVi: 'FPT Complex Đà Nẵng',
    nameEn: 'FPT Complex Da Nang',
    addressVi: 'Đường Nam Kỳ Khởi Nghĩa, P. Hòa Hải, Q. Ngũ Hành Sơn, TP. Đà Nẵng',
    addressEn: 'Nam Ky Khoi Nghia St, Hoa Hai Ward, Ngu Hanh Son Dist, Da Nang',
    lat: 15.9686,
    lng: 108.2608,
    radiusMeters: 100,
    buildingSvg: '/office-buildings/fpt-dn.svg',
    city: 'Da Nang',
  },
  {
    id: 'hn',
    code: 'FPT_HN',
    nameVi: 'FPT Software Tower Hà Nội',
    nameEn: 'FPT Software Tower Hanoi',
    addressVi: 'Số 10 Phố Phạm Văn Bạch, Q. Cầu Giấy, TP. Hà Nội',
    addressEn: '10 Pham Van Bach, Cau Giay Dist, Hanoi',
    lat: 21.0285,
    lng: 105.7842,
    radiusMeters: 100,
    buildingSvg: '/office-buildings/fpt-hn.svg',
    city: 'Hanoi',
  },
  {
    id: 'hcm',
    code: 'FPT_HCM',
    nameVi: 'FPT Tân Thuận TP.HCM',
    nameEn: 'FPT Tan Thuan HCMC',
    addressVi: 'Lô T2, Đường D1, Khu chế xuất Tân Thuận, Quận 7, TP.HCM',
    addressEn: 'T2 D1 St, Tan Thuan EPZ, District 7, HCMC',
    lat: 10.7735,
    lng: 106.732,
    radiusMeters: 100,
    buildingSvg: '/office-buildings/fpt-hcm.svg',
    city: 'Ho Chi Minh',
  },
] as const;

const EARTH_RADIUS_METERS = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine distance between two coordinates in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export interface NearestOfficeResult {
  office: OfficePreset;
  distanceMeters: number;
}

/**
 * Find the nearest office to a given GPS coordinate.
 * Returns the office and the distance in meters.
 */
export function findNearestOffice(lat: number, lng: number): NearestOfficeResult {
  let nearest = OFFICE_PRESETS[0]!;
  let minDistance = Infinity;
  for (const office of OFFICE_PRESETS) {
    const d = haversineDistance(lat, lng, office.lat, office.lng);
    if (d < minDistance) {
      minDistance = d;
      nearest = office;
    }
  }
  return { office: nearest, distanceMeters: minDistance };
}

/**
 * Get office by ID
 */
export function getOfficeById(id: string): OfficePreset | undefined {
  return OFFICE_PRESETS.find((o) => o.id === id);
}

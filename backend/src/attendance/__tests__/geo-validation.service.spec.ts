import { describe, expect, it } from 'vitest';
import { GeoValidationService } from '../geo-validation.service.js';

describe('GeoValidationService', () => {
  const service = new GeoValidationService();

  // FPT Tower Pham Van Bach, Cau Giay, Hanoi
  const officeLat = 21.028511;
  const officeLng = 105.782045;
  const radiusMeters = 500;

  it('calculates 0 distance for exact coordinates', () => {
    const dist = service.calculateDistanceMeters(officeLat, officeLng, officeLat, officeLng);
    expect(Math.round(dist)).toBe(0);
    expect(service.isWithinRadius(officeLat, officeLng, officeLat, officeLng, radiusMeters)).toBe(true);
  });

  it('allows location within radius (e.g. 50 meters away)', () => {
    // Offset ~50m north: 1 deg lat ~ 111,000m -> 50m ~ 0.00045 deg
    const nearbyLat = officeLat + 0.00045;
    const nearbyLng = officeLng;

    const dist = service.calculateDistanceMeters(nearbyLat, nearbyLng, officeLat, officeLng);
    expect(dist).toBeLessThanOrEqual(radiusMeters);
    expect(service.isWithinRadius(nearbyLat, nearbyLng, officeLat, officeLng, radiusMeters)).toBe(true);
  });

  it('accurately distinguishes boundary limits around 500 meters', () => {
    // 1 deg lat ~ 111,139 meters at Hanoi latitude
    // 480 meters ~ 0.00432 deg
    const insideBoundaryLat = officeLat + 0.0043;
    const distInside = service.calculateDistanceMeters(insideBoundaryLat, officeLng, officeLat, officeLng);
    expect(distInside).toBeLessThanOrEqual(radiusMeters);
    expect(service.isWithinRadius(insideBoundaryLat, officeLng, officeLat, officeLng, radiusMeters)).toBe(true);

    // 520 meters ~ 0.0047 deg
    const outsideBoundaryLat = officeLat + 0.0047;
    const distOutside = service.calculateDistanceMeters(outsideBoundaryLat, officeLng, officeLat, officeLng);
    expect(distOutside).toBeGreaterThan(radiusMeters);
    expect(service.isWithinRadius(outsideBoundaryLat, officeLng, officeLat, officeLng, radiusMeters)).toBe(false);
  });

  it('rejects location outside radius (e.g. Hoan Kiem Lake, ~8km away)', () => {
    const hoanKiemLat = 21.028667;
    const hoanKiemLng = 105.852148;

    const dist = service.calculateDistanceMeters(hoanKiemLat, hoanKiemLng, officeLat, officeLng);
    expect(dist).toBeGreaterThan(6000);
    expect(service.isWithinRadius(hoanKiemLat, hoanKiemLng, officeLat, officeLng, radiusMeters)).toBe(false);
  });

  it('handles null, undefined or NaN coordinates gracefully', () => {
    expect(service.isWithinRadius(undefined, undefined, officeLat, officeLng, radiusMeters)).toBe(false);
    expect(service.isWithinRadius(null as unknown as number, 105.78, officeLat, officeLng, radiusMeters)).toBe(false);
    expect(service.isWithinRadius(NaN, officeLng, officeLat, officeLng, radiusMeters)).toBe(false);
  });

  it('rejects coordinates out of physical latitude/longitude range', () => {
    expect(service.isWithinRadius(120, officeLng, officeLat, officeLng, radiusMeters)).toBe(false);
    expect(service.isWithinRadius(officeLat, 200, officeLat, officeLng, radiusMeters)).toBe(false);
  });
});

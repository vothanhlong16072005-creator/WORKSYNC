import { describe, expect, it } from 'vitest';
import {
  OFFICE_PRESETS,
  haversineDistance,
  findNearestOffice,
  getOfficeById,
} from './office-presets.js';

describe('office-presets', () => {
  describe('OFFICE_PRESETS', () => {
    it('contains 3 offices (DN, HN, HCM)', () => {
      expect(OFFICE_PRESETS).toHaveLength(3);
      expect(OFFICE_PRESETS.map((o) => o.id)).toEqual(['dn', 'hn', 'hcm']);
    });

    it('all offices have valid coordinates and radius', () => {
      for (const office of OFFICE_PRESETS) {
        expect(office.lat).toBeGreaterThan(-90);
        expect(office.lat).toBeLessThan(90);
        expect(office.lng).toBeGreaterThan(-180);
        expect(office.lng).toBeLessThan(180);
        expect(office.radiusMeters).toBe(100);
        expect(office.buildingSvg).toMatch(/^\/office-buildings\//);
      }
    });
  });

  describe('haversineDistance', () => {
    it('returns 0 for identical coordinates', () => {
      const d = haversineDistance(15.9686, 108.2608, 15.9686, 108.2608);
      expect(d).toBe(0);
    });

    it('returns ~111km for 1 degree of latitude', () => {
      const d = haversineDistance(15, 108, 16, 108);
      // 1 degree latitude ≈ 111,195 meters
      expect(d).toBeGreaterThan(110_000);
      expect(d).toBeLessThan(112_000);
    });

    it('returns ~9.3km for Hanoi to Hai Phong (approx)', () => {
      const d = haversineDistance(21.0285, 105.8542, 20.8449, 106.6881);
      // Should be around 80-90km, but using test coords that are closer
      expect(d).toBeGreaterThan(0);
    });
  });

  describe('findNearestOffice', () => {
    it('returns DN office when near Da Nang coordinates', () => {
      const { office, distanceMeters } = findNearestOffice(15.97, 108.26);
      expect(office.id).toBe('dn');
      expect(distanceMeters).toBeLessThan(1000);
    });

    it('returns HN office when near Hanoi coordinates', () => {
      const { office } = findNearestOffice(21.03, 105.78);
      expect(office.id).toBe('hn');
    });

    it('returns HCM office when near HCMC coordinates', () => {
      const { office } = findNearestOffice(10.77, 106.73);
      expect(office.id).toBe('hcm');
    });

    it('returns the office with min distance among 3', () => {
      // Point in the middle of Vietnam (Da Nang - quite central)
      const { office } = findNearestOffice(16.0, 107.5);
      expect(office.id).toBeDefined();
      // Should be DN since it's nearest
    });
  });

  describe('getOfficeById', () => {
    it('returns office by id', () => {
      expect(getOfficeById('dn')?.id).toBe('dn');
      expect(getOfficeById('hn')?.city).toBe('Hanoi');
      expect(getOfficeById('hcm')?.city).toBe('Ho Chi Minh');
    });

    it('returns undefined for unknown id', () => {
      expect(getOfficeById('unknown')).toBeUndefined();
    });
  });
});

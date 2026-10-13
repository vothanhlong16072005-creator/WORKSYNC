import { Injectable } from '@nestjs/common';

@Injectable()
export class GeoValidationService {
  private readonly EARTH_RADIUS_METERS = 6371000;

  /**
   * Calculate distance between two coordinates using Haversine formula.
   */
  calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const radLat1 = toRad(lat1);
    const radLat2 = toRad(lat2);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.EARTH_RADIUS_METERS * c;
  }

  /**
   * Check if client location is within the office radius.
   */
  isWithinRadius(
    clientLat?: number,
    clientLng?: number,
    officeLat?: number,
    officeLng?: number,
    radiusMeters = 500,
  ): boolean {
    if (
      clientLat == null ||
      clientLng == null ||
      officeLat == null ||
      officeLng == null ||
      Number.isNaN(clientLat) ||
      Number.isNaN(clientLng) ||
      Number.isNaN(officeLat) ||
      Number.isNaN(officeLng)
    ) {
      return false;
    }

    if (clientLat < -90 || clientLat > 90 || clientLng < -180 || clientLng > 180) {
      return false;
    }

    const distance = this.calculateDistanceMeters(
      clientLat,
      clientLng,
      officeLat,
      officeLng,
    );

    return distance <= radiusMeters;
  }
}

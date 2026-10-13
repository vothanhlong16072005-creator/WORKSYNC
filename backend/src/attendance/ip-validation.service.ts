import { Injectable } from '@nestjs/common';
import ipRangeCheck from 'ip-range-check';

@Injectable()
export class IpValidationService {
  /**
   * Normalize IP (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
   */
  private normalizeIp(ip: string): string {
    if (!ip) return '';
    const trimmed = ip.trim();
    if (trimmed.startsWith('::ffff:')) {
      return trimmed.replace('::ffff:', '');
    }
    return trimmed;
  }

  /**
   * Check if client IP belongs to any allowed IP or CIDR range.
   */
  isAllowed(clientIp: string, allowedRanges?: string[]): boolean {
    if (!clientIp || typeof clientIp !== 'string') {
      return false;
    }
    if (!allowedRanges || !Array.isArray(allowedRanges) || allowedRanges.length === 0) {
      return false;
    }

    const cleanIp = this.normalizeIp(clientIp);
    if (!cleanIp) return false;

    try {
      return Boolean(ipRangeCheck(cleanIp, allowedRanges));
    } catch {
      return false;
    }
  }
}

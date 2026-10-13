import { describe, expect, it } from 'vitest';
import { IpValidationService } from '../ip-validation.service.js';

describe('IpValidationService', () => {
  const service = new IpValidationService();

  const allowedRanges = [
    '127.0.0.1',
    '::1',
    '192.168.1.0/24',
    '10.0.0.0/8',
  ];

  it('allows exact IP match', () => {
    expect(service.isAllowed('127.0.0.1', allowedRanges)).toBe(true);
  });

  it('allows IP inside CIDR subnet', () => {
    expect(service.isAllowed('192.168.1.45', allowedRanges)).toBe(true);
    expect(service.isAllowed('10.20.30.40', allowedRanges)).toBe(true);
  });

  it('rejects IP outside allowed subnets', () => {
    expect(service.isAllowed('192.168.2.1', allowedRanges)).toBe(false);
    expect(service.isAllowed('8.8.8.8', allowedRanges)).toBe(false);
  });

  it('handles IPv4-mapped IPv6 addresses (::ffff:192.168.1.50)', () => {
    expect(service.isAllowed('::ffff:192.168.1.50', allowedRanges)).toBe(true);
    expect(service.isAllowed('::ffff:172.16.1.1', allowedRanges)).toBe(false);
  });

  it('returns false for invalid or empty IP', () => {
    expect(service.isAllowed('', allowedRanges)).toBe(false);
    expect(service.isAllowed('not-an-ip', allowedRanges)).toBe(false);
    expect(service.isAllowed(undefined as unknown as string, allowedRanges)).toBe(false);
  });

  it('returns false if allowedRanges is empty or undefined', () => {
    expect(service.isAllowed('127.0.0.1', [])).toBe(false);
    expect(service.isAllowed('127.0.0.1', undefined as unknown as string[])).toBe(false);
  });
});

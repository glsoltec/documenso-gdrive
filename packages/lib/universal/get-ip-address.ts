import type { Context } from 'hono';

import { env } from '../utils/env';

/**
 * Trusted proxy IPs/CIDRs allowed to set forwarding headers.
 *
 * When set, `X-Forwarded-For`/`X-Real-IP`/etc. are only honored if the direct
 * TCP peer is one of these trusted addresses. Otherwise the direct peer IP is
 * used. This prevents clients from spoofing their IP to bypass rate limits.
 */
const getTrustedProxyList = (): string[] => {
  const raw = env('NEXT_PRIVATE_TRUSTED_PROXY_IPS');

  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
};

const ipv4ToLong = (ip: string): number | null => {
  const parts = ip.split('.');

  if (parts.length !== 4) {
    return null;
  }

  const octets = parts.map(Number);

  if (octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) {
    return null;
  }

  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
};

/**
 * Whether the given address is explicitly trusted (exact IP or CIDR).
 */
const isTrustedProxy = (address: string | undefined): boolean => {
  if (!address) {
    return false;
  }

  return getTrustedProxyList().some((entry) => {
    if (entry.includes('/')) {
      return ipv4ToLong(address) !== null && ipToMatchInRange(address, entry);
    }

    return address === entry;
  });
};

const ipToMatchInRange = (ip: string, netv4: string): boolean => {
  const [range, bits] = netv4.split('/');

  const ipLong = ipv4ToLong(ip);
  const rangeLong = ipv4ToLong(range);

  if (ipLong === null || rangeLong === null) {
    return false;
  }

  const defaultBits = bits ? parseInt(bits, 10) : 32;
  const mask = defaultBits === 0 ? 0 : ~((1 << (32 - defaultBits)) - 1) >>> 0;

  return (ipLong & mask) === (rangeLong & mask);
};

/**
 * Read the direct peer IP from the Hono context when running on the Node adapter.
 */
const getDirectPeerIp = (c?: Context): string | undefined => {
  const envBindings = c?.env as {
    incoming?: { socket?: { remoteAddress?: string } };
  } | undefined;

  return envBindings?.incoming?.socket?.remoteAddress ?? undefined;
};

const isTrustedHeaderValue = (value: string | null, peer: string | undefined): value is string => {
  if (!value) {
    return false;
  }

  return isTrustedProxy(peer) || isLoopback(peer);
};

const isLoopback = (address: string | undefined): boolean => {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
};

/**
 * Resolve the real client IP.
 *
 * Forwarded headers are honored ONLY when the direct TCP peer is an explicitly
 * trusted proxy (or loopback). Without a trusted proxy configured we fail
 * closed: client-supplied forwarding headers are ignored so attackers cannot
 * spoof their IP to bypass rate limits (CWE-345; OWASP A01).
 */
export const getIpAddress = (req: Request, c?: Context): string => {
  const peer = getDirectPeerIp(c);

  const forwarded = req.headers.get('x-forwarded-for');

  if (forwarded && isTrustedHeaderValue(forwarded, peer)) {
    return forwarded.split(',')[0].trim();
  }

  const trustedHeaders = ['x-real-ip', 'x-client-ip', 'cf-connecting-ip', 'true-client-ip'];

  for (const header of trustedHeaders) {
    const value = req.headers.get(header);

    if (value && isTrustedHeaderValue(value, peer)) {
      return value.trim();
    }
  }

  if (peer) {
    return peer;
  }

  throw new Error('No IP address found');
};
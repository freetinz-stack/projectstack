// api/_ratelimit.js — Shared Upstash rate-limiter factory.
//
// Used by activate.js, validate.js, and session.js.
// Returns null when env vars are absent (local dev without Upstash) so callers
// can skip limiting gracefully rather than crashing.
//
// Requires env vars:  UPSTASH_REDIS_REST_URL  UPSTASH_REDIS_REST_TOKEN
// Free tier:  https://console.upstash.com  (10 000 commands/day, no card needed)

import { Ratelimit } from '@upstash/ratelimit';
import { Redis }     from '@upstash/redis';

// Cache limiter instances so they are only created once per serverless cold start
const _instances = new Map();

/**
 * Returns a configured Ratelimit instance, or null if Upstash is not configured.
 *
 * @param {string} prefix   - Unique namespace, e.g. 'rl:activate'
 * @param {number} requests - Max requests allowed in the window
 * @param {string} window   - Time window, e.g. '1 h', '10 m'
 */
export function getRateLimiter(prefix, requests, window) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null; // Upstash not configured — skip limiting
  }
  if (_instances.has(prefix)) return _instances.get(prefix);

  const limiter = new Ratelimit({
    redis:   Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix,
  });
  _instances.set(prefix, limiter);
  return limiter;
}

/**
 * Extracts the real client IP from a Vercel/proxy request.
 * Falls back to 'unknown' when not determinable.
 */
export function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Checks the rate limit for the given IP. Returns { limited: true, retryAfter }
 * if the limit is exceeded, otherwise { limited: false }.
 * Returns { limited: false } immediately when Upstash is not configured.
 */
export async function checkRateLimit(prefix, requests, window, ip) {
  const limiter = getRateLimiter(prefix, requests, window);
  if (!limiter) return { limited: false };

  const { success, reset } = await limiter.limit(ip);
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return { limited: true, retryAfter };
  }
  return { limited: false };
}

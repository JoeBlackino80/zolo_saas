import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = hasUpstash ? Redis.fromEnv() : null;

const limiters = new Map<string, Ratelimit>();
const memBuckets = new Map<string, { count: number; reset: number }>();

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  if (redis) {
    const cacheKey = `${limit}:${windowMs}`;
    let rl = limiters.get(cacheKey);
    if (!rl) {
      rl = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${Math.ceil(windowMs / 1000)} s`),
        analytics: true,
        prefix: 'zolo:rl',
      });
      limiters.set(cacheKey, rl);
    }
    const { success, remaining, reset } = await rl.limit(key);
    return { allowed: success, remaining, resetIn: Math.max(0, reset - Date.now()) };
  }

  const now = Date.now();
  const bucket = memBuckets.get(key);
  if (!bucket || now > bucket.reset) {
    memBuckets.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }
  bucket.count++;
  if (bucket.count > limit) return { allowed: false, remaining: 0, resetIn: bucket.reset - now };
  return { allowed: true, remaining: limit - bucket.count, resetIn: bucket.reset - now };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}

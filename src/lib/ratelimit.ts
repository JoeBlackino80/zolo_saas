// In-memory rate limit (per-instance — Vercel serverless reset per cold start)
// For production: use @upstash/ratelimit with Redis
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }
  bucket.count++;
  if (bucket.count > limit) {
    return { allowed: false, remaining: 0, resetIn: bucket.reset - now };
  }
  return { allowed: true, remaining: limit - bucket.count, resetIn: bucket.reset - now };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}

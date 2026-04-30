// In-memory token-bucket rate limiter. Process-local, so it does NOT protect
// against distributed brute force across Vercel instances — for that, swap the
// store to Upstash/Redis. It DOES catch single-IP floods on a warm instance,
// which is the most common abuse pattern. See docs/Security-Hardening.md.

const buckets = new Map();
const SWEEP_INTERVAL_MS = 60_000;

let lastSweep = 0;
function sweep(now) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.updatedAt > 10 * 60 * 1000) buckets.delete(key);
  }
}

/**
 * @param {string} key  Identifier (e.g. `${ip}:${route}`)
 * @param {number} limit  Max tokens in the bucket
 * @param {number} windowMs  Refill window in ms — 1 token per windowMs/limit
 * @returns {{ ok: boolean, retryAfter: number }}
 */
export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  sweep(now);

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: limit, updatedAt: now };
    buckets.set(key, bucket);
  }

  // Refill based on elapsed time.
  const elapsed = now - bucket.updatedAt;
  const refill = (elapsed / windowMs) * limit;
  bucket.tokens = Math.min(limit, bucket.tokens + refill);
  bucket.updatedAt = now;

  if (bucket.tokens < 1) {
    const retryAfter = Math.ceil(((1 - bucket.tokens) * windowMs) / limit / 1000);
    return { ok: false, retryAfter };
  }

  bucket.tokens -= 1;
  return { ok: true, retryAfter: 0 };
}

export function getClientIp(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

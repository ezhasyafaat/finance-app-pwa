/**
 * Tiny in-memory sliding-window rate limiter. Single-instance only (fine for a
 * self-hosted app); swap for Redis if you run multiple replicas.
 *
 * Keyed by "bucket:identifier" (e.g. "login:1.2.3.4"). Returns whether the call
 * is allowed and how long to wait if not.
 */
type Stamp = number;
const hits = new Map<string, Stamp[]>();

// Periodically drop empty buckets so the map can't grow unbounded.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, arr] of hits) if (arr.length === 0 || arr[arr.length - 1] < now - 3_600_000) hits.delete(k);
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  sweep(now);
  const arr = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
  if (arr.length >= limit) {
    const retryAfter = Math.ceil((arr[0] + windowMs - now) / 1000);
    hits.set(key, arr);
    return { ok: false, retryAfter };
  }
  arr.push(now);
  hits.set(key, arr);
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client IP from proxy headers, falling back to a constant. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

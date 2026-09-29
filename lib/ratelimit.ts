// Anti-abus simple (mémoire du process) : `max` appels par fenêtre de `windowMs`, par clé.
const hits = new Map<string, number[]>();

export function rateLimited(key: string, max: number, windowMs = 600_000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";

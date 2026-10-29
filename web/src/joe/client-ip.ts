let cached: { ip: string; expires: number } | undefined;
let pending: Promise<string | undefined> | undefined;

export function clientPublicIp(): Promise<string | undefined> {
  if (cached && cached.expires > Date.now()) return Promise.resolve(cached.ip);
  if (pending) return pending;
  pending = (async () => {
    try {
      const response = await fetch('https://api64.ipify.org?format=json', { signal: AbortSignal.timeout(3000), cache: 'no-store', credentials: 'omit' });
      if (!response.ok) return undefined;
      const value: unknown = await response.json();
      const ip = value && typeof value === 'object' && 'ip' in value ? value.ip : undefined;
      if (typeof ip !== 'string' || ip.length > 45 || !/^[0-9a-f:.]+$/i.test(ip)) return undefined;
      cached = { ip, expires: Date.now() + 5 * 60_000 };
      return ip;
    } catch { return undefined; }
  })().finally(() => { pending = undefined; });
  return pending;
}

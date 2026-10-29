import { useEffect, useState } from 'react';
import { api, jsonBody } from '../api';
import { clientPublicIp } from '../client-ip';
import type { Weather } from '../types';

export function useWeather(enabled = true) {
  const [data, setData] = useState<Weather | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const clientIp = await clientPublicIp();
        if (controller.signal.aborted) return;
        const value = await api<Weather>('/weather', { ...jsonBody({ clientIp }), signal: controller.signal });
        if (!controller.signal.aborted) { setData(value); setError(value.configured ? '' : '天气未配置'); }
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '天气暂不可用');
      }
    }
    if (enabled) void refresh();
    const poll = enabled ? setInterval(() => void refresh(), 15 * 60_000) : undefined;
    const clock = setInterval(() => setNow(Date.now()), 60_000);
    return () => { controller.abort(); clearInterval(poll); clearInterval(clock); };
  }, [enabled]);
  return { data, error, now };
}

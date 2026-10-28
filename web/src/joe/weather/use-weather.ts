import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Weather } from '../types';

export function useWeather() {
  const [data, setData] = useState<Weather | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const value = await api<Weather>('/weather', { signal: controller.signal });
        if (!controller.signal.aborted) { setData(value); setError(value.configured ? '' : '天气未配置'); }
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '天气暂不可用');
      }
    }
    void refresh();
    const poll = setInterval(() => void refresh(), 15 * 60_000);
    const clock = setInterval(() => setNow(Date.now()), 60_000);
    return () => { controller.abort(); clearInterval(poll); clearInterval(clock); };
  }, []);
  return { data, error, now };
}

import { useEffect, useState } from 'react';
import { VoiceAccountPanel } from './voice-account-panel';
import { api } from '../../joe/api';
import type { Bootstrap, Weather } from '../../joe/types';
function duration(ms: number) {
  const minutes = Math.floor(ms / 60000);
  return `${Math.floor(minutes / 1440)}天${Math.floor(minutes / 60) % 24}小时${minutes % 60}分钟`;
}
export function InfoPanel({ bootstrap }: { bootstrap: Bootstrap | null }) {
  const [now, setNow] = useState<Date | null>(null),
    [weather, setWeather] = useState<Weather | null>(null),
    [error, setError] = useState('');
  const timezone = weather?.timezone || bootstrap?.settings.timezone || 'Asia/Shanghai';
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setWeather(null);
    setError('');
    const load = () =>
      api<Weather>('/weather', { signal: controller.signal })
        .then((value) => {
          if (controller.signal.aborted) return;
          setWeather(value);
          setError('');
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        });
    void load();
    const timer = setInterval(() => void load(), 15 * 60000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);
  const usage = bootstrap?.usage;
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/5 bg-[#0c101c]/80 p-5">
        <p className="font-mono text-3xl tracking-wider">
          {now?.toLocaleTimeString('zh-CN', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }) ||
            '—:—'}
        </p>
        <p className="mt-2 text-xs text-slate-400">
          {now?.toLocaleDateString('zh-CN', {
            timeZone: timezone,
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          }) || '正在同步日期'}
        </p>
        <div className="my-5 border-t border-white/5" />
        <p className="text-sm text-slate-200">
          {weather?.configured
            ? `${weather.temperature}° · ${weather.condition}`
            : error
              ? '天气暂不可用'
              : weather?.configured === false
                ? '请配置 WeatherAPI'
                : '正在定位天气'}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">⌖ {weather?.place || 'IP 自动定位'}</p>
        {error && <p className="mt-2 text-xs text-amber-300">{error}</p>}
        <a
          className="mt-4 block text-[10px] text-slate-600"
          href="https://www.weatherapi.com/"
          target="_blank"
          rel="noreferrer"
        >
          WeatherAPI.com
        </a>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/5 pt-4 text-[11px]">
          <span className="text-slate-500">Joe 累计在线</span>
          <span className="font-mono text-slate-300">{usage ? duration(usage.uptimeMs) : '—'}</span>
        </div>
      </section>
      <VoiceAccountPanel usage={usage} />
    </div>
  );
}

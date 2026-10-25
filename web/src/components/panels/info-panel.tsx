import { memo, useEffect, useState } from 'react';
import { api } from '../../joe/api';
import type { Bootstrap, Weather } from '../../joe/types';
function duration(ms: number) {
  const minutes = Math.floor(ms / 60000);
  return `${Math.floor(minutes / 1440)}天${Math.floor(minutes / 60) % 24}小时${minutes % 60}分钟`;
}
export const InfoPanel = memo(function InfoPanel({ bootstrap }: { bootstrap: Bootstrap | null }) {
  const [now, setNow] = useState<number | null>(null),
    [weather, setWeather] = useState<Weather | null>(null),
    [error, setError] = useState('');
  const timezone = weather?.timezone || bootstrap?.settings.timezone || 'Asia/Shanghai';
  useEffect(() => {
    setNow(Math.floor(Date.now() / 60000) * 60000);
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 60000) * 60000), 1000);
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
    <div className="p-7">
      <section>
        <p className="text-6xl font-semibold tracking-tight tabular-nums">
          {(now === null ? null : new Date(now))?.toLocaleTimeString('zh-CN', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }) ||
            '—:—'}
        </p>
        <p className="mt-3 text-sm text-white/80">
          {(now === null ? null : new Date(now))?.toLocaleDateString('zh-CN', {
            timeZone: timezone,
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          }) || '正在同步日期'}
        </p>
        <div className="my-8 h-px bg-white/15" />
        <p className="text-xl font-semibold text-white">
          {weather?.configured
            ? `${weather.temperature}° · ${weather.condition}`
            : error
              ? '天气暂不可用'
              : weather?.configured === false
                ? '请配置 WeatherAPI'
                : '正在定位天气'}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/80">⌖ {weather?.place || 'IP 自动定位'}</p>
        {error && <p className="mt-2 text-xs text-white/80">{error}</p>}
        <a
          className="mt-4 block text-[10px] text-white/80"
          href="https://www.weatherapi.com/"
          target="_blank"
          rel="noreferrer"
        >
          WeatherAPI.com
        </a>
        <div className="mt-8 flex items-center justify-between gap-3 rounded-3xl bg-white/5 p-5 text-sm">
          <span className="text-white/80">累计在线</span>
          <span className="text-white tabular-nums">{usage ? duration(usage.uptimeMs) : '—'}</span>
        </div>
      </section>
    </div>
  );
});

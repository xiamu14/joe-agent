import { motion } from 'motion/react';
import { MapPin } from 'lucide-react';
import { TiltCard } from '../tilt-card';
import { useWeather } from './use-weather';
import type { Weather } from '../types';
import { weatherPresentation, weatherThemes } from './presentation';
import { WeatherIcon } from './weather-icon';

export function WeatherCard({ resource, bound = false }: { resource?: Weather; bound?: boolean }) {
  const fallback = useWeather(!bound);
  const data = bound ? resource : fallback.data, error = bound ? '' : fallback.error, now = fallback.now;
  const presentation = weatherPresentation(data ?? { configured: false }, now);
  const theme = weatherThemes[data?.configured ? presentation.theme : 'cloudy'];
  const format = (value?: number) => value === undefined ? '—' : `${Math.round(value)}°`;
  const timezone = data?.timezone ?? 'UTC';
  return (
    <TiltCard id="weather" label="天气卡片" expandedWidth="min(520px, calc(100% - 32px))" expandedHeight="340px" surfaceClassName="overflow-hidden rounded-[26px]">
      <motion.div className="@container relative isolate flex h-full min-h-[220px] flex-col overflow-hidden p-5" animate={{ color: theme.color }}>
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 -z-10" animate={{ backgroundColor: theme.top }} transition={{ duration: 1 }} />
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 -z-10" animate={{ backgroundImage: `linear-gradient(180deg, transparent, ${theme.bottom})` }} transition={{ duration: 1 }} />
        <motion.div className="flex items-center justify-between gap-3">
          <motion.span className="flex min-w-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 text-[11px]"><MapPin size={13} className="shrink-0" /><motion.span className="truncate">{data?.place || '天气'}</motion.span></motion.span>
        </motion.div>
        <motion.div className="mt-3 flex flex-1 flex-col">
          <motion.div className="flex items-center justify-between gap-3">
            <motion.div className="min-w-0"><motion.p className="text-[25px] leading-8">{new Intl.DateTimeFormat('zh-CN', { weekday: 'long', timeZone: timezone }).format(now)}</motion.p><motion.p className="mt-0.5 text-[11px] opacity-75">{new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: timezone }).format(now)}</motion.p></motion.div>
            <motion.p className="shrink-0 text-right text-[36px] leading-none tracking-tight">{format(data?.temperature)}C</motion.p>
          </motion.div>
          <motion.div className="relative flex min-h-28 flex-1 items-center justify-end">
            <motion.div className="pointer-events-none absolute left-1/2 -translate-x-1/2"><WeatherIcon icon={presentation.icon} label={data?.condition || '天气未知'} /></motion.div>
            <motion.div className="relative max-w-[30%] text-right"><motion.p className="text-sm">{data?.condition || error || '加载中…'}</motion.p><motion.p className="mt-1 text-[11px] opacity-75">体感 {format(data?.feelsLike)}</motion.p></motion.div>
          </motion.div>
        </motion.div>
        {error && data?.configured && <motion.p role="status" className="mt-2 text-[10px] opacity-70">{error}</motion.p>}
        <motion.a href="https://www.weatherapi.com/" target="_blank" rel="noopener noreferrer" className="absolute bottom-2 left-5 text-[8px] opacity-40">WeatherAPI.com</motion.a>
      </motion.div>
    </TiltCard>
  );
}

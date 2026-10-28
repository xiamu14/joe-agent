import { z } from 'zod';

const CACHE_MS = 15 * 60_000;
const responseSchema = z.object({
  location: z.object({ name: z.string(), region: z.string(), country: z.string(), tz_id: z.string() }),
  current: z.object({
    temp_c: z.number(),
    feelslike_c: z.number(),
    humidity: z.number(),
    wind_kph: z.number(),
    condition: z.object({ text: z.string(), code: z.number().int() }),
    is_day: z.union([z.literal(0), z.literal(1)]),
    last_updated_epoch: z.number(),
  }),
  forecast: z.object({ forecastday: z.array(z.object({
    date: z.string(),
    day: z.object({ mintemp_c: z.number() }),
    astro: z.object({ sunrise: z.string(), sunset: z.string() }),
  })).min(1) }),
});
export type Weather = {
  configured: boolean;
  place?: string;
  temperature?: number;
  feelsLike?: number;
  minimum?: number;
  forecastDate?: string;
  conditionCode?: number;
  isDay?: boolean;
  sunrise?: string;
  sunset?: string;
  condition?: string;
  humidity?: number;
  windKph?: number;
  timezone?: string;
  updatedAt?: number;
  source?: string;
};
const cache = new Map<string, { expires: number; data: Weather }>();
export async function weather(location: string, signal?: AbortSignal): Promise<Weather> {
  const query = z.string().trim().min(1).max(200).parse(location);
  signal?.throwIfAborted();
  const key = process.env.WEATHER_API_KEY?.trim();
  if (!key) return { configured: false };
  const cached = cache.get(query);
  if (cached && cached.expires > Date.now()) return cached.data;
  const url = new URL('https://api.weatherapi.com/v1/forecast.json');
  url.search = new URLSearchParams({ key, q: query, days: '1', lang: 'zh' }).toString();
  try {
    const response = await fetch(url, {
      signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(10000)]),
    });
    if (!response.ok) {
      const error = z
        .object({ error: z.object({ code: z.number() }) })
        .safeParse(await response.json().catch(() => null));
      const code = error.success ? error.data.error.code : undefined;
      if (code === 1006) throw new Error('未找到地点，请提供城市及国家');
      if (code === 2007) throw new Error('WeatherAPI 本月查询额度已用完');
      if ([1002, 2006, 2008, 2009].includes(code ?? 0))
        throw new Error('请检查 WeatherAPI API Key 及服务权限');
      throw new Error('天气服务暂不可用');
    }
    const { location: place, current, forecast } = responseSchema.parse(await response.json());
    const data: Weather = {
      configured: true,
      place: [...new Set([place.name, place.region, place.country].filter(Boolean))].join(' · '),
      temperature: current.temp_c,
      feelsLike: current.feelslike_c,
      minimum: forecast.forecastday[0].day.mintemp_c,
      forecastDate: forecast.forecastday[0].date,
      conditionCode: current.condition.code,
      isDay: current.is_day === 1,
      sunrise: forecast.forecastday[0].astro.sunrise,
      sunset: forecast.forecastday[0].astro.sunset,
      condition: current.condition.text,
      humidity: current.humidity,
      windKph: current.wind_kph,
      timezone: place.tz_id,
      updatedAt: current.last_updated_epoch * 1000,
      source: 'WeatherAPI.com',
    };
    if (cache.size >= 30) cache.clear();
    cache.set(query, { data, expires: Date.now() + CACHE_MS });
    return data;
  } catch (error) {
    if (signal?.aborted) throw new Error('天气查询已取消');
    if (error instanceof Error && /未找到地点|WeatherAPI|天气服务暂不可用/.test(error.message)) throw error;
    throw new Error('天气查询失败，请稍后重试');
  }
}

// shortcut: IP location uses the local backend’s public egress; pass visitor IP when deploying remotely.
export function currentWeather(signal?: AbortSignal) {
  return weather('auto:ip', signal);
}

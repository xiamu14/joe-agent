import { z } from 'zod';

const CACHE_MS = 15 * 60_000;
const responseSchema = z.object({
  location: z.object({ name: z.string(), region: z.string(), country: z.string(), tz_id: z.string() }),
  current: z.object({
    temp_c: z.number(),
    feelslike_c: z.number(),
    humidity: z.number(),
    wind_kph: z.number(),
    condition: z.object({ text: z.string() }),
    last_updated_epoch: z.number(),
  }),
});
export type Weather = {
  configured: boolean;
  place?: string;
  temperature?: number;
  feelsLike?: number;
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
  const url = new URL('https://api.weatherapi.com/v1/current.json');
  url.search = new URLSearchParams({ key, q: query, lang: 'zh' }).toString();
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
    const { location: place, current } = responseSchema.parse(await response.json());
    const data: Weather = {
      configured: true,
      place: [...new Set([place.name, place.region, place.country].filter(Boolean))].join(' · '),
      temperature: current.temp_c,
      feelsLike: current.feelslike_c,
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

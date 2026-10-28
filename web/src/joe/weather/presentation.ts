import type { Weather } from '../types';

export function weatherKind(code?: number) {
  if (code === 1000) return 'clear';
  if (code === 1003) return 'partly';
  if (code === 1006 || code === 1009) return 'cloudy';
  if ([1087, 1273, 1276, 1279, 1282].includes(code ?? 0)) return 'thunder';
  if ([1030, 1135, 1147].includes(code ?? 0)) return 'fog';
  if ([1066, 1069, 1072, 1114, 1117, 1168, 1171, 1198, 1201, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264].includes(code ?? 0)) return 'snow';
  if ([1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code ?? 0)) return 'rain';
  return 'unknown';
}

export function localWeatherTime(now: number, timezone = 'UTC') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (key: string) => parts.find(part => part.type === key)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

function clockMinutes(time?: string) {
  const match = time?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  return match ? Number(match[1]) % 12 * 60 + Number(match[2]) + (match[3].toUpperCase() === 'PM' ? 720 : 0) : undefined;
}

export function weatherPresentation(data: Weather, now: number) {
  const kind = weatherKind(data.conditionCode);
  const local = localWeatherTime(now, data.timezone);
  const sunrise = clockMinutes(data.sunrise), sunset = clockMinutes(data.sunset);
  const today = local.date === data.forecastDate;
  const day = today && sunrise !== undefined && sunset !== undefined ? local.minutes >= sunrise && local.minutes < sunset : data.isDay ?? (local.minutes >= 360 && local.minutes < 1080);
  const twilight = today && [sunrise, sunset].some(time => time !== undefined && Math.abs(local.minutes - time) <= 30);
  let theme = day ? 'sunny' : 'night';
  if (day && (kind === 'partly' || kind === 'cloudy')) theme = 'cloudy';
  if (day && (kind === 'rain' || kind === 'thunder')) theme = 'rain';
  if (day && (kind === 'snow' || kind === 'fog')) theme = 'soft';
  if (twilight && (kind === 'clear' || kind === 'partly')) theme = 'twilight';
  return { kind, theme, icon: weatherIconName(data, day), today };
}

export const weatherThemes: Record<string, { top: string; bottom: string; color: string }> = {
  sunny: { top: '#2e58f5', bottom: '#0da6ad', color: '#ffffff' },
  cloudy: { top: '#253240', bottom: '#1d2936', color: '#ffffff' },
  rain: { top: '#bce8fa', bottom: '#ffffff', color: '#202b3b' },
  soft: { top: '#d7e8f0', bottom: '#f6f9fc', color: '#253240' },
  night: { top: '#1d233c', bottom: '#101923', color: '#ffffff' },
  twilight: { top: '#6d5fa5', bottom: '#e5a374', color: '#ffffff' },
};


export function weatherIconName(data: Weather, day: boolean) {
  const code = data.conditionCode;
  if (code === 1000) {
    if (day && (data.temperature ?? 0) >= 35) return 'hot';
    if ((data.windKph ?? 0) >= 30) return day ? 'wind-day' : 'wind-night';
    return day ? 'clear-day' : 'clear-night';
  }
  if (code === 1003) return day ? 'partly-cloudy-day' : 'partly-cloudy-night';
  if (code === 1006) return day ? 'cloudy' : 'cloudy-night';
  if (code === 1009) return (data.windKph ?? 0) >= 30 ? 'wind-clouds' : 'cloudy';
  if (code === 1030) return day ? 'haze-day' : 'fog';
  if ([1135, 1147].includes(code ?? 0)) return 'fog';
  if ([1150, 1153].includes(code ?? 0)) return 'drizzle';
  if ([1180, 1183, 1186, 1189].includes(code ?? 0)) return 'rain';
  if ([1192, 1195].includes(code ?? 0)) return 'heavy-rain';
  if ([1063, 1240, 1243, 1246].includes(code ?? 0)) return 'showers';
  if ([1069, 1072, 1168, 1171, 1198, 1201, 1204, 1207, 1237, 1249, 1252, 1261, 1264].includes(code ?? 0)) return 'ice-pellets';
  if ([1066, 1210, 1213].includes(code ?? 0)) return 'light-snow';
  if ([1114, 1117, 1216, 1219, 1222, 1225, 1255, 1258].includes(code ?? 0)) return 'snow';
  if (code === 1273) return 'thunder-showers';
  if (code === 1276) return 'thunder-rain';
  if ([1087, 1279, 1282].includes(code ?? 0)) return 'thunder';
  return 'cloudy';
}

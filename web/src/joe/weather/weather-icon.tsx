import { motion } from 'motion/react';
import { weatherIconBounds } from './weather-icon-bounds';

export function WeatherIcon({ icon, label, enlarged = false }: { icon: string; label: string; enlarged?: boolean }) {
  const [width, bottom] = weatherIconBounds[icon] ?? [1, 1];
  return <motion.span className={`relative block shrink-0 ${enlarged ? 'w-42' : 'w-28'}`} style={{ aspectRatio: `${width} / ${bottom}` }}>
    <motion.img src={`/weather/${icon}.svg`} alt={label} draggable={false} className="absolute inset-x-0 top-0 h-auto w-full object-contain" />
  </motion.span>;
}

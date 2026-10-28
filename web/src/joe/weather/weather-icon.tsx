import { motion } from 'motion/react';

export function WeatherIcon({ icon, label }: { icon: string; label: string }) {
  return <motion.img src={`/weather/${icon}.svg`} alt={label} draggable={false} className="h-28 w-28 shrink-0 object-contain" />;
}

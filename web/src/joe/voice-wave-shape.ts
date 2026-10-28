export function wavePath(time: number, level: number, layer: number, band = false) {
  const points: string[] = [];
  for (let i = 0; i <= 96; i++) {
    const x = i / 96;
    const envelope = Math.sin(Math.PI * x) ** 3;
    const phase = time * 2.5 + layer * 0.65;
    const wave = Math.sin(x * Math.PI * 4 - phase) * 0.65
      + Math.sin(x * Math.PI * 6 + phase * 0.7) * 0.35;
    const y = 32 + wave * envelope * level * (27 - layer * 1.3);
    points.push(`${i ? 'L' : 'M'}${(x * 480).toFixed(2)},${y.toFixed(2)}`);
  }
  if (band) {
    const edge = wavePath(time + 0.35, level, layer + 0.5).split(' ');
    points.push(...edge.reverse().map(point => point.replace('M', 'L')), 'Z');
  }
  return points.join(' ');
}

export function audioLevel(samples: Float32Array) {
  let energy = 0;
  for (const sample of samples) energy += sample * sample;
  const rms = Math.sqrt(energy / (samples.length || 1));
  return Math.min(1, Math.max(0, (rms - 0.012) * 12));
}

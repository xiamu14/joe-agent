type Bounds = { left: number; top: number; width: number; height: number };

export function cardTilt(clientX: number, clientY: number, bounds: Bounds) {
  if (bounds.width <= 0 || bounds.height <= 0) return { rotateX: 0, rotateY: 0 };
  const x = Math.max(-1, Math.min(1, (clientX - bounds.left) / bounds.width * 2 - 1));
  const y = Math.max(-1, Math.min(1, (clientY - bounds.top) / bounds.height * 2 - 1));
  return { rotateX: -y * 4, rotateY: x * 4 };
}

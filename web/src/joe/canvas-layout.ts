export const cardIds = ['idea', 'question', 'video', 'tasks', 'weather'] as const;
export type CanvasCardId = typeof cardIds[number];
export type CanvasLayout = Record<CanvasCardId, { x: number; y: number; rotation: number }>;
export const cardWidths: Record<CanvasCardId, number> = { idea: 374, question: 310, video: 360, tasks: 338, weather: 380 };

export function createCanvasLayout(seed: number): CanvasLayout {
  let value = seed >>> 0;
  const random = () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
  const cells = [{ x: -220, y: -155 }, { x: 220, y: -155 }, { x: -220, y: 155 }, { x: 220, y: 155 }];
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  cells.push({ x: 0, y: 0 });
  const points = cells.map(cell => ({ x: cell.x + (random() * 2 - 1) * 10, y: cell.y + (random() * 2 - 1) * 10 }));
  const center = points.reduce((sum, point) => ({ x: sum.x + point.x / cardIds.length, y: sum.y + point.y / cardIds.length }), { x: 0, y: 0 });
  return Object.fromEntries(cardIds.map((id, i) => [id, { x: points[i].x - center.x, y: points[i].y - center.y, rotation: -5 + random() * 15 }])) as CanvasLayout;
}

export function cardLayer(id: CanvasCardId, selected: CanvasCardId | null, hovered: CanvasCardId | null, dragged: CanvasCardId | null = null) {
  if (id === selected) return 100;
  if (!selected && id === dragged) return 60;
  if (!selected && id === hovered) return 30;
  return cardIds.indexOf(id) + 1;
}

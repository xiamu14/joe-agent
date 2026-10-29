import type { LayoutMode } from './canvas-layout-layer';

type CanvasPreferences = { view: number; modes: LayoutMode[] };
const modesKey = 'canvas.layout-modes.v1';
const viewKey = 'canvas.active-view.v1';

export function loadCanvasPreferences(): CanvasPreferences {
  const preferences: CanvasPreferences = { view: 0, modes: ['free', 'free'] };
  try {
    preferences.view = localStorage.getItem(viewKey) === '1' ? 1 : 0;
    const saved = JSON.parse(localStorage.getItem(modesKey) ?? 'null');
    if (Array.isArray(saved)) preferences.modes = [0, 1].map(index => saved[index] === 'bento' ? 'bento' : 'free');
  } catch { /* Keep defaults when storage is unavailable or invalid. */ }
  return preferences;
}

export function saveCanvasPreferences({ view, modes }: CanvasPreferences) {
  try {
    localStorage.setItem(modesKey, JSON.stringify(modes));
    localStorage.setItem(viewKey, String(view));
  } catch { /* Switching remains usable without storage. */ }
}

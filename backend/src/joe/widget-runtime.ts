import { store } from './store';
import { WidgetStore } from './widget-store';
import { CanvasStore } from './canvas-store';

export const widgetStore = new WidgetStore(store.db);
export const canvasStore = new CanvasStore(store.db);

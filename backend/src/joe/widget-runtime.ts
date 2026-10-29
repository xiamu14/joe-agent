import { store } from './store';
import { WidgetStore } from './widget-store';

export const widgetStore = new WidgetStore(store.db);


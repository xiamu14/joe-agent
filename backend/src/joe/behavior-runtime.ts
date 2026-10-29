import { store } from './store';
import { BehaviorStore } from './behavior-store';
import { videoBehavior } from './video-behavior';
export const behaviorStore = new BehaviorStore(store.db, [videoBehavior]);

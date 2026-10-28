export function canvasSessionId(storage: Pick<Storage, 'getItem' | 'setItem'>, key: string, createId: () => string) {
  const stored = storage.getItem(key);
  if (stored && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(stored)) return stored;
  const id = createId();
  storage.setItem(key, id);
  return id;
}

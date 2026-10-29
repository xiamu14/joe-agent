export function canvasSessionId(storage: Pick<Storage, 'getItem' | 'setItem'>, key: string, createId: () => string) {
  const stored = storage.getItem(key);
  if (stored && /^[A-Za-z0-9_-]{21}$/.test(stored)) return stored;
  const id = createId();
  storage.setItem(key, id);
  return id;
}

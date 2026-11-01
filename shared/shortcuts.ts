export const shortcuts = [{ id: 'tally', trigger: '/tally', label: '记账' }] as const;
export type ShortcutId = typeof shortcuts[number]['id'];

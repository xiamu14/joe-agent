import { Extension } from '@tiptap/core';
import Suggestion, { type SuggestionProps } from '@tiptap/suggestion';
import { shortcuts } from '../../../../shared/shortcuts';
import { draftCommand } from './draft';

type Item = typeof shortcuts[number];
export type ShortcutMenuState = {
  items: Item[]; selected: number; left: number; top: number; choose(item: Item): void;
};
export function shortcutSuggestion(onMenu: (menu: ShortcutMenuState | null) => void) {
  return Extension.create({
    name: 'shortcutSuggestion',
    addProseMirrorPlugins() {
      return [Suggestion<Item>({
        editor: this.editor, char: '/', allowedPrefixes: [' ', '\n'],
        allow: () => !draftCommand(this.editor.getJSON()),
        items: ({ query }) => shortcuts.filter(item => `${item.trigger} ${item.label}`.toLowerCase().includes(query.toLowerCase())),
        command: ({ editor, range, props }) => {
          if (draftCommand(editor.getJSON())) return;
          editor.chain().focus().insertContentAt(range, [
            { type: 'shortcut', attrs: { command: props.id } }, { type: 'text', text: ' ' },
          ]).run();
        },
        render: () => {
          let current: SuggestionProps<Item>;
          let selected = 0;
          const update = (props: SuggestionProps<Item>) => {
            current = props;
            selected = Math.min(selected, Math.max(0, props.items.length - 1));
            const rect = props.clientRect?.();
            if (!rect) return;
            onMenu({ items: props.items, selected, left: Math.max(12, Math.min(rect.left, window.innerWidth - 232)), top: rect.top - 10, choose: item => props.command(item) });
          };
          return {
            onStart: props => { selected = 0; update(props); },
            onUpdate: props => { selected = 0; update(props); },
            onExit: () => onMenu(null),
            onKeyDown: ({ event }) => {
              if (event.isComposing) return false;
              if (event.key === 'Escape') { onMenu(null); return false; }
              if (!current?.items.length) return false;
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                selected = (selected + (event.key === 'ArrowDown' ? 1 : -1) + current.items.length) % current.items.length;
                update(current); return true;
              }
              if (event.key === 'Enter' || event.key === 'Tab' || event.key === ' ' && current.query === 'tally') {
                current.command(current.items[selected]); return true;
              }
              return false;
            },
          };
        },
      })];
    },
  });
}

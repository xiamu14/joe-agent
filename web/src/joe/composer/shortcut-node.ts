import { Node, mergeAttributes } from '@tiptap/core';
import { shortcuts } from '../../../../shared/shortcuts';

export const shortcutClass = 'mx-0.5 inline-block rounded-[12px] bg-[#363636] px-2 py-0.5 align-baseline font-bold text-white';
export const ShortcutNode = Node.create({
  name: 'shortcut', group: 'inline', inline: true, atom: true, selectable: true,
  addAttributes: () => ({ command: { default: 'tally' } }),
  parseHTML: () => [{ tag: 'span[data-shortcut="tally"]' }],
  renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes, {
    'data-shortcut': HTMLAttributes.command, contenteditable: 'false', class: shortcutClass,
  }), shortcuts.find(item => item.id === HTMLAttributes.command)?.id ?? ''],
  renderText: ({ node }) => shortcuts.find(item => item.id === node.attrs.command)?.trigger ?? '',
  addKeyboardShortcuts() {
    const remove = (before: boolean) => {
      const { state, view } = this.editor;
      if (!state.selection.empty) return false;
      const { $from, from } = state.selection;
      const node = before ? $from.nodeBefore : $from.nodeAfter;
      if (node?.type.name !== this.name) return false;
      view.dispatch(state.tr.delete(before ? from - node.nodeSize : from, before ? from : from + node.nodeSize));
      return true;
    };
    return { Backspace: () => remove(true), Delete: () => remove(false) };
  },
});

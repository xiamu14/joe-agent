import type { Editor, JSONContent } from '@tiptap/core';
import type { ShortcutId } from '../../../../shared/shortcuts';

export const emptyDraft = (): JSONContent => ({ type: 'doc', content: [{ type: 'paragraph' }] });
export function draftCommand(content: JSONContent): ShortcutId | undefined {
  const nodes = [content];
  let command: ShortcutId | undefined;
  while (nodes.length) {
    const node = nodes.pop()!;
    if (node.type === 'shortcut') {
      if (command || node.attrs?.command !== 'tally') throw new Error('每条消息只支持一个指令');
      command = node.attrs.command;
    }
    nodes.push(...(node.content ?? []));
  }
  return command;
}
export function appendText(editor: Editor | null, text: string) {
  if (!editor || !text) return;
  editor.chain().focus().insertContentAt(editor.state.doc.content.size - 1, { type: 'text', text: ` ${text}` }).run();
}

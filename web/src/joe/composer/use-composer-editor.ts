import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ShortcutNode } from './shortcut-node';
import { shortcutSuggestion, type ShortcutMenuState } from './shortcut-suggestion';
import { draftCommand } from './draft';
import { SuggestionPluginKey } from '@tiptap/suggestion';

export function useComposerEditor({ draft, onChange, onSubmit, onError, disabled }: {
  draft: JSONContent; onChange(value: JSONContent): void; onSubmit(): void;
  onError(message: string): void; disabled: boolean;
}) {
  const [menu, setMenu] = useState<ShortcutMenuState | null>(null);
  const callbacks = useRef({ onChange, onSubmit, onError });
  callbacks.current = { onChange, onSubmit, onError };
  const suggestion = useMemo(() => shortcutSuggestion(setMenu), []);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: false, blockquote: false, bulletList: false, orderedList: false,
      codeBlock: false, horizontalRule: false, bold: false, italic: false, strike: false, code: false, link: false, underline: false }), ShortcutNode, suggestion],
    content: draft,
    editorProps: {
      attributes: { role: 'textbox', 'aria-label': '消息', 'aria-multiline': 'true',
        class: 'min-h-12 max-h-40 w-full overflow-y-auto whitespace-pre-wrap break-words text-sm leading-7 text-white outline-none sm:text-base [&_p]:m-0 [&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-white/40' },
      handleKeyDown: (view, event) => {
        if (event.isComposing || event.keyCode === 229) return false;
        if (SuggestionPluginKey.getState(view.state)?.active) return false;
        if (event.key === 'Enter' && !event.shiftKey) { callbacks.current.onSubmit(); return true; }
        return false;
      },
    },
    onUpdate: ({ editor, transaction }) => {
      try {
        draftCommand(editor.getJSON());
        if (editor.getText().length > 12000) throw new Error('消息限 12000 字');
        callbacks.current.onChange(editor.getJSON());
      } catch (error) {
        editor.commands.setContent(transaction.before.toJSON(), { emitUpdate: false });
        callbacks.current.onError(error instanceof Error ? error.message : '输入无效');
      }
    },
  });
  useEffect(() => { editor?.setEditable(!disabled); if (disabled) setMenu(null); }, [editor, disabled]);
  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(draft)) editor.commands.setContent(draft, { emitUpdate: false });
  }, [editor, draft]);
  useEffect(() => {
    if (!editor) return;
    editor.view.dom.setAttribute('aria-expanded', String(Boolean(menu)));
    if (menu) {
      editor.view.dom.setAttribute('aria-controls', 'shortcut-menu');
      editor.view.dom.setAttribute('aria-activedescendant', menu.items[menu.selected] ? `shortcut-${menu.items[menu.selected].id}` : '');
    } else {
      editor.view.dom.removeAttribute('aria-controls'); editor.view.dom.removeAttribute('aria-activedescendant');
    }
  }, [editor, menu]);
  return { editor, menu };
}

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { marked } from 'marked';
import { Streamdown } from 'streamdown';
import type { Message } from './types';

export function hasMarkdown(text: string) {
  let formatted = false;
  marked.walkTokens(marked.lexer(text), token => {
    if (['heading', 'list', 'code', 'codespan', 'strong', 'em', 'del', 'link', 'image', 'table', 'blockquote', 'hr'].includes(token.type)) formatted = true;
  });
  return formatted;
}

export function MarkdownAnswer({ message, voicePending }: { message: Message; voicePending: boolean }) {
  const markdown = useMemo(() => hasMarkdown(message.text), [message.text]);
  const speaking = markdown && message.visibleText !== undefined && voicePending;
  if (!markdown && message.visibleText !== undefined)
    return <motion.div className="whitespace-pre-wrap break-words">{message.visibleText}</motion.div>;
  if (!markdown && message.speechText)
    return <motion.div className="whitespace-pre-wrap break-words">{message.speechText}</motion.div>;
  return <AnimatePresence mode="wait" initial={false}>
    {speaking ? <motion.div key="speech" exit={{ opacity: 0 }} transition={{ duration: 0.16 }} className="whitespace-pre-wrap break-words">{message.visibleText}</motion.div> :
      <motion.div key="markdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }} className="min-w-0 break-words">
        <Streamdown skipHtml controls={false} isAnimating={message.status === 'streaming'} className="[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_[data-streamdown=code-block]]:min-w-0 [&_[data-streamdown=code-block]]:gap-0 [&_[data-streamdown=code-block]]:rounded-lg [&_[data-streamdown=code-block]]:border-0 [&_[data-streamdown=code-block]]:bg-black/20 [&_[data-streamdown=code-block]]:p-2 [&_[data-streamdown=code-block-header]]:h-auto [&_[data-streamdown=code-block-header]]:px-1 [&_[data-streamdown=code-block-header]]:pb-2 [&_[data-streamdown=code-block-body]]:min-w-0 [&_[data-streamdown=code-block-body]]:overflow-x-auto [&_[data-streamdown=code-block-body]]:border-0 [&_[data-streamdown=code-block-body]]:bg-transparent [&_[data-streamdown=code-block-body]]:p-1 [&_a]:underline [&_table]:block [&_table]:overflow-x-auto">{message.text}</Streamdown>
      </motion.div>}
  </AnimatePresence>;
}

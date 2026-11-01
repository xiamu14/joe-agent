import type { MastraDBMessage } from '@mastra/core/memory';
import { joeMemory, resourceId } from './memory';
import { store, type Message } from './store';
import { answerSchema } from './schema';
import { greetingAudio, greetingText } from './greeting';

export const threadId = (session: string) => `joe:${session}`;
export const inFlight = new Map<string, Message>();
export function promptText(message: Pick<Message, 'sessionId' | 'text' | 'attachments'>) {
  return (
    message.text +
    message.attachments
      .map((a) => {
        const file = store.attachment(message.sessionId, a.id);
        return `\n<untrusted-attachment name=${JSON.stringify(file.name)}>\n${file.image ? '图片附件；使用 /tally 识别账户余额。' : file.text}\n</untrusted-attachment>`;
      })
      .join('')
  );
}
function metadata(message: Message) {
  const { text, ...value } = message;
  return {
    ...value,
    ...(message.role === 'user' ? { displayText: text } : {}),
  };
}
export function memoryMessage(message: Message): MastraDBMessage {
  return {
    id: message.id,
    threadId: threadId(message.sessionId),
    resourceId,
    role: message.role,
    createdAt: new Date(message.createdAt),
    content: {
      format: 2,
      parts: [
        {
          type: 'text',
          text: message.role === 'user' ? promptText(message) : message.text,
        },
      ],
      metadata: { joe: metadata(message) },
    },
  };
}
export async function ensureConversation(session: string) {
  store.requireSession(session);
  const id = threadId(session);
  const thread = await joeMemory.getThreadById({ threadId: id });
  if (thread && thread.resourceId !== resourceId) throw new Error('会话不属于当前用户');
  if (thread?.metadata?.joeCanonical) {
    const greeting = store.messages(session).find(message => message.kind === 'greeting');
    if (greeting && thread.metadata.joeGreeting !== greeting.id) {
      await joeMemory.saveMessages({ messages: [{ ...memoryMessage(greeting), id: `joe:${greeting.id}` }] });
      await joeMemory.updateThread({ id, metadata: { ...thread.metadata, joeGreeting: greeting.id } });
    }
    return;
  }
  if (!thread)
    await joeMemory.createThread({
      threadId: id,
      resourceId,
      title: 'Joe conversation',
    });
  const legacy = store.messages(session);
  // Stable IDs allow retrying migration. Old rows remain a read-only rollback archive.
  if (legacy.length)
    await joeMemory.saveMessages({
      messages: legacy.map((m, i) => ({
        ...memoryMessage({ ...m, createdAt: m.createdAt + i }),
        id: `joe:${m.id}`,
      })),
    });
  await joeMemory.updateThread({
    id,
    metadata: { ...thread?.metadata, joeCanonical: true, joeGreeting: legacy.find(message => message.kind === 'greeting')?.id },
  });
}
export async function conversationMessages(session: string): Promise<Message[]> {
  await ensureConversation(session);
  const { messages } = await joeMemory.recall({
    threadId: threadId(session),
    resourceId,
    perPage: false,
  });
  let lastUser: Message | undefined;
  return messages.flatMap((m) => {
    const data = m.content.metadata?.joe as (Omit<Message, 'text'> & { displayText?: string }) | undefined;
    const raw = m.content.parts
      .filter((p) => p.type === 'text')
      .map((p) => p.text)
      .join('');
    let text = raw;
    try {
      text = answerSchema.parse(JSON.parse(raw)).text;
    } catch {
      /* Legacy messages are plain text. */
    }
    if (!data) {
      // A process crash can occur after native persistence but before UI metadata is attached.
      if (m.role !== 'assistant' || !lastUser || !raw.trim()) return [];
      const parsed = answerSchema.safeParse(
        (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })(),
      );
      return [
        {
          ...lastUser,
          id: m.id,
          role: 'assistant' as const,
          text: parsed.success ? parsed.data.text : '',
          expression: parsed.success ? parsed.data.expression : lastUser.expression,
          attachments: [],
          status: 'interrupted',
          createdAt: m.createdAt.getTime(),
        },
      ];
    }
    const { displayText, ...ui } = data;
    if (ui.role === 'user') lastUser = { ...ui, text: displayText ?? text };
    return [
      {
        ...ui,
        text: ui.kind === 'greeting' ? greetingText : displayText ?? text,
        ...(ui.kind === 'greeting' ? { audioUrl: greetingAudio } : {}),
        status: ui.status === 'streaming' ? 'interrupted' : ui.status,
      },
    ];
  });
}
export async function persistTurn(user: Message, answer: Message, native: MastraDBMessage[]) {
  const assistant = native.filter((m) => m.role === 'assistant').at(-1);
  const userMessage = native.find((m) => m.id === user.id) ?? memoryMessage(user);
  const answerMessage = assistant ?? memoryMessage(answer);
  await joeMemory.saveMessages({
    messages: [
      {
        ...userMessage,
        content: {
          ...userMessage.content,
          metadata: { ...userMessage.content.metadata, joe: metadata(user) },
        },
      },
      {
        ...answerMessage,
        threadId: threadId(answer.sessionId),
        resourceId,
        content: {
          ...answerMessage.content,
          parts: [
            ...answerMessage.content.parts.filter((p) => p.type !== 'text'),
            { type: 'text', text: answer.text },
          ],
          metadata: {
            ...answerMessage.content.metadata,
            joe: metadata(answer),
          },
        },
      },
    ],
  });
}

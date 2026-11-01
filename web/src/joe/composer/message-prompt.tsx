import type { Message } from '../types';
import { attachmentUrl } from '../../components/rare-ui/attachment-list';
import { MessageImage } from '../../components/rare-ui/message-image';

export function MessagePrompt({ message }: { message: Message }) {
  const index = message.command === 'tally' ? message.text.indexOf('/tally') : -1;
  return <span>
    {index >= 0 ? `${message.text.slice(0, index)}记账${message.text.slice(index + 6)}` : message.text}
    {message.attachments.map(file => <span key={file.id} className="mt-2 block">
      {file.mime?.startsWith('image/') ? <MessageImage src={attachmentUrl(message.sessionId, file.id)} name={file.name} /> : <span className="text-white/50">↗ {file.name}</span>}
    </span>)}
  </span>;
}

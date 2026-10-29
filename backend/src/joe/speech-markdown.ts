import { marked, type Token } from 'marked';

export function speechMarkdown(text: string) {
  const tokens = marked.lexer(text);
  let formatted = false;
  marked.walkTokens(tokens, token => {
    if (['heading', 'list', 'code', 'codespan', 'strong', 'em', 'del', 'link', 'image', 'table', 'blockquote', 'hr'].includes(token.type)) formatted = true;
  });
  if (!formatted) return text;
  function read(items: Token[]): string {
    return items.map(token => {
      if (token.type === 'code') return '以下是代码。';
      if (token.type === 'html' || token.type === 'hr' || token.type === 'def') return '';
      if (token.type === 'list') return token.items.map((item: { tokens: Token[] }) => read(item.tokens)).join('\n');
      if (token.type === 'table') return [token.header, ...token.rows].map((row: { tokens: Token[] }[]) => row.map(cell => read(cell.tokens)).join('，')).join('\n');
      if ('tokens' in token && token.tokens) return read(token.tokens) + (['heading', 'paragraph', 'blockquote'].includes(token.type) ? '\n' : '');
      if (token.type === 'space' || token.type === 'br') return '\n';
      return 'text' in token && typeof token.text === 'string' ? token.text : '';
    }).join('');
  }
  return read(tokens).trim() || '以下是代码。';
}

export type OrdinaryCard = 'costs' | 'settings';
export type CardId = OrdinaryCard | 'conversation';
export type Workspace = { primary: CardId; ordinary: OrdinaryCard | null; conversation: boolean };
export const initialWorkspace: Workspace = { primary: 'conversation', ordinary: 'costs', conversation: true };

export function openCard(state: Workspace, card: CardId): Workspace {
  return card === 'conversation'
    ? { ...state, primary: card, conversation: true }
    : { ...state, primary: card, ordinary: card };
}

export function closeCard(state: Workspace, card: CardId): Workspace {
  if (card === 'conversation') {
    if (state.primary === card || !state.ordinary) return state;
    return { ...state, conversation: false };
  }
  if (state.ordinary !== card) return state;
  return { primary: 'conversation', ordinary: null, conversation: true };
}

export function swapCards(state: Workspace): Workspace {
  if (!state.conversation || !state.ordinary) return state;
  return { ...state, primary: state.primary === 'conversation' ? state.ordinary : 'conversation' };
}

export const cardNames: Record<CardId, string> = {
  conversation: '对话', costs: '费用', settings: '设置',
};

import type { ProviderBilling } from '../../../shared/provider-billing';
import type { VideoPlaybackRequest } from '../../../shared/video-playback';
import type { ShortcutId } from '../../../shared/shortcuts';
export type Emotion = 'calm' | 'curious' | 'joy' | 'empathy' | 'encouraging' | 'serious' | 'concerned';
export type AgentState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'tool-running'
  | 'responding'
  | 'speaking'
  | 'interrupted'
  | 'blocked'
  | 'error'
  | 'offline';
export type Expression = { emotion: Emotion; intensity: number };
export type Attachment = { id: string; name: string; mime?: string };
export type Message = {
  id: string;
  sessionId: string;
  turnId: string;
  role: 'user' | 'assistant';
  text: string;
  command?: ShortcutId;
  kind?: 'greeting';
  audioUrl?: string;
  visibleText?: string;
  speechText?: string;
  speechLanguage?: 'en' | 'zh';
  status: string;
  error?: string;
  model: string;
  expression: Expression;
  attachments: Attachment[];
  createdAt: number;
  sources?: { title: string; url: string }[];
};
export type Settings = {
  voice: boolean;
  defaultMuted: boolean;
  voiceLanguage: 'auto' | 'en' | 'zh';
  model: string;
  city: string;
  timezone: string;
};
export type Cost = { known: number; pending: number };
export type Usage = {
  billing?: ProviderBilling;
  input: number;
  output: number;
  tokensPending: number;
  model: Cost;
  modelLifetime: Cost;
  voice: Cost;
  total: Cost;
  uptimeMs: number;
  currency: string;
  estimated: boolean;
};
export type Bootstrap = {
  models: { id: string; label: string }[];
  configured: {
    llm: boolean;
    tts: boolean;
    asr: boolean;
    zendocs: boolean;
    voiceProfiles?: { en: boolean; zh: boolean };
    voiceProviders?: { asr: string; tts: string };
  };
  settings: Settings;
  usage: Usage;
};
export type Weather = {
  configured: boolean;
  place?: string;
  temperature?: number;
  feelsLike?: number;
  windKph?: number;
  minimum?: number;
  forecastDate?: string;
  condition?: string;
  conditionCode?: number;
  isDay?: boolean;
  sunrise?: string;
  sunset?: string;
  timezone?: string;
  updatedAt?: number;
  source?: string;
};
export type AgentEvent = {
  sessionId: string;
  type: string;
  turnId: string;
  state?: AgentState;
  expression?: Expression;
  text?: string;
  message?: Message | string;
  user?: Message;
  assistant?: Message;
  sources?: { title: string; url: string }[];
  card?: 'costs' | 'settings' | 'weather' | 'video' | 'finance';
  instance?: unknown;
  resource?: unknown;
  playback?: VideoPlaybackRequest;
};

export type VoiceAccount = {
  provider: string;
  updatedAt?: number;
  error?: string;
  used?: number;
  limit?: number;
  resetAt?: number | null;
  tier?: string;
  nextInvoice?: number | null;
  currency?: string | null;
  balance?: string;
  remainingCredits?: number;
};

import { VoiceHttpError } from '../voice-errors';
export async function checked(response: Response, label: string) {
  if (!response.ok) {
    let code = '';
    let requestId = '';
    if (label === 'ElevenLabs') {
      const reader = response.body?.getReader();
      if (reader) {
        let body = '';
        try {
          const decoder = new TextDecoder();
          while (body.length < 8192) {
            const { done, value } = await reader.read();
            if (done) break;
            body += decoder.decode(value, { stream: true });
          }
          const data = JSON.parse(body);
          const detail = data.detail;
          const known = ['quota_exceeded', 'paid_plan_required', 'voice_not_found', 'missing_permissions'];
          code =
            [detail?.code, detail?.status, data.code].find(
              (value) => typeof value === 'string' && known.includes(value),
            ) || '';
          const trace =
            detail?.request_id ??
            data.request_id ??
            response.headers.get('request-id') ??
            response.headers.get('x-request-id');
          if (typeof trace === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(trace)) requestId = trace;
        } catch {
          /* Unknown responses fall back to HTTP status without exposing their body. */
        } finally {
          await reader.cancel().catch(() => {});
          reader.releaseLock();
        }
      }
    } else await response.body?.cancel().catch(() => {});
    throw new VoiceHttpError(response.status, label, code, requestId);
  }
  return response;
}
export async function mp3(response: Response) {
  const audio = await response.arrayBuffer();
  if (!audio.byteLength) throw new SyntaxError('Empty provider audio');
  return { audio, contentType: 'audio/mpeg' as const };
}

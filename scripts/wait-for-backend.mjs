import { setTimeout } from 'node:timers/promises';
export async function waitForBackend({ url = 'http://127.0.0.1:4111/joe-api/health', timeout = 60000, signal } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    signal?.throwIfAborted();
    try {
      const response = await fetch(url, {
        signal: AbortSignal.any([AbortSignal.timeout(1000), ...(signal ? [signal] : [])]),
      });
      const data = response.ok ? await response.json() : null;
      if (data?.service === 'joe-backend' && data.ready === true) return;
    } catch {
      signal?.throwIfAborted();
    }
    await setTimeout(150, undefined, { signal });
  }
  throw new Error('Mastra 在 60 秒内未就绪，请检查后端日志及 4111 端口');
}

import type { WidgetStore } from './widget-store';

export function widgetEventStream(widgets: WidgetStore, canvasId: string, after: number, signal: AbortSignal) {
  widgets.requireCanvas(canvasId);
  let cursor = after;
  const encoder = new TextEncoder();
  let stop: (() => void) | undefined;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        signal.removeEventListener('abort', close);
        controller.close();
      };
      const send = () => {
        if (closed) return;
        try {
          for (const event of widgets.events(canvasId, cursor)) {
            cursor = Number(event.cursor);
            controller.enqueue(encoder.encode(`id: ${event.cursor}\nevent: widget\ndata: ${JSON.stringify(event)}\n\n`));
          }
        } catch (error) {
          closed = true;
          clearInterval(timer);
          signal.removeEventListener('abort', close);
          controller.error(error);
        }
      };
      const timer = setInterval(send, 1000);
      stop = close;
      signal.addEventListener('abort', close, { once: true });
      if (signal.aborted) close(); else send();
    },
    cancel() { stop?.(); },
  });
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' } });
}

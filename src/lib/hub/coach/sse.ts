import type { CoachEvent } from "./loop";

/** Server-Sent Events response; the loop keeps running to completion even if the client disconnects. */
export function sseResponse(run: (send: (e: CoachEvent) => void) => Promise<void>, conversationId: string): Response {
  const encoder = new TextEncoder();
  let clientGone = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: CoachEvent) => {
        if (clientGone) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          clientGone = true;
        }
      };
      send({ type: "start", conversationId });
      try {
        await run(send);
        send({ type: "done", conversationId });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        if (!clientGone) {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      }
    },
    cancel() {
      clientGone = true;
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" } });
}

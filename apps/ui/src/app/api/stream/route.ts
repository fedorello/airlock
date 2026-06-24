import { formatSse, sseKeepAlive } from "@/application/sse";
import type { Unsubscribe } from "@/application/ports";
import { getContainer } from "@/core/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEEP_ALIVE_MS = 15000;

/** Streams live approval/run events to the browser over Server-Sent Events. */
export function GET(request: Request): Response {
  const { eventSource, logger } = getContainer();
  const encoder = new TextEncoder();
  let unsubscribe: Unsubscribe | null = null;
  let keepAlive: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      unsubscribe = await eventSource.subscribe((event) => {
        controller.enqueue(encoder.encode(formatSse(event)));
      });
      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(sseKeepAlive()));
      }, KEEP_ALIVE_MS);
      logger.debug("sse client connected");
    },
    async cancel() {
      if (keepAlive !== null) {
        clearInterval(keepAlive);
      }
      if (unsubscribe !== null) {
        await unsubscribe();
      }
      logger.debug("sse client disconnected");
    },
  });

  request.signal.addEventListener("abort", () => {
    void stream.cancel();
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

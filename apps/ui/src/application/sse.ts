import type { ApprovalEvent } from "./ports";

/** Format one event as a Server-Sent Events frame. The browser's EventSource
 * splits on the blank line, so every frame ends with two newlines. */
export function formatSse(event: ApprovalEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** A keep-alive comment frame, sent periodically so proxies don't drop an idle
 * connection. Comment lines (starting with `:`) are ignored by EventSource. */
export function sseKeepAlive(): string {
  return ": keep-alive\n\n";
}

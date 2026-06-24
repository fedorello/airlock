import type { Message } from "@/domain/contract";

function describe(message: Message): string {
  if (message.role === "assistant" && message.toolCalls.length > 0) {
    return `calls ${message.toolCalls.map((call) => call.name).join(", ")}`;
  }
  return message.content;
}

/** The run's conversation so far — the context behind this pending action. */
export function Timeline({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return null;
  }
  return (
    <details className="text-xs">
      <summary className="text-muted-foreground cursor-pointer select-none">
        Context ({messages.length} steps)
      </summary>
      <ol className="border-border mt-2 flex flex-col gap-1 border-l pl-3">
        {messages.map((message, index) => (
          <li key={index}>
            <span className="text-muted-foreground font-medium">
              {message.role}
            </span>
            <span className="ml-2">{describe(message)}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}

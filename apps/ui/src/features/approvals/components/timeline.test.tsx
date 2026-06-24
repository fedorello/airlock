import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Message } from "@/domain/contract";

import { Timeline } from "./timeline";

describe("Timeline", () => {
  it("renders nothing when there are no messages", () => {
    const { container } = render(<Timeline messages={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("summarizes user content and assistant tool calls", () => {
    const messages: Message[] = [
      { role: "user", content: "Refund Alice" },
      {
        role: "assistant",
        content: "",
        toolCalls: [{ id: "c1", name: "issue_refund", args: {} }],
      },
    ];

    render(<Timeline messages={messages} />);

    expect(screen.getByText("Refund Alice")).toBeInTheDocument();
    expect(screen.getByText("calls issue_refund")).toBeInTheDocument();
  });
});

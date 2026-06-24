import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PendingApproval } from "@/domain/pending-approval";

import { ApprovalCard } from "./approval-card";

const APPROVAL: PendingApproval = {
  runId: "run-1",
  requestId: "req-1",
  toolName: "issue_refund",
  args: { amount: 49.99 },
  risk: "sensitive",
  request: "Refund Alice",
  timeline: [],
};

describe("ApprovalCard", () => {
  it("renders the tool, request, and arguments", () => {
    render(
      <ApprovalCard
        approval={APPROVAL}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(screen.getByText("issue_refund")).toBeInTheDocument();
    expect(screen.getByText("Refund Alice")).toBeInTheDocument();
    expect(screen.getByText(/49\.99/)).toBeInTheDocument();
  });

  it("calls onApprove and onReject when the buttons are clicked", async () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <ApprovalCard
        approval={APPROVAL}
        onApprove={onApprove}
        onReject={onReject}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /approve/i }));
    await userEvent.click(screen.getByRole("button", { name: /reject/i }));

    expect(onApprove).toHaveBeenCalledOnce();
    expect(onReject).toHaveBeenCalledOnce();
  });

  it("disables the actions when busy", () => {
    render(
      <ApprovalCard
        approval={APPROVAL}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        isBusy
      />,
    );

    expect(screen.getByRole("button", { name: /approve/i })).toBeDisabled();
  });
});

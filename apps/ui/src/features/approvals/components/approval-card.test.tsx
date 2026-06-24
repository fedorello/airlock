import { fireEvent, render, screen } from "@testing-library/react";
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
  timeline: [{ role: "user", content: "Please refund order ord-42" }],
};

function setup(overrides: Partial<Parameters<typeof ApprovalCard>[0]> = {}) {
  const onApprove = vi.fn();
  const onApproveWithEdits = vi.fn();
  const onReject = vi.fn();
  render(
    <ApprovalCard
      approval={APPROVAL}
      onApprove={onApprove}
      onApproveWithEdits={onApproveWithEdits}
      onReject={onReject}
      {...overrides}
    />,
  );
  return { onApprove, onApproveWithEdits, onReject };
}

describe("ApprovalCard", () => {
  it("renders the tool, request, args, and context", () => {
    setup();

    expect(screen.getByText("issue_refund")).toBeInTheDocument();
    expect(screen.getByText("Refund Alice")).toBeInTheDocument();
    expect(screen.getByText(/49\.99/)).toBeInTheDocument();
    expect(screen.getByText(/Context/)).toBeInTheDocument();
  });

  it("approves directly", async () => {
    const { onApprove } = setup();

    await userEvent.click(screen.getByRole("button", { name: /^approve$/i }));

    expect(onApprove).toHaveBeenCalledOnce();
  });

  it("edits the arguments and approves with the parsed object", async () => {
    const { onApproveWithEdits } = setup();

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText(/edit arguments/i), {
      target: { value: '{"amount": 5}' },
    });
    await userEvent.click(
      screen.getByRole("button", { name: /approve with changes/i }),
    );

    expect(onApproveWithEdits).toHaveBeenCalledWith({ amount: 5 });
  });

  it("shows an error for invalid JSON and does not submit", async () => {
    const { onApproveWithEdits } = setup();

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText(/edit arguments/i), {
      target: { value: "not json" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: /approve with changes/i }),
    );

    expect(screen.getByText(/valid JSON/i)).toBeInTheDocument();
    expect(onApproveWithEdits).not.toHaveBeenCalled();
  });

  it("requires a reason before rejecting", async () => {
    const { onReject } = setup();

    await userEvent.click(screen.getByRole("button", { name: /^reject$/i }));
    const confirm = screen.getByRole("button", { name: /confirm reject/i });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: "Not allowed" },
    });
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);

    expect(onReject).toHaveBeenCalledWith("Not allowed");
  });

  it("disables the actions when busy", () => {
    setup({ isBusy: true });

    expect(screen.getByRole("button", { name: /^approve$/i })).toBeDisabled();
  });
});

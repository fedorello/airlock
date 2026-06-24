import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PendingApproval } from "@/domain/pending-approval";

import { ApprovalsView } from "./approvals-view";

const APPROVAL: PendingApproval = {
  runId: "run-1",
  requestId: "req-1",
  toolName: "issue_refund",
  args: {},
  risk: "sensitive",
  request: "",
  timeline: [],
};

function renderView(props: Partial<Parameters<typeof ApprovalsView>[0]> = {}) {
  render(
    <ApprovalsView
      approvals={[]}
      status="ready"
      busyRunId={null}
      onApprove={vi.fn()}
      onReject={vi.fn()}
      {...props}
    />,
  );
}

describe("ApprovalsView", () => {
  it("shows a loading state", () => {
    renderView({ status: "loading" });

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    renderView({ status: "error" });

    expect(screen.getByText(/Could not load approvals/)).toBeInTheDocument();
  });

  it("shows the empty state when there are no approvals", () => {
    renderView({ status: "ready", approvals: [] });

    expect(screen.getByText("No actions waiting")).toBeInTheDocument();
  });

  it("renders a card per pending approval", () => {
    renderView({ status: "ready", approvals: [APPROVAL] });

    expect(screen.getByText("issue_refund")).toBeInTheDocument();
  });
});

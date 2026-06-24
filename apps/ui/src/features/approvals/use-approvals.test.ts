import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PendingApproval } from "@/domain/pending-approval";

import { useApprovals } from "./use-approvals";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  closed = false;

  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }

  close(): void {
    this.closed = true;
  }
}

const PENDING: PendingApproval = {
  runId: "run-1",
  requestId: "req-1",
  toolName: "send_email",
  args: {},
  risk: "sensitive",
  request: "",
  timeline: [],
};

function jsonResponse(value: unknown): Response {
  return { ok: true, json: () => Promise.resolve(value) } as Response;
}

function emit(data: unknown): void {
  const source = FakeEventSource.instances[0];
  act(() => {
    source.onmessage?.({ data: JSON.stringify(data) } as MessageEvent<string>);
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeEventSource.instances = [];
});

describe("useApprovals", () => {
  it("starts from the server-rendered approvals", () => {
    vi.stubGlobal("EventSource", FakeEventSource);

    const { result } = renderHook(() => useApprovals([PENDING]));

    expect(result.current.status).toBe("ready");
    expect(result.current.approvals).toHaveLength(1);
  });

  it("removes a run when a run.completed event arrives", () => {
    vi.stubGlobal("EventSource", FakeEventSource);

    const { result } = renderHook(() => useApprovals([PENDING]));
    emit({ topic: "run.completed", runId: "run-1" });

    expect(result.current.approvals).toHaveLength(0);
  });

  it("reloads when an approval.requested event arrives", async () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({ approvals: [PENDING] }))),
    );

    const { result } = renderHook(() => useApprovals([]));
    emit({ topic: "approval.requested", request: {} });

    await waitFor(() => {
      expect(result.current.approvals).toHaveLength(1);
    });
  });

  it("sets an error status when a reload fails", async () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 500 } as Response)),
    );

    const { result } = renderHook(() => useApprovals([]));
    emit({ topic: "approval.requested", request: {} });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
  });

  it("optimistically removes an approval and posts the decision", async () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    const fetchMock = vi.fn((input: RequestInfo | URL) =>
      String(input).includes("/decision")
        ? Promise.resolve({ ok: true } as Response)
        : Promise.resolve(jsonResponse({ approvals: [PENDING] })),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useApprovals([PENDING]));

    await act(async () => {
      await result.current.decide(result.current.approvals[0], {
        type: "approve",
        approver: "me",
      });
    });

    expect(result.current.approvals).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/approvals/run-1/decision",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("reports failure and restores the queue when a decision fails", async () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    const fetchMock = vi.fn((input: RequestInfo | URL) =>
      String(input).includes("/decision")
        ? Promise.resolve({ ok: false, status: 500 } as Response)
        : Promise.resolve(jsonResponse({ approvals: [PENDING] })),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useApprovals([PENDING]));
    let ok = true;
    await act(async () => {
      ok = await result.current.decide(result.current.approvals[0], {
        type: "approve",
        approver: "me",
      });
    });

    expect(ok).toBe(false);
    await waitFor(() => {
      expect(result.current.approvals).toHaveLength(1);
    });
  });
});

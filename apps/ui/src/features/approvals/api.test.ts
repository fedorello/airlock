import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchApprovals, submitDecision } from "./api";

function mockFetch(response: Partial<Response>): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(response as Response)),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchApprovals", () => {
  it("returns the approvals array on success", async () => {
    mockFetch({
      ok: true,
      json: () => Promise.resolve({ approvals: [{ runId: "r1" }] }),
    });

    const approvals = await fetchApprovals();

    expect(approvals).toEqual([{ runId: "r1" }]);
  });

  it("throws on a non-ok response", async () => {
    mockFetch({ ok: false, status: 500 });

    await expect(fetchApprovals()).rejects.toThrow("Failed to load approvals");
  });
});

describe("submitDecision", () => {
  it("posts the decision", async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true } as Response));
    vi.stubGlobal("fetch", fetchMock);

    await submitDecision("run-1", "req-1", { type: "approve", approver: "me" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/approvals/run-1/decision",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws on a non-ok response", async () => {
    mockFetch({ ok: false, status: 400 });

    await expect(
      submitDecision("run-1", "req-1", { type: "approve", approver: "me" }),
    ).rejects.toThrow("Decision failed");
  });
});

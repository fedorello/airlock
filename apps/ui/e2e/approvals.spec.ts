import { expect, test } from "@playwright/test";

// The browser-facing API is mocked so the e2e is deterministic and needs no
// agent (CODING_PRINCIPLES §10.5). The page server-renders from an empty Redis,
// then a live SSE event reveals the pending action.

const PENDING = {
  runId: "e2e-run-1",
  requestId: "e2e-req-1",
  toolName: "issue_refund",
  args: { amount: 49.99, orderId: "ord-42" },
  risk: "sensitive",
  request: "Refund Alice for order ord-42",
  timeline: [{ role: "user", content: "Refund Alice for order ord-42" }],
};

test("a pending action appears live, and approving it clears the queue", async ({
  page,
}) => {
  let decided = false;

  await page.route("**/api/approvals", async (route) => {
    await route.fulfill({ json: { approvals: decided ? [] : [PENDING] } });
  });
  await page.route("**/api/stream", async (route) => {
    await route.fulfill({
      headers: { "content-type": "text/event-stream" },
      body: 'data: {"topic":"approval.requested","request":{}}\n\n',
    });
  });
  await page.route("**/api/approvals/*/decision", async (route) => {
    decided = true;
    await route.fulfill({ json: { ok: true } });
  });

  await page.goto("/");

  // The SSE event triggers a reload; the pending card appears.
  await expect(page.getByText("issue_refund")).toBeVisible();
  await expect(page.getByText("Needs approval")).toBeVisible();

  await page.getByRole("button", { name: /^approve$/i }).click();

  // The card is removed and the queue settles to the empty state.
  await expect(page.getByText("issue_refund")).toBeHidden();
  await expect(page.getByText("No actions waiting")).toBeVisible();
  expect(decided).toBe(true);
});

import { describe, expect, it } from "vitest";

import { humanizeAction } from "./humanize";

describe("humanizeAction", () => {
  it("maps a known tool to a verb and summarizes money and order", () => {
    const { title, detail } = humanizeAction("issue_refund", {
      amount: 49.99,
      orderId: "ord-42",
    });

    expect(title).toBe("Issue a refund");
    expect(detail).toBe("$49.99 · order ord-42");
  });

  it("summarizes an email recipient and subject", () => {
    const { title, detail } = humanizeAction("send_email", {
      to: "a@b.test",
      subject: "Your refund",
    });

    expect(title).toBe("Send an email");
    expect(detail).toBe("to a@b.test · “Your refund”");
  });

  it("titleizes an unknown tool and returns no detail for unknown args", () => {
    const { title, detail } = humanizeAction("delete_widget", { flag: true });

    expect(title).toBe("Delete widget");
    expect(detail).toBe("");
  });
});

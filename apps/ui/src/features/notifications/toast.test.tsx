import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ToastProvider, toastReducer, useToast } from "./toast";

describe("toastReducer", () => {
  it("adds a toast with an incrementing id", () => {
    const state = toastReducer(
      { toasts: [], nextId: 0 },
      {
        kind: "add",
        message: "hi",
        variant: "info",
      },
    );

    expect(state.toasts).toEqual([{ id: 0, message: "hi", variant: "info" }]);
    expect(state.nextId).toBe(1);
  });

  it("removes a toast by id", () => {
    const start = {
      toasts: [{ id: 0, message: "hi", variant: "info" as const }],
      nextId: 1,
    };

    expect(toastReducer(start, { kind: "remove", id: 0 }).toasts).toHaveLength(
      0,
    );
  });
});

function Trigger() {
  const { notify } = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        notify("Something failed", "error");
      }}
    >
      go
    </button>
  );
}

describe("ToastProvider", () => {
  it("shows a toast when notify is called", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "go" }));

    expect(screen.getByText("Something failed")).toBeInTheDocument();
  });

  it("dismisses a toast when clicked", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "go" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Something failed" }),
    );

    expect(screen.queryByText("Something failed")).not.toBeInTheDocument();
  });

  it("throws when useToast is used without a provider", () => {
    expect(() => render(<Trigger />)).toThrow(/ToastProvider/);
  });
});

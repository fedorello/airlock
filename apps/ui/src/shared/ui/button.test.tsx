import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/shared/ui/button";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Approve</Button>);

    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
  });

  it("applies the reject variant", () => {
    render(<Button variant="reject">Reject</Button>);

    expect(screen.getByRole("button")).toHaveClass("bg-rejected");
  });

  it("calls onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled when the disabled prop is set", () => {
    render(<Button disabled>Go</Button>);

    expect(screen.getByRole("button")).toBeDisabled();
  });
});

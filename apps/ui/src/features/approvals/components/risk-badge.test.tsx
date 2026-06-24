import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RiskBadge } from "./risk-badge";

describe("RiskBadge", () => {
  it("shows 'Needs approval' for a sensitive action", () => {
    render(<RiskBadge risk="sensitive" />);

    expect(screen.getByText("Needs approval")).toBeInTheDocument();
  });

  it("shows 'Safe' otherwise", () => {
    render(<RiskBadge risk="safe" />);

    expect(screen.getByText("Safe")).toBeInTheDocument();
  });
});

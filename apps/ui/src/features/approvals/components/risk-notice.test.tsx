import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RiskNotice } from "./risk-notice";

describe("RiskNotice", () => {
  it("renders nothing without flags", () => {
    const { container } = render(<RiskNotice flags={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("lists each flag with a review prompt", () => {
    render(
      <RiskNotice flags={["Moves $5,000.00", "Sends to attacker@evil"]} />,
    );

    expect(screen.getByText(/review carefully/i)).toBeInTheDocument();
    expect(screen.getByText("Moves $5,000.00")).toBeInTheDocument();
    expect(screen.getByText("Sends to attacker@evil")).toBeInTheDocument();
  });
});

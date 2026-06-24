import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Explainer } from "./explainer";

describe("Explainer", () => {
  it("explains the problem and the gate", () => {
    render(<Explainer />);

    expect(screen.getByText(/Why you’re seeing this/)).toBeInTheDocument();
    expect(screen.getByText(/prompt injection/)).toBeInTheDocument();
    expect(
      screen.getByText(/Airlock gates the dangerous steps/),
    ).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteHeader } from "@/shared/ui/site-header";

describe("SiteHeader", () => {
  it("renders the product name and a subtitle", () => {
    render(<SiteHeader />);

    expect(screen.getByText("Airlock")).toBeInTheDocument();
    expect(screen.getByText("Approvals dashboard")).toBeInTheDocument();
  });
});

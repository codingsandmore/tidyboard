import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StreakIndicator } from "./streak-indicator";

describe("StreakIndicator", () => {
  it("shows zero state when count=0", () => {
    render(<StreakIndicator count={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });
  it("shows count + flame", () => {
    render(<StreakIndicator count={7} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("🔥")).toBeInTheDocument();
  });
  it("applies hot data attribute at 100% (count=max)", () => {
    const { container } = render(<StreakIndicator count={7} max={7} />);
    expect(container.firstChild).toHaveAttribute("data-hot", "true");
  });
  it("not hot when count < max", () => {
    const { container } = render(<StreakIndicator count={5} max={7} />);
    expect(container.firstChild).toHaveAttribute("data-hot", "false");
  });
  it("not hot when count > 0 but max not provided", () => {
    const { container } = render(<StreakIndicator count={5} />);
    expect(container.firstChild).toHaveAttribute("data-hot", "false");
  });
});

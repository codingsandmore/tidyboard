import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RewardCard } from "./reward-card";

describe("RewardCard", () => {
  const baseReward = {
    id: "r1", household_id: "h1", name: "Stickers", description: "",
    image_url: null, cost_points: 50,
    fulfillment_kind: "self_serve" as const, active: true,
    created_at: "", updated_at: "",
  };

  it("renders name and effective cost", () => {
    render(<RewardCard reward={baseReward} effectiveCost={50} balance={100} />);
    expect(screen.getByText("Stickers")).toBeInTheDocument();
    expect(screen.getByText("50 pts")).toBeInTheDocument();
  });
  it("disables redeem button when balance < effective cost", () => {
    render(<RewardCard reward={baseReward} effectiveCost={50} balance={10} />);
    expect(screen.getByRole("button", { name: /need 40 more/i })).toBeDisabled();
  });
  it("shows progress when goal mode is active", () => {
    render(<RewardCard reward={baseReward} effectiveCost={100} balance={40} goalMode />);
    expect(screen.getByText(/40\s*\/\s*100/)).toBeInTheDocument();
  });
});

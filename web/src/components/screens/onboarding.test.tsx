import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Onboarding, ONBOARDING_LABELS } from "./onboarding";

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("Onboarding", () => {
  it("renders step 0 (Welcome) without crashing", () => {
    render(<Onboarding step={0} />);
    expect(screen.getByText("Get Started")).toBeTruthy();
  });

  it("shows Welcome home text on step 0", () => {
    render(<Onboarding step={0} />);
    expect(screen.getByText(/Welcome home/)).toBeTruthy();
  });

  it("renders step 1 (Create account) without crashing", () => {
    render(<Onboarding step={1} />);
    expect(screen.getByText("Create Account")).toBeTruthy();
  });

  it("step 1 confirms the account is already ready", () => {
    render(<Onboarding step={1} />);
    expect(screen.getByText(/Your Tidyboard account is ready/)).toBeTruthy();
  });

  it("step 2 shows timezone input", () => {
    render(<Onboarding step={2} />);
    expect(screen.getByLabelText("Household timezone")).toBeTruthy();
  });

  it("renders step 2 (Household) without crashing", () => {
    render(<Onboarding step={2} />);
    expect(screen.getByText(/What should we call your family/)).toBeTruthy();
  });

  it("renders step 3 (Self) without crashing", () => {
    render(<Onboarding step={3} />);
    expect(screen.getByText(/Tell us about you/)).toBeTruthy();
  });

  it("step 3 allows color selection", () => {
    render(<Onboarding step={3} />);
    // Multiple color circles exist — clicking one shouldn't crash
    const { container } = render(<Onboarding step={3} />);
    const colorDivs = container.querySelectorAll("div[style*='border-radius: 50%'][style*='cursor: pointer']");
    if (colorDivs.length > 0) {
      fireEvent.click(colorDivs[0]);
    }
    expect(screen.getAllByText(/Tell us about you/).length).toBeGreaterThan(0);
  });

  it("renders step 4 (Family) without crashing", () => {
    render(<Onboarding step={4} />);
    expect(screen.getByText(/Add your family/)).toBeTruthy();
  });

  it("step 4 shows member count badge", () => {
    render(
      <Onboarding
        step={4}
        familyMembers={[
          {
            id: "m1",
            name: "Avery",
            display_name: "Avery",
            role: "child",
            age_group: "child",
            color: "#22C55E",
          },
        ]}
      />
    );
    expect(screen.getByText("1 added")).toBeTruthy();
  });

  it("renders step 5 (Calendar) without crashing", () => {
    renderWithQuery(<Onboarding step={5} />);
    expect(screen.getByText(/Sync your calendar/)).toBeTruthy();
  });

  it("renders step 6 (Landing) without crashing", () => {
    render(<Onboarding step={6} />);
    expect(screen.getByText(/You're all set/)).toBeTruthy();
  });

  it("falls back to welcome for invalid step", () => {
    render(<Onboarding step={99} />);
    expect(screen.getByText("Get Started")).toBeTruthy();
  });

  it("ONBOARDING_LABELS has 7 entries", () => {
    expect(ONBOARDING_LABELS).toHaveLength(7);
  });
});

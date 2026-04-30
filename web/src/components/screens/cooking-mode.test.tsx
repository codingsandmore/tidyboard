import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CookingMode } from "./cooking-mode";

// ── Mock next/navigation ───────────────────────────────────────────────────

const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack, push: vi.fn(), replace: vi.fn() }),
}));

// ── Mock wake lock ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal("navigator", {
    ...navigator,
    wakeLock: {
      request: vi.fn().mockResolvedValue({
        release: vi.fn().mockResolvedValue(undefined),
      }),
    },
  });
});

// ── Mock useRecipe ─────────────────────────────────────────────────────────

const RECIPE_WITH_STEPS = {
  id: "r1",
  title: "Spaghetti Carbonara",
  source: "seriouseats.com",
  prep: 10,
  cook: 20,
  total: 30,
  serves: 4,
  rating: 4,
  tag: ["italian"],
  steps: [
    "Bring a large pot of salted water to a boil.",
    "Cook pancetta in a wide skillet over medium heat for 6 min.",
    "Whisk yolks, whole egg, cheese and pepper in a bowl.",
  ],
};

vi.mock("@/lib/api/hooks", () => ({
  useRecipe: (id: string) => ({
    data: id === "r1" ? RECIPE_WITH_STEPS : undefined,
  }),
  useRecipeCollections: () => ({ data: [] }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("CookingMode", () => {
  it("renders step 1 text and counter", () => {
    render(<CookingMode recipeId="r1" />, { wrapper });
    expect(screen.getByTestId("step-text")).toHaveTextContent(
      "Bring a large pot"
    );
    expect(screen.getByTestId("step-counter")).toHaveTextContent("1 / 3");
  });

  it("advances to next step on Next click", () => {
    render(<CookingMode recipeId="r1" />, { wrapper });
    fireEvent.click(screen.getByTestId("cook-next"));
    expect(screen.getByTestId("step-counter")).toHaveTextContent("2 / 3");
    expect(screen.getByTestId("step-text")).toHaveTextContent("Cook pancetta");
  });

  it("goes back to previous step on Prev click", () => {
    render(<CookingMode recipeId="r1" />, { wrapper });
    fireEvent.click(screen.getByTestId("cook-next"));
    fireEvent.click(screen.getByTestId("cook-prev"));
    expect(screen.getByTestId("step-counter")).toHaveTextContent("1 / 3");
  });

  it("previous button is disabled on first step", () => {
    render(<CookingMode recipeId="r1" />, { wrapper });
    const prevBtn = screen.getByTestId("cook-prev") as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(true);
  });

  it("shows Done button on last step", () => {
    render(<CookingMode recipeId="r1" />, { wrapper });
    fireEvent.click(screen.getByTestId("cook-next"));
    fireEvent.click(screen.getByTestId("cook-next"));
    expect(screen.getByTestId("cook-finish")).toBeInTheDocument();
  });

  it("calls router.back() when Exit is clicked", () => {
    render(<CookingMode recipeId="r1" />, { wrapper });
    fireEvent.click(screen.getByTestId("cook-close"));
    expect(mockBack).toHaveBeenCalled();
  });

  it("shows loading state for unknown recipe", () => {
    render(<CookingMode recipeId="unknown" />, { wrapper });
    expect(screen.getByText(/Loading recipe/i)).toBeInTheDocument();
  });

  it("renders progress bar", () => {
    render(<CookingMode recipeId="r1" />, { wrapper });
    expect(screen.getByTestId("progress-bar")).toBeInTheDocument();
  });

  it("shows step timer for steps containing time duration", () => {
    render(<CookingMode recipeId="r1" />, { wrapper });
    // Step 2 mentions "6 min" — advance to it
    fireEvent.click(screen.getByTestId("cook-next"));
    expect(screen.getByTestId("step-timer")).toBeInTheDocument();
  });
});

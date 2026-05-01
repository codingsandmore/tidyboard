import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RecipeDetailPage from "./page";

// next-intl provides translations through the standard hook surface; mock to
// echo keys so the test does not need a NextIntlClientProvider wrapper.
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      ingredients: "Ingredients",
      steps: "Steps",
      nutrition: "Nutrition",
      noRecipeFound: "No recipe found",
      noIngredients: "No ingredients yet",
      noSteps: "No steps yet",
      servings: "Servings",
      startCooking: "Start cooking",
    };
    return map[key] ?? key;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/recipes/r-test",
}));

// Recipe payload mirrors the live backend response — full backend ingredient
// and step rows attached to the parent recipe.
const recipeWithDetails = {
  id: "r-test",
  household_id: "hh-1",
  title: "Tomato Basil Pasta",
  source: "kitchen",
  source_url: "",
  source_domain: "",
  prep: 10,
  cook: 20,
  total: 30,
  serves: 4,
  rating: 4,
  tag: ["italian"],
  ingredients: [
    { id: "ing-1", recipe_id: "r-test", order: 0, group: "", amount: 1, unit: "lb", name: "spaghetti", preparation: "", optional: false, substitution_note: "" },
    { id: "ing-2", recipe_id: "r-test", order: 1, group: "", amount: 4, unit: "cloves", name: "garlic", preparation: "minced", optional: false, substitution_note: "" },
  ],
  steps: [
    { id: "stp-1", recipe_id: "r-test", order: 0, text: "Boil water in a large pot.", image_url: "" },
    { id: "stp-2", recipe_id: "r-test", order: 1, text: "Cook pasta until al dente.", image_url: "" },
  ],
};

const recipeNoDetails = {
  id: "r-empty",
  household_id: "hh-1",
  title: "Empty Recipe",
  source: "kitchen",
  source_url: "",
  source_domain: "",
  prep: 0,
  cook: 0,
  total: 0,
  serves: 1,
  rating: 0,
  tag: [],
  ingredients: [],
  steps: [],
};

const mockState: { activeRecipe: typeof recipeWithDetails | typeof recipeNoDetails | null } = {
  activeRecipe: recipeWithDetails,
};

vi.mock("@/lib/api/hooks", () => ({
  useRecipe: (_id: string) => ({
    data: mockState.activeRecipe,
    error: null,
    isPending: false,
    refetch: vi.fn(),
  }),
}));

beforeEach(() => {
  mockState.activeRecipe = recipeWithDetails;
});

function renderPage(id: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // RecipeDetailPage is async; resolve it before rendering.
  return (async () => {
    const params = Promise.resolve({ id });
    const jsx = await RecipeDetailPage({ params });
    return render(jsx as React.ReactElement, {
      wrapper: ({ children }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    });
  })();
}

describe("/recipes/[id] page — ingredients + steps render", () => {
  it("renders ingredient lines (amount + unit + name) when the recipe has ingredients", async () => {
    mockState.activeRecipe = recipeWithDetails;
    await renderPage("r-test");

    // Switch to ingredients tab is the default. Each ingredient name should appear.
    expect(screen.getByText(/spaghetti/i)).toBeTruthy();
    expect(screen.getByText(/garlic/i)).toBeTruthy();

    // Quantity + unit are rendered alongside the name, e.g. "1 lb" or "4 cloves".
    // The exact concatenation is implementation-defined; verify a substring with
    // both a number and a unit appears in the rendered DOM.
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/1\s*lb/);
    expect(body).toMatch(/4\s*cloves/);
  });

  it("renders ordered steps when the recipe has steps", async () => {
    mockState.activeRecipe = recipeWithDetails;
    const { getByText } = await renderPage("r-test");

    // Click the Steps tab. There is a single "Steps" tab label.
    const stepsTab = getByText(/^Steps$/);
    stepsTab.click();

    expect(screen.getByText(/Boil water in a large pot\./)).toBeTruthy();
    expect(screen.getByText(/Cook pasta until al dente\./)).toBeTruthy();
  });

  it("renders empty-state copy gracefully when the recipe has no ingredients or steps", async () => {
    mockState.activeRecipe = recipeNoDetails;
    const { getByText } = await renderPage("r-empty");

    // Empty-state for ingredients (default tab).
    expect(screen.getByText(/No ingredients yet/i)).toBeTruthy();

    // Switch to Steps tab — empty-state copy must render too.
    getByText(/^Steps$/).click();
    expect(screen.getByText(/No steps yet/i)).toBeTruthy();
  });
});

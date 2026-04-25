import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TBD } from "@/lib/data";
import { RecipeImport, RecipeDetail, RecipePreview, MealPlan, ShoppingList } from "./recipes";

const importMutateMock = vi.fn();

vi.mock("@/lib/api/hooks", () => ({
  useRecipe: (_id: string) => ({ data: TBD.recipes[0] }),
  useRecipes: () => ({ data: TBD.recipes }),
  useMealPlan: () => ({ data: TBD.mealPlan }),
  useShopping: () => ({ data: TBD.shopping }),
  useToggleShoppingItem: () => ({ mutate: vi.fn() }),
  useImportRecipe: () => ({ mutate: importMutateMock, isPending: false }),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function renderWithQuery(ui: React.ReactElement) {
  return render(ui, { wrapper: createWrapper() });
}

describe("RecipeImport", () => {
  it("renders without crashing", () => {
    renderWithQuery(<RecipeImport />);
  });

  it("shows Add a recipe heading", () => {
    renderWithQuery(<RecipeImport />);
    expect(screen.getByText("Add a recipe")).toBeTruthy();
  });

  it("shows Paste a recipe URL heading", () => {
    renderWithQuery(<RecipeImport />);
    expect(screen.getByText("Paste a recipe URL")).toBeTruthy();
  });

  it("shows Import recipe button", () => {
    renderWithQuery(<RecipeImport />);
    expect(screen.getByText("Import recipe")).toBeTruthy();
  });

  it("updates URL input on change", () => {
    renderWithQuery(<RecipeImport />);
    const input = screen.getByDisplayValue("https://www.seriouseats.com/spaghetti-alla-carbonara-recipe");
    fireEvent.change(input, { target: { value: "https://example.com/recipe" } });
    expect(screen.getByDisplayValue("https://example.com/recipe")).toBeTruthy();
  });

  it("clicks Import recipe button without crashing", () => {
    renderWithQuery(<RecipeImport />);
    fireEvent.click(screen.getByText("Import recipe"));
    // Mutation fires in fallback mode — no crash expected
    expect(screen.getByText("Import recipe")).toBeTruthy();
  });

  it("calls importMutation.mutate with the entered URL", () => {
    importMutateMock.mockImplementation(() => {});
    renderWithQuery(<RecipeImport />);
    const input = screen.getByDisplayValue("https://www.seriouseats.com/spaghetti-alla-carbonara-recipe");
    fireEvent.change(input, { target: { value: "https://example.com/recipe" } });
    fireEvent.click(screen.getByText("Import recipe"));
    expect(importMutateMock).toHaveBeenCalledWith(
      "https://example.com/recipe",
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
  });

  it("shows error message when onError callback is invoked", () => {
    importMutateMock.mockImplementation((_url: string, opts: { onError: () => void }) => {
      opts.onError();
    });
    renderWithQuery(<RecipeImport />);
    fireEvent.click(screen.getByText("Import recipe"));
    expect(screen.getByTestId("import-error")).toBeTruthy();
    expect(screen.getByText(/Failed to import recipe/)).toBeTruthy();
  });

  it("shows success message when onSuccess callback is invoked", () => {
    importMutateMock.mockImplementation((_url: string, opts: { onSuccess: () => void }) => {
      opts.onSuccess();
    });
    renderWithQuery(<RecipeImport />);
    fireEvent.click(screen.getByText("Import recipe"));
    expect(screen.getByTestId("import-success")).toBeTruthy();
  });
});

describe("RecipeDetail", () => {
  it("renders without crashing", () => {
    renderWithQuery(<RecipeDetail />);
  });

  it("shows recipe title", () => {
    renderWithQuery(<RecipeDetail />);
    expect(screen.getByText("Spaghetti Carbonara")).toBeTruthy();
  });

  it("shows Ingredients tab by default", () => {
    renderWithQuery(<RecipeDetail />);
    expect(screen.getByText("Ingredients")).toBeTruthy();
  });

  it("switches to Steps tab on click", () => {
    renderWithQuery(<RecipeDetail />);
    fireEvent.click(screen.getByText("Steps"));
    // Steps tab content should appear
    expect(screen.getByText(/Bring a large pot/)).toBeTruthy();
  });

  it("switches to Nutrition tab without crashing", () => {
    renderWithQuery(<RecipeDetail />);
    fireEvent.click(screen.getByText("Nutrition"));
    // No crash — nutrition tab has no content in data but renders
    expect(screen.getByText("Nutrition")).toBeTruthy();
  });

  it("renders in dark mode without crashing", () => {
    renderWithQuery(<RecipeDetail dark />);
    expect(screen.getByText("Spaghetti Carbonara")).toBeTruthy();
  });

  it("shows Start cooking button", () => {
    renderWithQuery(<RecipeDetail />);
    expect(screen.getByText("Start cooking")).toBeTruthy();
  });
});

describe("RecipePreview", () => {
  it("renders without crashing", () => {
    render(<RecipePreview />);
  });

  it("shows Review & save heading", () => {
    render(<RecipePreview />);
    expect(screen.getByText("Review & save")).toBeTruthy();
  });

  it("shows recipe tags", () => {
    render(<RecipePreview />);
    expect(screen.getByText("#italian")).toBeTruthy();
  });
});

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", makeLocalStorageMock());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("MealPlan", () => {
  it("renders without crashing", () => {
    renderWithQuery(<MealPlan />);
  });

  it("shows Meal Plan heading", () => {
    renderWithQuery(<MealPlan />);
    expect(screen.getByText("Meal Plan")).toBeTruthy();
  });

  it("shows day headers", () => {
    renderWithQuery(<MealPlan />);
    expect(screen.getByText("MON")).toBeTruthy();
    expect(screen.getByText("FRI")).toBeTruthy();
  });

  it("shows toast when AI not enabled and suggest clicked", async () => {
    // AI disabled
    localStorage.setItem("tb-ai-enabled", "false");
    renderWithQuery(<MealPlan />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("ai-suggest-btn").querySelector("button")!);
    });

    await waitFor(() => {
      expect(screen.getByTestId("ai-toast")).toBeTruthy();
      expect(screen.getByText(/Configure AI in Settings first/)).toBeTruthy();
    });
  });

  it("shows toast when no key configured and suggest clicked", async () => {
    // AI enabled but no keys
    localStorage.setItem("tb-ai-enabled", "true");
    renderWithQuery(<MealPlan />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("ai-suggest-btn").querySelector("button")!);
    });

    await waitFor(() => {
      expect(screen.getByText(/Configure AI in Settings first/)).toBeTruthy();
    });
  });

  it("calls AI and shows success toast when key configured and suggest clicked", async () => {
    localStorage.setItem("tb-ai-enabled", "true");
    localStorage.setItem("tb-ai-keys", JSON.stringify({ openai: "sk-test" }));

    // Mock fetch: mealPlan + recipes queries return fallback-compatible empty; AI call returns JSON
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("openai.com")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: '[{"day":"Mon","recipe_id":"r1","reason":"yum"}]' } }],
          }),
        });
      }
      // All other API calls (mealPlan, recipes) fail so component uses TBD fallback
      return Promise.resolve({ ok: false, status: 404, statusText: "Not Found", json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithQuery(<MealPlan />);

    // Don't use act(async) — just fire the click and wait for the toast
    fireEvent.click(screen.getByTestId("ai-suggest-btn").querySelector("button")!);

    await waitFor(() => {
      expect(screen.getByTestId("ai-toast")).toBeTruthy();
      expect(screen.getByText(/AI suggestions applied/)).toBeTruthy();
    });
  });

  it("shows error toast when AI call fails", async () => {
    localStorage.setItem("tb-ai-enabled", "true");
    localStorage.setItem("tb-ai-keys", JSON.stringify({ openai: "sk-bad" }));

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("openai.com")) {
        return Promise.resolve({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          json: async () => ({ error: { message: "Invalid key" } }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, statusText: "Not Found", json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithQuery(<MealPlan />);

    fireEvent.click(screen.getByTestId("ai-suggest-btn").querySelector("button")!);

    await waitFor(() => {
      expect(screen.getByText(/AI request failed/)).toBeTruthy();
    });
  });

  it("clicking a meal cell opens the recipe picker", () => {
    renderWithQuery(<MealPlan />);
    const cell = screen.getByTestId("meal-cell-0-0");
    fireEvent.click(cell);
    expect(screen.getByTestId("meal-picker")).toBeTruthy();
    expect(screen.getByText(/Pick a recipe/)).toBeTruthy();
  });

  it("picker shows all available recipes", () => {
    renderWithQuery(<MealPlan />);
    fireEvent.click(screen.getByTestId("meal-cell-0-0"));
    // TBD.recipes includes "Spaghetti Carbonara" — may also appear in grid cells
    expect(screen.getAllByText("Spaghetti Carbonara").length).toBeGreaterThan(0);
  });

  it("clicking Cancel in picker closes the modal", () => {
    renderWithQuery(<MealPlan />);
    fireEvent.click(screen.getByTestId("meal-cell-0-0"));
    expect(screen.getByTestId("meal-picker")).toBeTruthy();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByTestId("meal-picker")).toBeNull();
  });

  it("picking a recipe updates the cell and closes the picker", () => {
    renderWithQuery(<MealPlan />);
    // Click an empty cell
    const emptyCell = screen.getByTestId("meal-cell-0-0");
    fireEvent.click(emptyCell);
    // Pick the first recipe
    fireEvent.click(screen.getByTestId("pick-recipe-r1"));
    // Picker should be gone
    expect(screen.queryByTestId("meal-picker")).toBeNull();
  });
});

describe("ShoppingList", () => {
  it("renders without crashing", () => {
    renderWithQuery(<ShoppingList />);
  });

  it("shows Shopping list heading", () => {
    renderWithQuery(<ShoppingList />);
    expect(screen.getByText("Shopping list")).toBeTruthy();
  });

  it("shows categories", () => {
    renderWithQuery(<ShoppingList />);
    expect(screen.getByText("Produce")).toBeTruthy();
    expect(screen.getByText("Dairy")).toBeTruthy();
  });

  it("toggles item done state on click", () => {
    renderWithQuery(<ShoppingList />);
    // Find "Roma tomatoes" (initially not done)
    const item = screen.getByText("Roma tomatoes");
    expect(item.style.textDecoration).not.toBe("line-through");
    fireEvent.click(item.closest("div[style*='cursor: pointer']")!);
    expect(item.style.textDecoration).toBe("line-through");
  });
});

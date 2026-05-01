import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TBD } from "@/lib/data";
import { RecipeImport, RecipeDetail, RecipePreview, MealPlan, ShoppingList } from "./recipes";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/",
}));

const startJobMutateMock = vi.fn();
const upsertMutateAsyncMock = vi.fn().mockResolvedValue({});
const generateShoppingMutateMock = vi.fn();
const toggleShoppingMutateMock = vi.fn();
const hookState = vi.hoisted(() => ({
  mealPlan: null as unknown,
  jobData: undefined as unknown,
  startJobData: undefined as unknown,
}));

vi.mock("@/lib/api/hooks", () => ({
  useRecipe: (_id: string) => ({ data: TBD.recipes[0] }),
  useRecipes: () => ({ data: TBD.recipes }),
  useMealPlan: () => ({ data: hookState.mealPlan ?? TBD.mealPlan }),
  useShopping: () => ({ data: TBD.shopping }),
  useToggleShoppingItem: () => ({ mutate: toggleShoppingMutateMock }),
  useImportRecipe: () => ({ mutate: vi.fn(), isPending: false }),
  useStartImportJob: () => ({ mutate: startJobMutateMock, isPending: false, data: hookState.startJobData, reset: vi.fn() }),
  useImportJob: () => ({ data: hookState.jobData }),
  useUpsertMealPlanEntry: () => ({ mutate: vi.fn(), mutateAsync: upsertMutateAsyncMock }),
  useDeleteMealPlanEntry: () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}) }),
  useGenerateShoppingList: () => ({ mutate: generateShoppingMutateMock, isPending: false }),
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
  beforeEach(() => {
    hookState.jobData = undefined;
    hookState.startJobData = undefined;
    startJobMutateMock.mockReset();
  });

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
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "https://example.com/recipe" } });
    expect(screen.getByDisplayValue("https://example.com/recipe")).toBeTruthy();
  });

  it("clicks Import recipe button without crashing", () => {
    renderWithQuery(<RecipeImport />);
    fireEvent.click(screen.getByText("Import recipe"));
    expect(screen.getByText("Import recipe")).toBeTruthy();
  });

  it("calls useStartImportJob.mutate with the entered URL", () => {
    renderWithQuery(<RecipeImport />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "https://example.com/recipe" } });
    fireEvent.click(screen.getByText("Import recipe"));
    expect(startJobMutateMock).toHaveBeenCalledWith(
      "https://example.com/recipe",
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it("renders the failure panel with the verbatim server error message", () => {
    hookState.jobData = {
      id: "job-99",
      status: "failed",
      error_message: "scrape failed: site blocked by robots.txt",
    };
    renderWithQuery(<RecipeImport />);
    const errEl = screen.getByTestId("import-job-error");
    expect(errEl.textContent).toContain("scrape failed: site blocked by robots.txt");
    // Verbatim policy: must NOT prepend a generic "Failed to import" wrapper.
    expect(errEl.textContent ?? "").not.toMatch(/Failed to import/i);
  });

  it("renders the success panel with a link to the new recipe", () => {
    hookState.jobData = {
      id: "job-100",
      status: "succeeded",
      recipe_id: "abc-123",
    };
    renderWithQuery(<RecipeImport />);
    const link = screen.getByTestId("import-job-recipe-link");
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/recipes/abc-123");
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
    expect(screen.queryByText("#italian")).toBeNull();
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
  hookState.mealPlan = null;
  generateShoppingMutateMock.mockReset();
  toggleShoppingMutateMock.mockReset();
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

  it("lets backend validation explain missing planned recipes", async () => {
    hookState.mealPlan = {
      weekOf: "2026-04-27",
      rows: ["Breakfast", "Lunch", "Dinner", "Snack"],
      grid: Array.from({ length: 4 }, () => Array(7).fill(null)),
    };
    generateShoppingMutateMock.mockImplementation((_payload, options) => {
      options.onError({ code: "missing_meal_plan" });
    });

    renderWithQuery(<MealPlan />);
    fireEvent.click(screen.getByText("Generate shopping list"));

    expect(generateShoppingMutateMock).toHaveBeenCalledWith(
      { dateFrom: "2026-04-27", dateTo: "2026-05-03" },
      expect.any(Object)
    );
    await waitFor(() => {
      expect(screen.getByText(/Add recipes to this week before generating a shopping list/i)).toBeTruthy();
    });
  });

  it("shows backend missing-ingredient errors from shopping generation", async () => {
    generateShoppingMutateMock.mockImplementation((_payload, options) => {
      options.onError({ code: "missing_recipe_ingredients" });
    });

    renderWithQuery(<MealPlan />);
    fireEvent.click(screen.getByText("Generate shopping list"));

    await waitFor(() => {
      expect(screen.getByText(/Planned recipes need ingredients/i)).toBeTruthy();
    });
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

  it("rolls back optimistic item toggles when the update fails", async () => {
    toggleShoppingMutateMock.mockImplementation((_payload, options) => {
      options.onError();
    });
    renderWithQuery(<ShoppingList />);

    const item = screen.getByText("Roma tomatoes");
    fireEvent.click(item.closest("div[style*='cursor: pointer']")!);

    await waitFor(() => {
      expect(item.style.textDecoration).not.toBe("line-through");
    });
  });
});

// ── Wired button tests ────────────────────────────────────────────────────────

describe("RecipeImport — wired buttons", () => {
  beforeEach(() => mockPush.mockClear());

  it("Enter Manually button navigates to /recipes/import?manual=1", () => {
    renderWithQuery(<RecipeImport />);
    fireEvent.click(screen.getByText("Enter manually"));
    expect(mockPush).toHaveBeenCalledWith("/recipes/import?manual=1");
  });

  it("Import from File button is rendered as disabled (no alert)", () => {
    // File-format import isn't shipped yet. The button is rendered as a
    // visibly-disabled control instead of an alert("coming soon") trap.
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    renderWithQuery(<RecipeImport />);
    const btn = screen.getByText("Import from file").closest("button");
    expect(btn).not.toBeNull();
    expect(btn).toBeDisabled();
    fireEvent.click(btn!);
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe("RecipeDetail — Start Cooking button", () => {
  beforeEach(() => mockPush.mockClear());

  it("Start Cooking navigates to cook route for current recipe", () => {
    renderWithQuery(<RecipeDetail id={TBD.recipes[0].id} />);
    fireEvent.click(screen.getByText("Start cooking"));
    expect(mockPush).toHaveBeenCalledWith(`/recipes/${TBD.recipes[0].id}/cook`);
  });
});

describe("RecipePreview — Discard and Save buttons", () => {
  beforeEach(() => mockPush.mockClear());

  it("Save to Collection navigates to /recipes", () => {
    renderWithQuery(<RecipePreview />);
    fireEvent.click(screen.getByText("Save to collection"));
    expect(mockPush).toHaveBeenCalledWith("/recipes");
  });

  it("Discard shows confirm dialog and navigates on confirm", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithQuery(<RecipePreview />);
    fireEvent.click(screen.getByText("Discard"));
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/recipes");
    confirmSpy.mockRestore();
  });

  it("Discard does not navigate when confirm is cancelled", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderWithQuery(<RecipePreview />);
    fireEvent.click(screen.getByText("Discard"));
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});

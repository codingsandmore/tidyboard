import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RecipeImportPage from "./page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/recipes/import",
}));

const startJobMutateMock = vi.fn();
const hookState = vi.hoisted(() => ({
  jobData: undefined as unknown,
  startJobData: undefined as unknown,
}));

vi.mock("@/lib/api/hooks", () => ({
  useRecipe: () => ({ data: undefined }),
  useRecipes: () => ({ data: [] }),
  useMealPlan: () => ({ data: null }),
  useShopping: () => ({ data: null }),
  useToggleShoppingItem: () => ({ mutate: vi.fn() }),
  useImportRecipe: () => ({ mutate: vi.fn(), isPending: false }),
  useStartImportJob: () => ({
    mutate: startJobMutateMock,
    isPending: false,
    data: hookState.startJobData,
    reset: vi.fn(),
  }),
  useImportJob: () => ({ data: hookState.jobData }),
  useUpsertMealPlanEntry: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
  useDeleteMealPlanEntry: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
  useGenerateShoppingList: () => ({ mutate: vi.fn(), isPending: false }),
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

describe("RecipeImportPage (route /recipes/import)", () => {
  beforeEach(() => {
    hookState.jobData = undefined;
    hookState.startJobData = undefined;
    startJobMutateMock.mockReset();
  });

  it("renders without crashing", () => {
    renderWithQuery(<RecipeImportPage />);
    expect(screen.getByText("Add a recipe")).toBeTruthy();
  });

  // ── Issue #117: structured error rendering on import-job startup failure ─
  it("import startup onError surfaces structured ApiError details (status/code/message/requestId)", async () => {
    const apiError = {
      code: "scrape_unsupported",
      message: "We do not yet support importing from this website.",
      status: 500,
      requestId: "req-import-page-failure",
      url: "/v1/recipes/import",
      method: "POST",
    };
    startJobMutateMock.mockImplementation((_url, options) => {
      options?.onError?.(apiError);
    });

    renderWithQuery(<RecipeImportPage />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, {
      target: { value: "https://opaque.example/recipe" },
    });
    fireEvent.click(screen.getByText("Import recipe"));

    await waitFor(() => {
      const alert = screen.getByTestId("error-alert");
      expect(alert).toBeTruthy();
      // status, code, message, requestId all surface.
      expect(alert.textContent ?? "").toContain("500");
      expect(alert.textContent ?? "").toContain("scrape_unsupported");
      expect(alert.textContent ?? "").toContain(
        "We do not yet support importing from this website."
      );
      expect(alert.textContent ?? "").toContain("req-import-page-failure");
    });

    // No generic "Failed to <verb>" wrapper.
    expect(screen.queryByText(/Failed to (start )?import/i)).toBeNull();
  });
});

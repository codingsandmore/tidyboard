import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TBD } from "@/lib/data";
import { MealPlan } from "./recipes";

// ── Hook mocks ──────────────────────────────────────────────────────────────

const upsertMutateMock = vi.fn();
const upsertMutateAsyncMock = vi.fn().mockResolvedValue({});
const deleteMutateMock = vi.fn();
const deleteMutateAsyncMock = vi.fn().mockResolvedValue({});
const generateShoppingMutateMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  usePathname: () => "/",
}));

// Provide a meal plan that includes entry IDs for occupied cells.
// Dinner row (idx 2), Mon (col 0) is r1 with entry id "mpe-1".
const apiMealPlan = {
  weekOf: "2026-04-27",
  rows: ["Breakfast", "Lunch", "Dinner", "Snack"],
  grid: [
    [null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null],
    ["r1", null, null, null, null, null, null],
    [null, null, null, null, null, null, null],
  ],
  entryIds: {
    "2026-04-27|dinner": {
      id: "mpe-1",
      serving_multiplier: 1.0,
      batch_quantity: 1,
      planned_leftovers: 0,
    },
  },
};

vi.mock("@/lib/api/hooks", () => ({
  useRecipe: (_id: string) => ({ data: TBD.recipes[0] }),
  useRecipes: () => ({ data: TBD.recipes }),
  useMealPlan: () => ({ data: apiMealPlan }),
  useShopping: () => ({ data: TBD.shopping }),
  useToggleShoppingItem: () => ({ mutate: vi.fn() }),
  useImportRecipe: () => ({ mutate: vi.fn(), isPending: false }),
  useUpsertMealPlanEntry: () => ({
    mutate: upsertMutateMock,
    mutateAsync: upsertMutateAsyncMock,
  }),
  useDeleteMealPlanEntry: () => ({
    mutate: deleteMutateMock,
    mutateAsync: deleteMutateAsyncMock,
  }),
  useGenerateShoppingList: () => ({
    mutate: generateShoppingMutateMock,
    isPending: false,
  }),
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

beforeEach(() => {
  upsertMutateMock.mockReset();
  upsertMutateAsyncMock.mockReset().mockResolvedValue({});
  deleteMutateMock.mockReset();
  deleteMutateAsyncMock.mockReset().mockResolvedValue({});
  generateShoppingMutateMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MealPlan edit popover", () => {
  it("opens edit popover on cell click and saves multiplier 2.5", async () => {
    renderWithQuery(<MealPlan />);

    // Dinner row (2), Monday (0) is occupied with r1
    const cell = screen.getByTestId("meal-cell-2-0");
    fireEvent.click(cell);

    // Edit popover (not the recipe picker) should open
    const popover = await screen.findByTestId("meal-plan-edit-popover");
    expect(popover).toBeTruthy();

    // Three numeric inputs prefilled with current values
    const multiplier = screen.getByTestId(
      "meal-plan-edit-multiplier"
    ) as HTMLInputElement;
    const batch = screen.getByTestId(
      "meal-plan-edit-batch"
    ) as HTMLInputElement;
    const leftovers = screen.getByTestId(
      "meal-plan-edit-leftovers"
    ) as HTMLInputElement;

    expect(multiplier.value).toBe("1");
    expect(batch.value).toBe("1");
    expect(leftovers.value).toBe("0");

    // Edit multiplier to 2.5
    fireEvent.change(multiplier, { target: { value: "2.5" } });
    expect(multiplier.value).toBe("2.5");

    // Save
    fireEvent.click(screen.getByTestId("meal-plan-edit-save"));

    await waitFor(() => {
      expect(upsertMutateMock).toHaveBeenCalled();
    });
    const callArgs = upsertMutateMock.mock.calls[0][0];
    expect(callArgs).toEqual(
      expect.objectContaining({
        date: "2026-04-27",
        slot: "dinner",
        recipeId: "r1",
        serving_multiplier: 2.5,
        batch_quantity: 1,
        planned_leftovers: 0,
      })
    );

    // Popover closed
    await waitFor(() => {
      expect(screen.queryByTestId("meal-plan-edit-popover")).toBeNull();
    });
  });

  it("deletes entry via trash icon after confirm", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithQuery(<MealPlan />);

    fireEvent.click(screen.getByTestId("meal-cell-2-0"));
    await screen.findByTestId("meal-plan-edit-popover");

    fireEvent.click(screen.getByTestId("meal-plan-edit-delete"));

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(deleteMutateMock).toHaveBeenCalled();
    });
    // Issue #117: the screen now also passes an `onError` options object
    // alongside the payload so it can surface server failures via
    // <ErrorAlert/>. Assert on the payload (1st arg) instead of pinning the
    // exact call shape with toHaveBeenCalledWith.
    const deletePayload = deleteMutateMock.mock.calls[0][0];
    expect(deletePayload).toEqual(expect.objectContaining({ id: "mpe-1" }));
    confirmSpy.mockRestore();
  });

  it("does not call DELETE when confirmation is cancelled", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderWithQuery(<MealPlan />);

    fireEvent.click(screen.getByTestId("meal-cell-2-0"));
    await screen.findByTestId("meal-plan-edit-popover");

    fireEvent.click(screen.getByTestId("meal-plan-edit-delete"));

    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteMutateMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});

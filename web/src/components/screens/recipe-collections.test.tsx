import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CollectionSidebar, AddToCollectionMenu } from "./recipe-collections";

// ── Mock hooks ─────────────────────────────────────────────────────────────

const mockCreateMutate = vi.fn();
const mockDeleteMutate = vi.fn();
const mockAssignMutate = vi.fn();
const mockRemoveMutate = vi.fn();

const MOCK_COLLECTIONS = [
  { id: "c1", name: "Quick weeknights", slug: "quick-weeknights", sort_order: 0, household_id: "h1", created_at: "", updated_at: "" },
  { id: "c2", name: "Holiday baking", slug: "holiday-baking", sort_order: 1, household_id: "h1", created_at: "", updated_at: "" },
];

vi.mock("@/lib/api/hooks", () => ({
  useRecipeCollections: () => ({ data: MOCK_COLLECTIONS }),
  useCollectionRecipes: () => ({ data: [], isLoading: false }),
  useCreateCollection: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useDeleteCollection: () => ({
    mutate: mockDeleteMutate,
  }),
  useAssignRecipeToCollection: () => ({
    mutate: mockAssignMutate,
  }),
  useRemoveRecipeFromCollection: () => ({
    mutate: mockRemoveMutate,
  }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const RECIPE = {
  id: "r1",
  title: "Spaghetti Carbonara",
  source: "seriouseats.com",
  prep: 10,
  cook: 20,
  total: 30,
  serves: 4,
  rating: 4,
  tag: ["italian"],
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("CollectionSidebar", () => {
  it("renders all collections", () => {
    render(
      <CollectionSidebar selectedId={null} onSelect={() => {}} />,
      { wrapper }
    );
    expect(screen.getByText("Quick weeknights")).toBeInTheDocument();
    expect(screen.getByText("Holiday baking")).toBeInTheDocument();
  });

  it("renders 'All recipes' item", () => {
    render(
      <CollectionSidebar selectedId={null} onSelect={() => {}} />,
      { wrapper }
    );
    expect(screen.getByTestId("collection-all")).toBeInTheDocument();
  });

  it("calls onSelect(null) when All recipes is clicked", () => {
    const onSelect = vi.fn();
    render(
      <CollectionSidebar selectedId="c1" onSelect={onSelect} />,
      { wrapper }
    );
    fireEvent.click(screen.getByTestId("collection-all"));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("calls onSelect with collection id when clicked", () => {
    const onSelect = vi.fn();
    render(
      <CollectionSidebar selectedId={null} onSelect={onSelect} />,
      { wrapper }
    );
    fireEvent.click(screen.getByTestId("collection-item-c1"));
    expect(onSelect).toHaveBeenCalledWith("c1");
  });

  it("calls deleteCollection when delete button is clicked", () => {
    render(
      <CollectionSidebar selectedId={null} onSelect={() => {}} />,
      { wrapper }
    );
    fireEvent.click(screen.getByTestId("delete-collection-c1"));
    expect(mockDeleteMutate).toHaveBeenCalledWith("c1");
  });

  it("opens create modal when + button is clicked", () => {
    render(
      <CollectionSidebar selectedId={null} onSelect={() => {}} />,
      { wrapper }
    );
    fireEvent.click(screen.getByTestId("new-collection-btn"));
    expect(screen.getByTestId("create-collection-modal")).toBeInTheDocument();
  });

  it("shows validation error when submitting empty name", () => {
    render(
      <CollectionSidebar selectedId={null} onSelect={() => {}} />,
      { wrapper }
    );
    fireEvent.click(screen.getByTestId("new-collection-btn"));
    // Click create without entering name
    const createBtn = screen.getAllByText("Create").find(
      (el) => el.closest("button")
    );
    if (createBtn) fireEvent.click(createBtn);
    expect(screen.getByText("Name is required")).toBeInTheDocument();
  });

  it("calls createCollection when name is provided", async () => {
    render(
      <CollectionSidebar selectedId={null} onSelect={() => {}} />,
      { wrapper }
    );
    fireEvent.click(screen.getByTestId("new-collection-btn"));
    fireEvent.change(screen.getByTestId("collection-name-input"), {
      target: { value: "Summer grilling" },
    });
    const createBtn = screen.getAllByText("Create").find(
      (el) => el.closest("button")
    );
    if (createBtn) fireEvent.click(createBtn);
    expect(mockCreateMutate).toHaveBeenCalledWith(
      { name: "Summer grilling" },
      expect.any(Object)
    );
  });
});

describe("AddToCollectionMenu", () => {
  it("renders collection list", () => {
    render(
      <AddToCollectionMenu recipe={RECIPE} onClose={() => {}} />,
      { wrapper }
    );
    expect(screen.getByTestId("collection-menu-panel")).toBeInTheDocument();
    expect(screen.getByTestId("assign-collection-c1")).toBeInTheDocument();
    expect(screen.getByTestId("assign-collection-c2")).toBeInTheDocument();
  });

  it("calls assign when a collection is clicked", () => {
    render(
      <AddToCollectionMenu recipe={RECIPE} onClose={() => {}} />,
      { wrapper }
    );
    fireEvent.click(screen.getByTestId("assign-collection-c1"));
    expect(mockAssignMutate).toHaveBeenCalledWith(
      { collectionId: "c1", recipeId: "r1" },
      expect.any(Object)
    );
  });

  it("shows create new collection button", () => {
    render(
      <AddToCollectionMenu recipe={RECIPE} onClose={() => {}} />,
      { wrapper }
    );
    expect(screen.getByTestId("create-new-collection-btn")).toBeInTheDocument();
  });

  it("opens create modal when New collection is clicked", () => {
    render(
      <AddToCollectionMenu recipe={RECIPE} onClose={() => {}} />,
      { wrapper }
    );
    fireEvent.click(screen.getByTestId("create-new-collection-btn"));
    expect(screen.getByTestId("create-collection-modal")).toBeInTheDocument();
  });
});

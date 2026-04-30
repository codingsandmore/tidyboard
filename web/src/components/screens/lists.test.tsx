import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ListsIndex, ListDetail } from "./lists";
import { TBD } from "@/lib/data";

// ── Shared mutation mocks ──────────────────────────────────────────────────

const mutateFn = vi.fn();
function mockMutation() {
  return { mutate: mutateFn, isPending: false };
}

vi.mock("@/lib/api/hooks", () => ({
  useLists: () => ({ data: TBD.lists }),
  useCreateList: () => mockMutation(),
  useToggleListItem: () => mockMutation(),
  useAddListItem: () => mockMutation(),
  useDeleteListItem: () => mockMutation(),
}));

beforeEach(() => {
  mutateFn.mockReset();
});

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function renderWithQuery(ui: React.ReactElement) {
  return render(ui, { wrapper: createWrapper() });
}

// ── ListsIndex ─────────────────────────────────────────────────────────────

describe("ListsIndex", () => {
  it("renders without crashing", () => {
    renderWithQuery(<ListsIndex />);
  });

  it("shows Lists heading", () => {
    renderWithQuery(<ListsIndex />);
    expect(screen.getByText("Lists")).toBeTruthy();
  });

  it("shows New list button", () => {
    renderWithQuery(<ListsIndex />);
    expect(screen.getByText("+ New list")).toBeTruthy();
  });

  it("renders all list titles from sample data", () => {
    renderWithQuery(<ListsIndex />);
    for (const list of TBD.lists) {
      expect(screen.getByText(list.title)).toBeTruthy();
    }
  });

  it("renders category badges", () => {
    renderWithQuery(<ListsIndex />);
    expect(screen.getByText("Packing")).toBeTruthy();
    expect(screen.getByText("Chores")).toBeTruthy();
  });

  it("renders list emojis", () => {
    renderWithQuery(<ListsIndex />);
    for (const list of TBD.lists) {
      expect(screen.getByText(list.emoji)).toBeTruthy();
    }
  });

  it("clicking New list button shows inline form", () => {
    renderWithQuery(<ListsIndex />);
    fireEvent.click(screen.getByText("+ New list"));
    // Input should appear
    const input = screen.getByPlaceholderText(/list name/i);
    expect(input).toBeTruthy();
  });

  it("submitting new list name calls createList mutation", async () => {
    // Wire the mutate to call onSuccess immediately
    mutateFn.mockImplementation((_vars: unknown, opts?: { onSuccess?: () => void }) => {
      opts?.onSuccess?.();
    });
    renderWithQuery(<ListsIndex />);
    fireEvent.click(screen.getByText("+ New list"));
    const input = screen.getByPlaceholderText(/list name/i);
    fireEvent.change(input, { target: { value: "Grocery run" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    await waitFor(() => {
      expect(mutateFn).toHaveBeenCalledWith(
        { name: "Grocery run", type: "todo" },
        expect.any(Object)
      );
    });
  });
});

// ── ListDetail ─────────────────────────────────────────────────────────────

describe("ListDetail", () => {
  const list = TBD.lists[0]; // Packing for Weekend Trip

  it("renders without crashing", () => {
    renderWithQuery(<ListDetail list={list} />);
  });

  it("shows list title", () => {
    renderWithQuery(<ListDetail list={list} />);
    expect(screen.getByText(list.title)).toBeTruthy();
  });

  it("shows list items", () => {
    renderWithQuery(<ListDetail list={list} />);
    expect(screen.getByText("Pack swimsuits & towels")).toBeTruthy();
  });

  it("clicking item checkbox calls toggle mutation with correct args", () => {
    renderWithQuery(<ListDetail list={list} />);
    // Find an undone item and click its checkbox
    const itemText = screen.getByText("Pack Jackson's soccer ball");
    const checkbox = itemText.parentElement?.querySelector("div[style*='cursor: pointer']");
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox!);
    expect(mutateFn).toHaveBeenCalledWith(
      expect.objectContaining({ listId: list.id, completed: expect.any(Boolean) })
    );
  });

  it("adds a new item via input — calls addListItem mutation", async () => {
    mutateFn.mockImplementation((_vars: unknown, opts?: { onSuccess?: () => void }) => {
      opts?.onSuccess?.();
    });
    renderWithQuery(<ListDetail list={list} />);
    const input = screen.getByPlaceholderText("Add item…");
    fireEvent.change(input, { target: { value: "New test item" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    await waitFor(() => {
      expect(mutateFn).toHaveBeenCalledWith(
        { listId: list.id, text: "New test item" },
        expect.any(Object)
      );
    });
  });

  it("delete button calls deleteListItem mutation", () => {
    renderWithQuery(<ListDetail list={list} />);
    const deleteButtons = screen.getAllByLabelText("Delete item");
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);
    expect(mutateFn).toHaveBeenCalledWith(
      expect.objectContaining({ listId: list.id, itemId: expect.any(String) })
    );
  });

  it("renders with a chores list", () => {
    renderWithQuery(<ListDetail list={TBD.lists[1]} />);
    expect(screen.getByText("Saturday Chores")).toBeTruthy();
  });

  it("renders with an errands list", () => {
    renderWithQuery(<ListDetail list={TBD.lists[2]} />);
    expect(screen.getByText("Weekly Errands")).toBeTruthy();
  });
});

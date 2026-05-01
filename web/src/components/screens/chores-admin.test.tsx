import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChoresAdmin } from "./chores-admin";

const createChoreMock = vi.fn();
const setChorePetsMock = vi.fn();
let createChoreReturn: { id: string } = { id: "new-chore-1" };

vi.mock("@/lib/api/hooks", () => ({
  useMembers: () => ({
    data: [
      { id: "kid1", name: "Pebbles", role: "child", color: "#22C55E" },
      { id: "pet-dino", name: "Dino", role: "pet", color: "#F59E0B" },
      { id: "pet-baby-puss", name: "Baby Puss", role: "pet", color: "#A855F7" },
      { id: "adult1", name: "Wilma", role: "adult", color: "#EC4899" },
    ],
  }),
  useChores: () => ({ data: [] }),
  useCreateChore: () => ({
    mutate: (
      vars: Record<string, unknown>,
      opts?: { onSuccess?: (chore: { id: string }) => void },
    ) => {
      createChoreMock(vars);
      opts?.onSuccess?.(createChoreReturn);
    },
  }),
  useArchiveChore: () => ({ mutate: vi.fn() }),
  useSetChorePets: () => ({
    mutate: (vars: { choreId: string; petMemberIds: string[] }) => {
      setChorePetsMock(vars);
    },
  }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ChoresAdmin pet multi-select (#141 / spec D.3)", () => {
  beforeEach(() => {
    createChoreMock.mockClear();
    setChorePetsMock.mockClear();
    createChoreReturn = { id: "new-chore-1" };
  });

  it("opens the form and renders a pet multi-select with household pets only", () => {
    renderWithQuery(<ChoresAdmin />);
    fireEvent.click(screen.getByRole("button", { name: /\+ New chore/i }));
    // Pet rows should be visible as toggleable checkboxes/chips.
    expect(screen.getByLabelText(/Dino/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Baby Puss/i)).toBeInTheDocument();
    // Adult/kid roles must NOT show up in the pet multi-select.
    expect(screen.queryByLabelText(/^Wilma$/)).not.toBeInTheDocument();
  });

  it("selecting Dino + clicking save POSTs /v1/chores/{id}/pets with [Dino.id]", () => {
    renderWithQuery(<ChoresAdmin />);
    fireEvent.click(screen.getByRole("button", { name: /\+ New chore/i }));
    // Fill in required name field
    fireEvent.change(screen.getByPlaceholderText(/Chore name/i), {
      target: { value: "Feed Dino" },
    });
    // Select Dino in the pet multi-select
    fireEvent.click(screen.getByLabelText(/Dino/i));
    // Save the chore
    fireEvent.click(screen.getByRole("button", { name: /^Create$/i }));
    // Chore was created
    expect(createChoreMock).toHaveBeenCalledTimes(1);
    expect(createChoreMock.mock.calls[0][0]).toMatchObject({ name: "Feed Dino" });
    // And the pet replace-set was called with Dino's id only
    expect(setChorePetsMock).toHaveBeenCalledTimes(1);
    expect(setChorePetsMock.mock.calls[0][0]).toEqual({
      choreId: "new-chore-1",
      petMemberIds: ["pet-dino"],
    });
  });

  it("does not call setChorePets when no pets are selected", () => {
    renderWithQuery(<ChoresAdmin />);
    fireEvent.click(screen.getByRole("button", { name: /\+ New chore/i }));
    fireEvent.change(screen.getByPlaceholderText(/Chore name/i), {
      target: { value: "Take out trash" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Create$/i }));
    expect(createChoreMock).toHaveBeenCalledTimes(1);
    expect(setChorePetsMock).not.toHaveBeenCalled();
  });
});

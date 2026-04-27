import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Scoreboard } from "./scoreboard";

vi.mock("@/lib/api/hooks", () => ({
  useScoreboard: () => ({
    data: [
      {
        member_id: "m1",
        total: 150,
        by_category: [{ category_id: "cat1", total: 100 }, { category_id: "cat2", total: 50 }],
      },
      {
        member_id: "m2",
        total: 80,
        by_category: [{ category_id: "cat1", total: 80 }],
      },
    ],
  }),
  useMembers: () => ({
    data: [
      { id: "m1", name: "Alice", color: "#22C55E", role: "child" },
      { id: "m2", name: "Bob", color: "#3B82F6", role: "child" },
    ],
  }),
  usePointCategories: () => ({
    data: [
      { id: "cat1", name: "Chores", color: "#F59E0B", household_id: "h1", sort_order: 1, archived_at: null, created_at: "", updated_at: "" },
      { id: "cat2", name: "Homework", color: "#8B5CF6", household_id: "h1", sort_order: 2, archived_at: null, created_at: "", updated_at: "" },
    ],
  }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("Scoreboard", () => {
  it("renders heading", () => {
    renderWithQuery(<Scoreboard />);
    expect(screen.getByText(/Scoreboard/i)).toBeInTheDocument();
  });

  it("shows 1st place crown and member name", () => {
    renderWithQuery(<Scoreboard />);
    expect(screen.getByText("👑")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("shows 2nd place rank indicator", () => {
    renderWithQuery(<Scoreboard />);
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows point totals", () => {
    renderWithQuery(<Scoreboard />);
    expect(screen.getByText("150 pts")).toBeInTheDocument();
    expect(screen.getByText("80 pts")).toBeInTheDocument();
  });

  it("shows category names", () => {
    renderWithQuery(<Scoreboard />);
    expect(screen.getAllByText("Chores").length).toBeGreaterThan(0);
    expect(screen.getByText("Homework")).toBeInTheDocument();
  });
});

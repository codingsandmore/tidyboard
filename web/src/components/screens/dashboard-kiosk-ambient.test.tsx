import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashKioskAmbient } from "./dashboard-kiosk-ambient";

const members = [
  {
    id: "adult-1",
    name: "Taylor",
    avatar: "T",
    color: "#2563eb",
    role: "adult",
    stars: 0,
  },
  {
    id: "child-1",
    name: "Jordan",
    avatar: "J",
    color: "#16a34a",
    role: "child",
    stars: 4,
  },
];

const events = [
  {
    id: "event-1",
    title: "School pickup",
    start: "2026-04-30T15:00:00.000Z",
    end: "2026-04-30T15:30:00.000Z",
    color: "#2563eb",
    location: "Main entrance",
    members: ["adult-1", "child-1"],
  },
];

vi.mock("@/lib/api/hooks", () => ({
  useMembers: () => ({ data: members }),
  useEvents: () => ({ data: events }),
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

describe("DashKioskAmbient", () => {
  it("renders without crashing", () => {
    renderWithQuery(<DashKioskAmbient />);
  });

  it("shows the current clock time", () => {
    vi.setSystemTime(new Date("2026-04-30T17:34:00.000Z"));
    renderWithQuery(<DashKioskAmbient />);
    expect(screen.getByText(/10:34 AM|5:34 PM/)).toBeTruthy();
  });

  it("shows NEXT UP text", () => {
    renderWithQuery(<DashKioskAmbient />);
    expect(screen.getByText(/NEXT UP/)).toBeTruthy();
  });

  it("shows live family member tiles", () => {
    renderWithQuery(<DashKioskAmbient />);
    expect(screen.getByText("Taylor")).toBeTruthy();
    expect(screen.getByText("Jordan")).toBeTruthy();
  });

  it("shows real events and no demo dinner recipe", () => {
    renderWithQuery(<DashKioskAmbient />);
    expect(screen.getAllByText("School pickup").length).toBeGreaterThan(0);
    expect(screen.getByText("No dinner planned")).toBeTruthy();
    expect(screen.queryByText("Spaghetti Carbonara")).toBeNull();
  });
});

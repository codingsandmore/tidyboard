import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TBD } from "@/lib/data";
import { DashPhone } from "./dashboard-phone";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api/hooks", () => ({
  useMembers: () => ({ data: TBD.members }),
  useEvents: () => ({ data: TBD.events }),
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

describe("DashPhone", () => {
  it("renders without crashing", () => {
    renderWithQuery(<DashPhone />);
  });

  it("shows tidyboard logo", () => {
    renderWithQuery(<DashPhone />);
    expect(screen.getByText("tidyboard")).toBeTruthy();
  });

  it("shows Thursday heading", () => {
    renderWithQuery(<DashPhone />);
    expect(screen.getByText("Thursday")).toBeTruthy();
  });

  it("shows date and weather info", () => {
    renderWithQuery(<DashPhone />);
    expect(screen.getByText(/April 22/)).toBeTruthy();
  });

  it("shows at least one event", () => {
    renderWithQuery(<DashPhone />);
    expect(screen.getByText("Morning standup")).toBeTruthy();
  });

  it("clicking an event navigates to its calendar detail route", () => {
    mockPush.mockClear();
    renderWithQuery(<DashPhone />);
    fireEvent.click(screen.getByText("Morning standup"));
    expect(mockPush).toHaveBeenCalledWith("/calendar?event=e1");
  });

  it("shows Spaghetti Carbonara dinner", () => {
    renderWithQuery(<DashPhone />);
    expect(screen.getByText("Spaghetti Carbonara")).toBeTruthy();
  });
});

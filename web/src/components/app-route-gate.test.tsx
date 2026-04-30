import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppRouteGate } from "./app-route-gate";

const pathState = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathState.pathname,
}));

vi.mock("@/components/auth-gate", () => ({
  AuthGate: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-gate">{children}</div>
  ),
}));

function renderAt(pathname: string) {
  pathState.pathname = pathname;
  return render(
    <AppRouteGate>
      <span>page content</span>
    </AppRouteGate>
  );
}

describe("AppRouteGate", () => {
  it("wraps production routes with AuthGate", () => {
    renderAt("/dashboard/kiosk");

    expect(screen.getByTestId("auth-gate")).toBeTruthy();
    expect(screen.getByText("page content")).toBeTruthy();
  });

  it("leaves onboarding and auth routes public", () => {
    renderAt("/onboarding");
    expect(screen.queryByTestId("auth-gate")).toBeNull();
  });

  it("leaves explicit preview routes public", () => {
    renderAt("/recipes/preview-detail");
    expect(screen.queryByTestId("auth-gate")).toBeNull();
  });
});

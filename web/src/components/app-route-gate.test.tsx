import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppRouteGate } from "./app-route-gate";

const pathState = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathState.pathname,
}));

vi.mock("@/components/auth-gate", () => ({
  AuthGate: ({
    children,
    requireMemberProfile = true,
  }: {
    children: React.ReactNode;
    requireMemberProfile?: boolean;
  }) => (
    <div data-require-member-profile={String(requireMemberProfile)} data-testid="auth-gate">{children}</div>
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

  it("lets wallet and chores handle missing member context themselves", () => {
    renderAt("/wallet");
    expect(screen.getByTestId("auth-gate").getAttribute("data-require-member-profile")).toBe("false");

    renderAt("/chores");
    expect(screen.getAllByTestId("auth-gate")[1].getAttribute("data-require-member-profile")).toBe("false");
  });
});

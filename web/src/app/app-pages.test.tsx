// Smoke tests for app route pages.
// Each test renders the default export and asserts no crash.
// Dynamic-param pages receive a resolved Promise for `params`.
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth/auth-store";

// ─── Static pages ────────────────────────────────────────────────────────────

import HomePage from "./page";
import LoginPage from "./login/page";
import PinLoginPage from "./pin-login/page";
import OnboardingPage from "./onboarding/page";
import KioskPage from "./dashboard/kiosk/page";
import KioskAmbientPage from "./dashboard/kiosk-ambient/page";
import KioskColumnsPage from "./dashboard/kiosk-columns/page";
import KioskDarkPage from "./dashboard/kiosk-dark/page";
import DesktopPage from "./dashboard/desktop/page";
import PhonePage from "./dashboard/phone/page";

import CalendarPage from "./calendar/page";
import CalDayPage from "./calendar/day/page";
import CalDayDarkPage from "./calendar/day-dark/page";
import CalWeekPage from "./calendar/week/page";
import CalMonthPage from "./calendar/month/page";
import CalAgendaPage from "./calendar/agenda/page";
// Note: /calendar/event was a design-scene preview page; it has been removed.

import RoutinesPage from "./routines/page";
import RoutinesKidPage from "./routines/kid/page";
import RoutinesKidDarkPage from "./routines/kid-dark/page";
import RoutinesChecklistPage from "./routines/checklist/page";
import RoutinesPathPage from "./routines/path/page";

import MealsPage from "./meals/page";
import MealsPreviewPage from "./meals/preview/page";
import RecipesPage from "./recipes/page";
import RecipesImportPage from "./recipes/import/page";
import RecipesPreviewPage from "./recipes/preview-preview/page";
import RecipesPreviewDetailPage from "./recipes/preview-detail/page";
import RecipesPreviewDetailDarkPage from "./recipes/preview-detail-dark/page";
import RecipesPreviewImportPage from "./recipes/preview-import/page";

import ListsPage from "./lists/page";
import ListsPreviewPage from "./lists/preview/page";
import ListsPreviewDetailPage from "./lists/preview-detail/page";

import ShoppingPage from "./shopping/page";
import ShoppingPreviewPage from "./shopping/preview/page";

import EquityPage from "./equity/page";
import EquityPreviewPage from "./equity/preview/page";
import EquityPreviewDarkPage from "./equity/preview-dark/page";
import EquityPreviewScalesPage from "./equity/preview-scales/page";

import LockPage from "./lock/page";
import LockMembersPage from "./lock/members/page";
import LockScreenPage from "./lock/screen/page";

import RacePage from "./race/page";
import RacePreviewPage from "./race/preview/page";

import SettingsPage from "./settings/page";
import SettingsPreviewPage from "./settings/preview/page";

import PreviewPage from "./preview/page";

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
}

function smoke(name: string, Page: React.ComponentType) {
  it(`${name} renders without crashing`, () => {
    const { container } = render(<Page />);
    expect(container).toBeTruthy();
  });
}

function smokeWithQuery(name: string, Page: React.ComponentType) {
  it(`${name} renders without crashing`, () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}><Page /></QueryClientProvider>
    );
    expect(container).toBeTruthy();
  });
}

function smokeWithAuth(name: string, Page: React.ComponentType) {
  it(`${name} renders without crashing`, () => {
    // Stub localStorage so AuthProvider doesn't throw
    const lsMock = makeLocalStorageMock();
    vi.stubGlobal("localStorage", lsMock);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <Page />
        </AuthProvider>
      </QueryClientProvider>
    );
    expect(container).toBeTruthy();
  });
}

describe("App page smoke tests — static pages", () => {
  smoke("/ (Home)", HomePage);
  smoke("/onboarding (client page)", OnboardingPage);
  smokeWithAuth("/login", LoginPage);
  smokeWithAuth("/pin-login", PinLoginPage);
  smokeWithQuery("/dashboard/kiosk", KioskPage);
  smokeWithQuery("/dashboard/kiosk-ambient", KioskAmbientPage);
  smokeWithQuery("/dashboard/kiosk-columns", KioskColumnsPage);
  smokeWithQuery("/dashboard/kiosk-dark", KioskDarkPage);
  smokeWithQuery("/dashboard/desktop", DesktopPage);
  smokeWithQuery("/dashboard/phone", PhonePage);

  smokeWithQuery("/calendar", CalendarPage);
  smokeWithQuery("/calendar/day", CalDayPage);
  smokeWithQuery("/calendar/day-dark", CalDayDarkPage);
  smokeWithQuery("/calendar/week", CalWeekPage);
  smokeWithQuery("/calendar/month", CalMonthPage);
  smokeWithQuery("/calendar/agenda", CalAgendaPage);

  smokeWithQuery("/routines", RoutinesPage);
  smokeWithQuery("/routines/kid", RoutinesKidPage);
  smokeWithQuery("/routines/kid-dark", RoutinesKidDarkPage);
  smokeWithQuery("/routines/checklist", RoutinesChecklistPage);
  smokeWithQuery("/routines/path", RoutinesPathPage);

  smokeWithQuery("/meals", MealsPage);
  smokeWithQuery("/meals/preview", MealsPreviewPage);
  smokeWithQuery("/recipes", RecipesPage);
  smokeWithQuery("/recipes/import", RecipesImportPage);
  smoke("/recipes/preview-preview", RecipesPreviewPage);
  smokeWithQuery("/recipes/preview-detail", RecipesPreviewDetailPage);
  smokeWithQuery("/recipes/preview-detail-dark", RecipesPreviewDetailDarkPage);
  smokeWithQuery("/recipes/preview-import", RecipesPreviewImportPage);

  smokeWithQuery("/lists", ListsPage);
  smokeWithQuery("/lists/preview", ListsPreviewPage);
  smokeWithQuery("/lists/preview-detail", ListsPreviewDetailPage);

  smokeWithQuery("/shopping", ShoppingPage);
  smokeWithQuery("/shopping/preview", ShoppingPreviewPage);

  smokeWithQuery("/equity", EquityPage);
  smokeWithQuery("/equity/preview", EquityPreviewPage);
  smokeWithQuery("/equity/preview-dark", EquityPreviewDarkPage);
  smokeWithQuery("/equity/preview-scales", EquityPreviewScalesPage);

  smokeWithAuth("/lock", LockPage);
  smokeWithQuery("/lock/members", LockMembersPage);
  smoke("/lock/screen", LockScreenPage);

  smokeWithQuery("/race", RacePage);
  smokeWithQuery("/race/preview", RacePreviewPage);

  smokeWithAuth("/settings", SettingsPage);
  smoke("/settings/preview", SettingsPreviewPage);

  smoke("/preview", PreviewPage);
});

// ─── Dynamic pages (async, need awaited params) ───────────────────────────────

import OnboardingStepPage from "./onboarding/[step]/page";
import RecipeDetailPage from "./recipes/[id]/page";
import ListDetailPage from "./lists/[id]/page";

function makeQueryWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("App page smoke tests — dynamic pages", () => {
  it("/onboarding/[step] renders step 0 without crashing", async () => {
    const params = Promise.resolve({ step: "0" });
    const jsx = await OnboardingStepPage({ params });
    const { container } = render(jsx as React.ReactElement);
    expect(container).toBeTruthy();
  });

  it("/onboarding/[step] renders step 3 without crashing", async () => {
    const params = Promise.resolve({ step: "3" });
    const jsx = await OnboardingStepPage({ params });
    const { container } = render(jsx as React.ReactElement);
    expect(container).toBeTruthy();
  });

  it("/recipes/[id] renders known recipe without crashing", async () => {
    const params = Promise.resolve({ id: "r1" });
    const jsx = await RecipeDetailPage({ params });
    const { container } = render(jsx as React.ReactElement, { wrapper: makeQueryWrapper() });
    expect(container).toBeTruthy();
  });

  it("/recipes/[id] renders not-found for unknown id", async () => {
    const params = Promise.resolve({ id: "unknown-recipe" });
    const jsx = await RecipeDetailPage({ params });
    const { getByText } = render(jsx as React.ReactElement);
    expect(getByText("Recipe not found")).toBeTruthy();
  });

  it("/lists/[id] renders known list without crashing", () => {
    const params = Promise.resolve({ id: "l1" });
    const { container } = render(
      <ListDetailPage params={params} />,
      { wrapper: makeQueryWrapper() }
    );
    expect(container).toBeTruthy();
  });
});

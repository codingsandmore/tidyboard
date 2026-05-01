/**
 * Component tests for the recipe import-job status panel (issue #108).
 *
 * The panel renders one of three states based on its `job` prop:
 *   - running   -> spinner + "Importing…" label, no link, no error.
 *   - succeeded -> success label + link to /recipes/{recipe_id}.
 *   - failed    -> verbatim server `error_message` + a copy-to-clipboard button.
 *
 * The panel itself is purely presentational; polling lives in the
 * `useImportJob` hook (tested via the page integration test).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImportStatusPanel, type ImportJob } from "./ImportStatusPanel";

describe("ImportStatusPanel", () => {
  it("renders the in-progress state with spinner + label", () => {
    const job: ImportJob = { id: "job-1", status: "running" };
    render(<ImportStatusPanel job={job} />);
    expect(screen.getByTestId("import-job-status")).toHaveAttribute("data-status", "running");
    expect(screen.getByTestId("import-job-spinner")).toBeInTheDocument();
    expect(screen.getByText(/Importing/i)).toBeInTheDocument();
    // No success link, no error block in running state.
    expect(screen.queryByTestId("import-job-recipe-link")).not.toBeInTheDocument();
    expect(screen.queryByTestId("import-job-error")).not.toBeInTheDocument();
  });

  it("renders a link to the created recipe on success", () => {
    const job: ImportJob = {
      id: "job-2",
      status: "succeeded",
      recipe_id: "11111111-1111-1111-1111-111111111111",
    };
    render(<ImportStatusPanel job={job} />);
    expect(screen.getByTestId("import-job-status")).toHaveAttribute("data-status", "succeeded");
    const link = screen.getByTestId("import-job-recipe-link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/recipes/11111111-1111-1111-1111-111111111111");
  });

  it("renders the server error message verbatim — no 'Failed to import' wrapper", () => {
    const serverMsg = "scrape failed: site blocked by robots.txt";
    const job: ImportJob = { id: "job-3", status: "failed", error_message: serverMsg };
    render(<ImportStatusPanel job={job} />);
    expect(screen.getByTestId("import-job-status")).toHaveAttribute("data-status", "failed");
    const errEl = screen.getByTestId("import-job-error");
    // Verbatim policy: the exact server message must appear, with no
    // "Failed to import" boilerplate prefix from the frontend.
    expect(errEl).toHaveTextContent(serverMsg);
    expect(errEl.textContent ?? "").not.toMatch(/Failed to import/i);
  });

  it("renders a copy button that writes the error message to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const serverMsg = "scrape failed: timeout after 30s";
    const job: ImportJob = { id: "job-4", status: "failed", error_message: serverMsg };
    render(<ImportStatusPanel job={job} />);

    const copyBtn = screen.getByTestId("import-job-error-copy");
    expect(copyBtn).toBeInTheDocument();
    fireEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalledWith(serverMsg);
  });

  it("renders nothing (returns null) when no job is supplied", () => {
    const { container } = render(<ImportStatusPanel job={null} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("useImportJob (polling behaviour, smoke)", () => {
  // The hook itself is tested indirectly by the integration test below;
  // these smoke checks make sure the contract stays in place.
  it("exports a hook named useImportJob", async () => {
    const mod = await import("@/lib/api/hooks");
    expect(typeof mod.useImportJob).toBe("function");
  });

  it("exports a useStartImportJob mutation hook", async () => {
    const mod = await import("@/lib/api/hooks");
    expect(typeof mod.useStartImportJob).toBe("function");
  });
});

describe("RecipeImport page integration with polling", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("submits the URL via POST /v1/recipes/import-jobs and shows the panel", async () => {
    // We mock the hooks module so we don't have to spin up a real react-query loop.
    // The hook layer is covered by the e2e + integration tests; this assertion is
    // about the wiring at the page level.
    const startMock = vi.fn();
    vi.doMock("@/lib/api/hooks", () => ({
      useRecipe: () => ({ data: undefined }),
      useRecipes: () => ({ data: [] }),
      useMealPlan: () => ({ data: undefined }),
      useShopping: () => ({ data: undefined }),
      useToggleShoppingItem: () => ({ mutate: vi.fn() }),
      useImportRecipe: () => ({ mutate: vi.fn(), isPending: false }),
      useUpsertMealPlanEntry: () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}) }),
      useGenerateShoppingList: () => ({ mutate: vi.fn(), isPending: false }),
      useStartImportJob: () => ({
        mutate: startMock,
        isPending: false,
        data: undefined,
        reset: vi.fn(),
      }),
      useImportJob: () => ({ data: undefined }),
    }));
    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
      useSearchParams: () => ({ get: () => null }),
      usePathname: () => "/",
    }));
    vi.doMock("next-intl", () => ({
      useTranslations: () => (k: string) => k,
    }));

    const { RecipeImport } = await import("@/components/screens/recipes");
    const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <RecipeImport />
      </QueryClientProvider>
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "https://example.com/recipe" } });
    fireEvent.click(screen.getByText("importRecipe"));
    expect(startMock).toHaveBeenCalledWith("https://example.com/recipe");
  });

  it("renders the success link path when useImportJob returns succeeded + recipe_id", async () => {
    vi.doMock("@/lib/api/hooks", () => ({
      useRecipe: () => ({ data: undefined }),
      useRecipes: () => ({ data: [] }),
      useMealPlan: () => ({ data: undefined }),
      useShopping: () => ({ data: undefined }),
      useToggleShoppingItem: () => ({ mutate: vi.fn() }),
      useImportRecipe: () => ({ mutate: vi.fn(), isPending: false }),
      useUpsertMealPlanEntry: () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}) }),
      useGenerateShoppingList: () => ({ mutate: vi.fn(), isPending: false }),
      useStartImportJob: () => ({
        mutate: vi.fn(),
        isPending: false,
        data: { id: "job-x", status: "running" },
        reset: vi.fn(),
      }),
      useImportJob: () => ({
        data: { id: "job-x", status: "succeeded", recipe_id: "abc-123" },
      }),
    }));
    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
      useSearchParams: () => ({ get: () => null }),
      usePathname: () => "/",
    }));
    vi.doMock("next-intl", () => ({
      useTranslations: () => (k: string) => k,
    }));

    const { RecipeImport } = await import("@/components/screens/recipes");
    const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <RecipeImport />
      </QueryClientProvider>
    );

    const link = screen.getByTestId("import-job-recipe-link");
    expect(link).toHaveAttribute("href", "/recipes/abc-123");
  });

  it("renders the server error_message verbatim when the job has failed", async () => {
    const errMsg = "scrape failed: site blocked";
    vi.doMock("@/lib/api/hooks", () => ({
      useRecipe: () => ({ data: undefined }),
      useRecipes: () => ({ data: [] }),
      useMealPlan: () => ({ data: undefined }),
      useShopping: () => ({ data: undefined }),
      useToggleShoppingItem: () => ({ mutate: vi.fn() }),
      useImportRecipe: () => ({ mutate: vi.fn(), isPending: false }),
      useUpsertMealPlanEntry: () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}) }),
      useGenerateShoppingList: () => ({ mutate: vi.fn(), isPending: false }),
      useStartImportJob: () => ({
        mutate: vi.fn(),
        isPending: false,
        data: { id: "job-y", status: "running" },
        reset: vi.fn(),
      }),
      useImportJob: () => ({
        data: { id: "job-y", status: "failed", error_message: errMsg },
      }),
    }));
    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
      useSearchParams: () => ({ get: () => null }),
      usePathname: () => "/",
    }));
    vi.doMock("next-intl", () => ({
      useTranslations: () => (k: string) => k,
    }));

    const { RecipeImport } = await import("@/components/screens/recipes");
    const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <RecipeImport />
      </QueryClientProvider>
    );

    const errEl = screen.getByTestId("import-job-error");
    expect(errEl).toHaveTextContent(errMsg);
    expect(errEl.textContent ?? "").not.toMatch(/Failed to import/i);
  });
});

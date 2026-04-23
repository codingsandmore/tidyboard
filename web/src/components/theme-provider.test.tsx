import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme, NoFlashScript } from "./theme-provider";

// ── Helpers ────────────────────────────────────────────────────────────────

function mockMatchMedia(prefersDark: boolean) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  const mq = {
    matches: prefersDark,
    addEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb);
    }),
    removeEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    }),
  };
  // jsdom doesn't implement matchMedia — stub it globally
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mq));
  return mq;
}

// Consumer component to read theme context
function ThemeDisplay() {
  const { theme, preference, setTheme, toggle } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="preference">{preference}</span>
      <button onClick={() => setTheme("dark")}>set dark</button>
      <button onClick={() => setTheme("light")}>set light</button>
      <button onClick={() => setTheme("system")}>set system</button>
      <button onClick={toggle}>toggle</button>
    </div>
  );
}

beforeEach(() => {
  // Stub localStorage for each test with a fresh in-memory store
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  });
  // Default: light system preference
  mockMatchMedia(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ThemeProvider", () => {
  it("renders children", () => {
    render(
      <ThemeProvider>
        <span>hello</span>
      </ThemeProvider>
    );
    expect(screen.getByText("hello")).toBeTruthy();
  });

  it("defaults to system/light when no localStorage value", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(screen.getByTestId("preference").textContent).toBe("system");
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("reads stored 'dark' preference from localStorage", () => {
    localStorage.setItem("tb-theme", "dark");
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(screen.getByTestId("preference").textContent).toBe("dark");
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("reads stored 'light' preference from localStorage", () => {
    localStorage.setItem("tb-theme", "light");
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(screen.getByTestId("preference").textContent).toBe("light");
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("setTheme('dark') updates theme and persists to localStorage", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    act(() => {
      screen.getByText("set dark").click();
    });
    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(localStorage.getItem("tb-theme")).toBe("dark");
  });

  it("setTheme('light') updates theme and persists to localStorage", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    act(() => {
      screen.getByText("set light").click();
    });
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(localStorage.getItem("tb-theme")).toBe("light");
  });

  it("setTheme('system') removes localStorage key", () => {
    localStorage.setItem("tb-theme", "dark");
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    act(() => {
      screen.getByText("set system").click();
    });
    expect(screen.getByTestId("preference").textContent).toBe("system");
    expect(localStorage.getItem("tb-theme")).toBeNull();
  });

  it("toggle switches from light to dark", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");
    act(() => {
      screen.getByText("toggle").click();
    });
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("toggle switches from dark to light", () => {
    localStorage.setItem("tb-theme", "dark");
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    act(() => {
      screen.getByText("toggle").click();
    });
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("uses dark system preference when set to system", () => {
    mockMatchMedia(true);
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });
});

describe("NoFlashScript", () => {
  it("renders a script tag", () => {
    const { container } = render(<NoFlashScript />);
    const script = container.querySelector("script");
    expect(script).toBeTruthy();
  });

  it("script contains localStorage check", () => {
    const { container } = render(<NoFlashScript />);
    const script = container.querySelector("script");
    expect(script?.innerHTML).toContain("localStorage");
  });
});

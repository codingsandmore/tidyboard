import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { AISettingsCard } from "./ai-section";

// ── localStorage mock ──────────────────────────────────────────────────────

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", makeLocalStorageMock());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("AISettingsCard", () => {
  it("renders the AI & Automations section heading", () => {
    render(<AISettingsCard />);
    expect(screen.getByText(/AI & Automations/i)).toBeTruthy();
  });

  it("renders the privacy warning banner", () => {
    render(<AISettingsCard />);
    expect(screen.getByText(/Keys are stored in your browser only/i)).toBeTruthy();
  });

  it("renders the Learn more link", () => {
    render(<AISettingsCard />);
    const link = screen.getByText(/Learn more/i) as HTMLAnchorElement;
    expect(link.href).toContain("AI_BYOK.md");
  });

  it("shows enabled/disabled toggle button", () => {
    render(<AISettingsCard />);
    expect(screen.getByTestId("ai-enabled-toggle")).toBeTruthy();
  });

  it("shows provider rows when enabled", () => {
    // Default is enabled (no localStorage value = enabled)
    render(<AISettingsCard />);
    expect(screen.getByTestId("ai-key-input-openai")).toBeTruthy();
    expect(screen.getByTestId("ai-key-input-anthropic")).toBeTruthy();
    expect(screen.getByTestId("ai-key-input-google")).toBeTruthy();
  });

  it("hides provider rows when toggled to disabled", () => {
    render(<AISettingsCard />);
    fireEvent.click(screen.getByTestId("ai-enabled-toggle"));
    expect(screen.queryByTestId("ai-key-input-openai")).toBeNull();
  });

  it("shows provider rows again when re-enabled", () => {
    render(<AISettingsCard />);
    fireEvent.click(screen.getByTestId("ai-enabled-toggle"));
    fireEvent.click(screen.getByTestId("ai-enabled-toggle"));
    expect(screen.getByTestId("ai-key-input-openai")).toBeTruthy();
  });

  it("entering a key and blurring saves to localStorage", () => {
    render(<AISettingsCard />);
    const input = screen.getByTestId("ai-key-input-openai") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "sk-my-key" } });
    fireEvent.blur(input);
    const stored = JSON.parse(localStorage.getItem("tb-ai-keys")!);
    expect(stored.openai).toBe("sk-my-key");
  });

  it("Clear button removes the key from localStorage", () => {
    localStorage.setItem("tb-ai-keys", JSON.stringify({ openai: "sk-existing" }));
    render(<AISettingsCard />);
    fireEvent.click(screen.getByTestId("ai-clear-btn-openai"));
    const stored = localStorage.getItem("tb-ai-keys");
    const parsed = stored ? JSON.parse(stored) : {};
    expect(parsed.openai).toBeUndefined();
  });

  it("Test button makes a fetch call with the entered key", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "Hello!" } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AISettingsCard />);
    const input = screen.getByTestId("ai-key-input-openai") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "sk-valid-key" } });

    await act(async () => {
      fireEvent.click(screen.getByTestId("ai-test-btn-openai"));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain("openai.com");
    });

    await waitFor(() => {
      expect(screen.getByText(/Connected successfully/i)).toBeTruthy();
    });
  });

  it("shows error message when Test button receives 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ error: { message: "Invalid API key" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AISettingsCard />);
    const input = screen.getByTestId("ai-key-input-openai") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "bad-key" } });

    await act(async () => {
      fireEvent.click(screen.getByTestId("ai-test-btn-openai"));
    });

    await waitFor(() => {
      expect(screen.getByText(/Error 401/i)).toBeTruthy();
    });
  });

  it("Test button is disabled when input is empty", () => {
    render(<AISettingsCard />);
    const btn = screen.getByTestId("ai-test-btn-openai") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("Test button for Anthropic sends request to anthropic.com", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ text: "Hello" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AISettingsCard />);
    const input = screen.getByTestId("ai-key-input-anthropic") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "sk-ant-valid" } });

    await act(async () => {
      fireEvent.click(screen.getByTestId("ai-test-btn-anthropic"));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain("anthropic.com");
    });
  });

  it("Test button for Google sends request to googleapis.com", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "Hi" }] } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AISettingsCard />);
    const input = screen.getByTestId("ai-key-input-google") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "AIza-valid" } });

    await act(async () => {
      fireEvent.click(screen.getByTestId("ai-test-btn-google"));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain("googleapis.com");
    });
  });

  it("renders pre-existing anthropic key in input", () => {
    localStorage.setItem("tb-ai-keys", JSON.stringify({ anthropic: "sk-ant-existing" }));
    render(<AISettingsCard />);
    const input = screen.getByTestId("ai-key-input-anthropic") as HTMLInputElement;
    expect(input.value).toBe("sk-ant-existing");
  });

  it("Clear button for anthropic removes anthropic key", () => {
    localStorage.setItem("tb-ai-keys", JSON.stringify({ anthropic: "sk-ant-existing", openai: "sk-openai" }));
    render(<AISettingsCard />);
    fireEvent.click(screen.getByTestId("ai-clear-btn-anthropic"));
    const stored = localStorage.getItem("tb-ai-keys");
    const parsed = stored ? JSON.parse(stored) : {};
    expect(parsed.anthropic).toBeUndefined();
    expect(parsed.openai).toBe("sk-openai");
  });
});

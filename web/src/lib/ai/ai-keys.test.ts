import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAIKeys, isAIEnabled, setAIEnabled } from "./ai-keys";

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
});

// ── useAIKeys tests ────────────────────────────────────────────────────────

describe("useAIKeys", () => {
  it("returns empty keys when localStorage is empty", () => {
    const { result } = renderHook(() => useAIKeys());
    expect(result.current.keys).toEqual({});
  });

  it("setKey stores a key in state and localStorage", () => {
    const { result } = renderHook(() => useAIKeys());

    act(() => {
      result.current.setKey("openai", "sk-test-123");
    });

    expect(result.current.keys.openai).toBe("sk-test-123");
    const stored = JSON.parse(localStorage.getItem("tb-ai-keys")!);
    expect(stored.openai).toBe("sk-test-123");
  });

  it("setKey can set multiple providers independently", () => {
    const { result } = renderHook(() => useAIKeys());

    act(() => {
      result.current.setKey("openai", "sk-open");
      result.current.setKey("anthropic", "sk-ant");
      result.current.setKey("google", "AIza");
    });

    expect(result.current.keys.openai).toBe("sk-open");
    expect(result.current.keys.anthropic).toBe("sk-ant");
    expect(result.current.keys.google).toBe("AIza");
  });

  it("clearKey removes only the specified provider", () => {
    const { result } = renderHook(() => useAIKeys());

    act(() => {
      result.current.setKey("openai", "sk-open");
      result.current.setKey("anthropic", "sk-ant");
    });

    act(() => {
      result.current.clearKey("openai");
    });

    expect(result.current.keys.openai).toBeUndefined();
    expect(result.current.keys.anthropic).toBe("sk-ant");
  });

  it("clearAll removes all keys and clears localStorage entry", () => {
    const { result } = renderHook(() => useAIKeys());

    act(() => {
      result.current.setKey("openai", "sk-open");
      result.current.setKey("google", "AIza");
    });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.keys).toEqual({});
    expect(localStorage.getItem("tb-ai-keys")).toBeNull();
  });

  it("reads pre-existing keys from localStorage on mount", () => {
    localStorage.setItem("tb-ai-keys", JSON.stringify({ anthropic: "sk-ant-existing" }));

    const { result } = renderHook(() => useAIKeys());
    expect(result.current.keys.anthropic).toBe("sk-ant-existing");
  });

  it("returns empty keys when localStorage contains invalid JSON (fallback)", () => {
    localStorage.setItem("tb-ai-keys", "not-valid-json");
    const { result } = renderHook(() => useAIKeys());
    expect(result.current.keys).toEqual({});
  });
});

// ── isAIEnabled / setAIEnabled tests ──────────────────────────────────────

describe("isAIEnabled / setAIEnabled", () => {
  it("returns true by default (no value set)", () => {
    expect(isAIEnabled()).toBe(true);
  });

  it("returns false after setAIEnabled(false)", () => {
    setAIEnabled(false);
    expect(isAIEnabled()).toBe(false);
  });

  it("returns true after setAIEnabled(true)", () => {
    setAIEnabled(false);
    setAIEnabled(true);
    expect(isAIEnabled()).toBe(true);
  });

  it("returns false when localStorage has 'false'", () => {
    localStorage.setItem("tb-ai-enabled", "false");
    expect(isAIEnabled()).toBe(false);
  });

  it("returns true when localStorage has 'true'", () => {
    localStorage.setItem("tb-ai-enabled", "true");
    expect(isAIEnabled()).toBe(true);
  });
});

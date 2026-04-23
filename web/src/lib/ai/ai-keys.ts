"use client";

/**
 * BYOK AI key store — client-side only.
 *
 * Keys are stored in localStorage under `tb-ai-keys` and NEVER sent to the
 * Tidyboard backend. They are used exclusively for direct browser→provider
 * fetch calls from `src/lib/ai/client.ts`.
 */

import { useState, useCallback, useEffect } from "react";

// ── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "tb-ai-keys";
const ENABLED_KEY = "tb-ai-enabled";

// ── Types ──────────────────────────────────────────────────────────────────

export type AIProvider = "openai" | "anthropic" | "google";

export interface AIKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
}

export interface UseAIKeysReturn {
  keys: AIKeys;
  setKey(provider: AIProvider, value: string): void;
  clearKey(provider: AIProvider): void;
  clearAll(): void;
}

// ── Storage helpers ────────────────────────────────────────────────────────

function readKeys(): AIKeys {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AIKeys;
  } catch {
    return {};
  }
}

function writeKeys(keys: AIKeys): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // ignore — storage may be unavailable
  }
}

function removeKeys(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ── AI-enabled flag helpers ────────────────────────────────────────────────

export function isAIEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ENABLED_KEY) !== "false";
  } catch {
    return false;
  }
}

export function setAIEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(ENABLED_KEY, enabled ? "true" : "false");
  } catch {
    // ignore
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAIKeys(): UseAIKeysReturn {
  const [keys, setKeys] = useState<AIKeys>(() => readKeys());

  // Re-sync if localStorage is modified externally (e.g. another tab)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setKeys(readKeys());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setKey = useCallback((provider: AIProvider, value: string) => {
    setKeys((prev) => {
      const next = { ...prev, [provider]: value };
      writeKeys(next);
      return next;
    });
  }, []);

  const clearKey = useCallback((provider: AIProvider) => {
    setKeys((prev) => {
      const next = { ...prev };
      delete next[provider];
      writeKeys(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    removeKeys();
    setKeys({});
  }, []);

  return { keys, setKey, clearKey, clearAll };
}

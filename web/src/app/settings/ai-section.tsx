"use client";

/**
 * AI & Automations settings card.
 *
 * Keys entered here are stored in localStorage ONLY — they never reach the
 * Tidyboard backend or any third party other than the AI provider the user
 * is testing.
 */

import { useEffect, useState } from "react";
import { TB } from "@/lib/tokens";
import { useAIKeys, setAIEnabled, isAIEnabled } from "@/lib/ai/ai-keys";
import { callOpenAI, callAnthropic, callGoogle, AIError } from "@/lib/ai/client";
import type { AIProvider } from "@/lib/ai/client";

// ── Types ──────────────────────────────────────────────────────────────────

type TestState = "idle" | "testing" | "ok" | "error";

interface ProviderRowProps {
  label: string;
  provider: AIProvider;
  value: string;
  onSet: (v: string) => void;
  onClear: () => void;
}

// ── Provider row ───────────────────────────────────────────────────────────

function ProviderRow({ label, provider, value, onSet, onClear }: ProviderRowProps) {
  const [draft, setDraft] = useState(value);
  const [testState, setTestState] = useState<TestState>("idle");
  const [testMessage, setTestMessage] = useState("");

  async function handleTest() {
    const key = draft.trim();
    if (!key) return;
    setTestState("testing");
    setTestMessage("");
    try {
      const probe = [{ role: "user" as const, content: "Hello" }];
      if (provider === "openai") await callOpenAI(probe, "gpt-4o-mini", key);
      else if (provider === "anthropic") await callAnthropic(probe, "claude-haiku-20240307", key);
      else await callGoogle(probe, "gemini-1.5-flash", key);
      setTestState("ok");
      setTestMessage("Connected successfully");
    } catch (err) {
      const msg =
        err instanceof AIError
          ? `Error ${err.status}: ${err.message}`
          : "Connection failed";
      setTestState("error");
      setTestMessage(msg);
    }
  }

  function handleSave() {
    const key = draft.trim();
    if (key) {
      onSet(key);
    }
  }

  const dotColor =
    testState === "ok"
      ? TB.success
      : testState === "error"
        ? TB.destructive
        : "transparent";

  return (
    <div
      style={{
        padding: "10px 0",
        borderBottom: `1px solid ${TB.borderSoft}`,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: TB.text,
            minWidth: 90,
          }}
        >
          {label}
        </span>
        <input
          type="password"
          data-testid={`ai-key-input-${provider}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          placeholder="sk-… / sk-ant-… / AIza…"
          style={{
            flex: 1,
            padding: "5px 10px",
            fontSize: 12,
            fontFamily: TB.fontMono,
            border: `1px solid ${TB.border}`,
            borderRadius: TB.r.md,
            background: TB.bg2,
            color: TB.text,
            outline: "none",
          }}
        />
        <button
          data-testid={`ai-test-btn-${provider}`}
          onClick={handleTest}
          disabled={testState === "testing" || !draft.trim()}
          style={{
            padding: "5px 12px",
            borderRadius: TB.r.md,
            border: `1px solid ${TB.border}`,
            background: TB.surface,
            color: TB.text,
            fontSize: 12,
            fontWeight: 500,
            cursor: testState === "testing" || !draft.trim() ? "default" : "pointer",
            fontFamily: TB.fontBody,
            opacity: !draft.trim() ? 0.5 : 1,
          }}
        >
          {testState === "testing" ? "…" : "Test"}
        </button>
        <button
          data-testid={`ai-clear-btn-${provider}`}
          onClick={() => {
            setDraft("");
            onClear();
            setTestState("idle");
            setTestMessage("");
          }}
          style={{
            padding: "5px 10px",
            borderRadius: TB.r.md,
            border: `1px solid ${TB.border}`,
            background: "transparent",
            color: TB.text2,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: TB.fontBody,
          }}
        >
          Clear
        </button>
        {testState !== "idle" && (
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: dotColor,
              flexShrink: 0,
            }}
          />
        )}
      </div>
      {testMessage && (
        <div
          style={{
            fontSize: 11,
            color: testState === "ok" ? TB.success : TB.destructive,
            paddingLeft: 98,
          }}
        >
          {testMessage}
        </div>
      )}
    </div>
  );
}

// ── Main card ──────────────────────────────────────────────────────────────

export function AISettingsCard() {
  const { keys, setKey, clearKey } = useAIKeys();
  // Start `enabled` as false on both server and client so the first paint
  // matches. Sync from localStorage after mount — avoids a hydration mismatch
  // when the user has already turned AI on.
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(isAIEnabled());
  }, []);

  function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    setAIEnabled(next);
  }

  return (
    <div
      style={{
        padding: "12px 16px",
        background: TB.surface,
        borderBottom: `1px solid ${TB.border}`,
        fontFamily: TB.fontBody,
        fontSize: 13,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <span style={{ color: TB.text2, fontWeight: 500, flex: 1 }}>
          AI &amp; Automations
        </span>
        {/* Toggle */}
        <button
          data-testid="ai-enabled-toggle"
          onClick={toggleEnabled}
          aria-pressed={enabled}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: TB.r.full,
            border: `1px solid ${enabled ? TB.primary : TB.border}`,
            background: enabled ? TB.primary + "18" : TB.bg2,
            color: enabled ? TB.primary : TB.text2,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: TB.fontBody,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: enabled ? TB.primary : TB.muted,
            }}
          />
          {enabled ? "Enabled" : "Disabled"}
        </button>
      </div>

      {/* Warning banner */}
      <div
        style={{
          marginBottom: 10,
          padding: "8px 12px",
          background: TB.warning + "15",
          border: `1px solid ${TB.warning}30`,
          borderRadius: TB.r.md,
          fontSize: 11,
          color: TB.text2,
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: TB.text }}>Keys are stored in your browser only.</strong>{" "}
        They never reach Tidyboard&apos;s servers or anyone else.{" "}
        <a
          href="/AI_BYOK.md"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: TB.primary, textDecoration: "none" }}
        >
          Learn more
        </a>
      </div>

      {/* Provider rows */}
      {enabled && (
        <div>
          <ProviderRow
            label="OpenAI"
            provider="openai"
            value={keys.openai ?? ""}
            onSet={(v) => setKey("openai", v)}
            onClear={() => clearKey("openai")}
          />
          <ProviderRow
            label="Anthropic"
            provider="anthropic"
            value={keys.anthropic ?? ""}
            onSet={(v) => setKey("anthropic", v)}
            onClear={() => clearKey("anthropic")}
          />
          <ProviderRow
            label="Google"
            provider="google"
            value={keys.google ?? ""}
            onSet={(v) => setKey("google", v)}
            onClear={() => clearKey("google")}
          />
        </div>
      )}
    </div>
  );
}

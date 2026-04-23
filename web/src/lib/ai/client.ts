"use client";

/**
 * BYOK AI client — browser-only direct calls to AI providers.
 *
 * Keys are supplied by the caller (from ai-keys.ts) and NEVER forwarded to
 * the Tidyboard backend.  All requests go directly from the user's browser
 * to the provider's API.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResult {
  text: string;
}

export class AIError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly provider: string
  ) {
    super(message);
    this.name = "AIError";
  }
}

// ── OpenAI ─────────────────────────────────────────────────────────────────

export async function callOpenAI(
  messages: AIMessage[],
  model: string = "gpt-4o-mini",
  apiKey: string
): Promise<AIResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body?.error?.message ?? msg;
    } catch {
      // ignore parse error
    }
    throw new AIError(msg, res.status, "openai");
  }

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  return { text };
}

// ── Anthropic ──────────────────────────────────────────────────────────────

export async function callAnthropic(
  messages: AIMessage[],
  model: string = "claude-haiku-20240307",
  apiKey: string
): Promise<AIResult> {
  // Anthropic separates system messages from the messages array
  const systemMsgs = messages.filter((m) => m.role === "system");
  const userMsgs = messages.filter((m) => m.role !== "system");

  const body: Record<string, unknown> = {
    model,
    max_tokens: 1024,
    messages: userMsgs.map((m) => ({ role: m.role, content: m.content })),
  };
  if (systemMsgs.length > 0) {
    body.system = systemMsgs.map((m) => m.content).join("\n");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const errBody = await res.json();
      msg = errBody?.error?.message ?? msg;
    } catch {
      // ignore
    }
    throw new AIError(msg, res.status, "anthropic");
  }

  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";
  return { text };
}

// ── Google Gemini ──────────────────────────────────────────────────────────

export async function callGoogle(
  messages: AIMessage[],
  model: string = "gemini-1.5-flash",
  apiKey: string
): Promise<AIResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Gemini uses "parts" inside "contents"; system role → user turn with context
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  // Prepend system messages as a leading user turn if present
  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");

  const finalContents =
    systemText
      ? [{ role: "user", parts: [{ text: systemText }] }, ...contents]
      : contents;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: finalContents }),
  });

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const errBody = await res.json();
      msg = errBody?.error?.message ?? msg;
    } catch {
      // ignore
    }
    throw new AIError(msg, res.status, "google");
  }

  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return { text };
}

// ── Dispatcher ─────────────────────────────────────────────────────────────

export type AIProvider = "openai" | "anthropic" | "google";

export async function callAI(
  provider: AIProvider,
  messages: AIMessage[],
  apiKey: string,
  model?: string
): Promise<AIResult> {
  switch (provider) {
    case "openai":
      return callOpenAI(messages, model, apiKey);
    case "anthropic":
      return callAnthropic(messages, model, apiKey);
    case "google":
      return callGoogle(messages, model, apiKey);
    default:
      throw new AIError(`Unknown provider: ${provider}`, 400, String(provider));
  }
}

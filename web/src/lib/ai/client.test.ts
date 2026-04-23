import { describe, it, expect, vi, beforeEach } from "vitest";
import { callOpenAI, callAnthropic, callGoogle, callAI, AIError } from "./client";

// ── Helpers ────────────────────────────────────────────────────────────────

function mockFetchOk(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  });
}

function mockFetchError(status: number, statusText: string, body?: unknown) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
    json: async () => body ?? {},
  });
}

const MESSAGES = [{ role: "user" as const, content: "Hello" }];

beforeEach(() => {
  vi.restoreAllMocks();
});

// ── callOpenAI ─────────────────────────────────────────────────────────────

describe("callOpenAI", () => {
  it("sends POST to openai chat completions with correct headers", async () => {
    const fetchMock = mockFetchOk({
      choices: [{ message: { content: "Hi there!" } }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callOpenAI(MESSAGES, "gpt-4o-mini", "sk-test");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-test");
    expect(headers["Content-Type"]).toBe("application/json");
    const bodyParsed = JSON.parse(init.body as string);
    expect(bodyParsed.model).toBe("gpt-4o-mini");
    expect(bodyParsed.messages).toEqual(MESSAGES);
    expect(result.text).toBe("Hi there!");
  });

  it("throws AIError with status on non-2xx", async () => {
    vi.stubGlobal("fetch", mockFetchError(401, "Unauthorized", { error: { message: "Invalid API key" } }));

    await expect(callOpenAI(MESSAGES, "gpt-4o-mini", "bad-key")).rejects.toSatisfy(
      (e: unknown) => e instanceof AIError && e.status === 401 && e.provider === "openai"
    );
  });

  it("throws AIError on 500", async () => {
    vi.stubGlobal("fetch", mockFetchError(500, "Internal Server Error"));

    await expect(callOpenAI(MESSAGES, "gpt-4o-mini", "sk-test")).rejects.toSatisfy(
      (e: unknown) => e instanceof AIError && e.status === 500
    );
  });

  it("returns empty text when choices are missing", async () => {
    vi.stubGlobal("fetch", mockFetchOk({}));
    const result = await callOpenAI(MESSAGES, "gpt-4o-mini", "sk-test");
    expect(result.text).toBe("");
  });
});

// ── callAnthropic ──────────────────────────────────────────────────────────

describe("callAnthropic", () => {
  it("sends POST to anthropic messages with correct headers", async () => {
    const fetchMock = mockFetchOk({
      content: [{ text: "Hello from Claude" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callAnthropic(MESSAGES, "claude-haiku-20240307", "sk-ant-test");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-test");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(result.text).toBe("Hello from Claude");
  });

  it("separates system messages from user messages", async () => {
    const fetchMock = mockFetchOk({ content: [{ text: "ok" }] });
    vi.stubGlobal("fetch", fetchMock);

    const msgs = [
      { role: "system" as const, content: "You are helpful." },
      { role: "user" as const, content: "Hi" },
    ];
    await callAnthropic(msgs, "claude-haiku-20240307", "sk-ant-test");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.system).toBe("You are helpful.");
    expect(body.messages).toEqual([{ role: "user", content: "Hi" }]);
  });

  it("throws AIError on 401", async () => {
    vi.stubGlobal("fetch", mockFetchError(401, "Unauthorized", { error: { message: "invalid key" } }));

    await expect(callAnthropic(MESSAGES, "claude-haiku-20240307", "bad")).rejects.toSatisfy(
      (e: unknown) => e instanceof AIError && e.status === 401 && e.provider === "anthropic"
    );
  });
});

// ── callGoogle ─────────────────────────────────────────────────────────────

describe("callGoogle", () => {
  it("sends POST to Google Gemini generateContent endpoint", async () => {
    const fetchMock = mockFetchOk({
      candidates: [{ content: { parts: [{ text: "Gemini here" }] } }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callGoogle(MESSAGES, "gemini-1.5-flash", "AIza-test");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(url).toContain("gemini-1.5-flash");
    expect(url).toContain("AIza-test");
    expect(result.text).toBe("Gemini here");
  });

  it("throws AIError on 403", async () => {
    vi.stubGlobal("fetch", mockFetchError(403, "Forbidden", { error: { message: "API key invalid" } }));

    await expect(callGoogle(MESSAGES, "gemini-1.5-flash", "bad")).rejects.toSatisfy(
      (e: unknown) => e instanceof AIError && e.status === 403 && e.provider === "google"
    );
  });

  it("prepends system messages as a leading user turn", async () => {
    const fetchMock = mockFetchOk({ candidates: [{ content: { parts: [{ text: "ok" }] } }] });
    vi.stubGlobal("fetch", fetchMock);

    const msgs = [
      { role: "system" as const, content: "Be brief." },
      { role: "user" as const, content: "Hi" },
    ];
    await callGoogle(msgs, "gemini-1.5-flash", "AIza-test");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.contents[0].role).toBe("user");
    expect(body.contents[0].parts[0].text).toBe("Be brief.");
    expect(body.contents[1].parts[0].text).toBe("Hi");
  });
});

// ── callAI dispatcher ──────────────────────────────────────────────────────

describe("callAI", () => {
  it("dispatches to openai", async () => {
    vi.stubGlobal("fetch", mockFetchOk({ choices: [{ message: { content: "OpenAI response" } }] }));
    const result = await callAI("openai", MESSAGES, "sk-test");
    expect(result.text).toBe("OpenAI response");
  });

  it("dispatches to anthropic", async () => {
    vi.stubGlobal("fetch", mockFetchOk({ content: [{ text: "Anthropic response" }] }));
    const result = await callAI("anthropic", MESSAGES, "sk-ant-test");
    expect(result.text).toBe("Anthropic response");
  });

  it("dispatches to google", async () => {
    vi.stubGlobal("fetch", mockFetchOk({ candidates: [{ content: { parts: [{ text: "Google response" }] } }] }));
    const result = await callAI("google", MESSAGES, "AIza-test");
    expect(result.text).toBe("Google response");
  });

  it("throws AIError for unknown provider", async () => {
    await expect(
      // @ts-expect-error testing invalid provider
      callAI("unknown-provider", MESSAGES, "key")
    ).rejects.toSatisfy(
      (e: unknown) => e instanceof AIError && e.status === 400
    );
  });
});

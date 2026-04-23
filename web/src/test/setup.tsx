import React from "react";
import "@testing-library/jest-dom/vitest";

// Default fetch mock — returns 200 with empty JSON so tests that don't care
// about network don't hang on unresolved promises.
// Individual tests can override with vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(...)).
vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({}),
  })
);

// Mock next/font/google — returns simple objects
vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "test-var", className: "test" }),
  Fraunces: () => ({ variable: "test-var", className: "test" }),
  JetBrains_Mono: () => ({ variable: "test-var", className: "test" }),
}));

// Mock next/link — render a plain anchor so tests don't need the Next router
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    style,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    style?: React.CSSProperties;
    [key: string]: unknown;
  }) => (
    <a href={href} style={style} {...rest}>
      {children}
    </a>
  ),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

// Mock next-intl — provide stub hooks so components using useTranslations/useLocale
// render without requiring a real NextIntlClientProvider in test trees.
// The mock resolves keys from the real en.json messages so tests see English strings.
import enMessages from "@/i18n/messages/en.json";

type AnyObj = Record<string, unknown>;

function getNestedValue(obj: AnyObj, path: string): unknown {
  return path.split(".").reduce<unknown>((node, part) => {
    if (typeof node === "object" && node !== null && part in (node as AnyObj)) {
      return (node as AnyObj)[part];
    }
    return undefined;
  }, obj);
}

function resolveKey(namespace: string, key: string): string {
  const msgs = enMessages as AnyObj;
  // namespace may be dotted e.g. "onboarding.welcome"
  const nsNode = getNestedValue(msgs, namespace);
  if (typeof nsNode === "object" && nsNode !== null) {
    const val = getNestedValue(nsNode as AnyObj, key);
    if (typeof val === "string") {
      // Strip ICU plural blocks, simplify {param} → param name
      return val.replace(/\{[^,}]+,\s*plural,[^}]+\}/g, key)
                .replace(/\{(\w+)\}/g, "$1");
    }
  }
  return key;
}

vi.mock("next-intl", () => ({
  useTranslations: (namespace = "") => (key: string) =>
    resolveKey(namespace, key),
  useLocale: () => "en",
  NextIntlClientProvider: ({
    children,
  }: {
    children: React.ReactNode;
  }) => children,
}));

// ── Test utilities ─────────────────────────────────────────────────────────
//
// renderWithWS and makeTestQueryClient live in src/test/utils.tsx.
// Import them from there rather than from this file so that the WSProvider
// module is not loaded into every test environment at setup time.
//
// Example:
//   import { renderWithWS, makeTestQueryClient } from "@/test/utils";

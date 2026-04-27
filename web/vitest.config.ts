import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.tsx"],
    globals: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/e2e/**",
      "**/e2e-prod/**",
      "**/e2e-real/**",
      "**/*.e2e.spec.*",
      "**/*.stories.tsx",
    ],
    coverage: {
      provider: "v8",
      reporters: ["text", "html", "json-summary"],
      reportOnFailure: true,
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "**/*.d.ts",
        // Next.js infrastructure — documented in COVERAGE_NOTES.md as intentionally skipped
        "src/app/**/layout.tsx",
        "src/app/error.tsx",        // Next.js error boundary — requires error simulation
        "src/app/loading.tsx",      // render-only, no logic
        "src/app/not-found.tsx",    // one-line render
        "src/app/robots.ts",        // returns static config object
        "src/app/sitemap.ts",       // returns static URL list
        "src/app/sw.ts",            // service worker source — not testable in jsdom
        "src/app/offline/**",       // offline page — requires service worker context
        // sw-register uses navigator.serviceWorker which jsdom doesn't implement
        "src/components/sw-register.tsx",
        // hooks.ts and provider.tsx require a running React Query + browser
        // environment; tested via integration tests once the backend is live.
        "src/lib/api/hooks.ts",
        "src/lib/api/provider.tsx",
        // Auth UI pages — heavily visual; core logic is covered by auth-store tests
        // and login/page.test.tsx. Pin-login is a kiosk UI with no testable logic.
        "src/app/pin-login/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

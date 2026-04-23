import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Note: Serwist's withSerwistInit webpack plugin does not run under Turbopack
// (Next.js 16 default). The service worker is compiled by a separate post-build
// script (serwist.config.mjs) that uses @serwist/next's configurator mode with
// @serwist/build's injectManifest, which works regardless of bundler.
// See PWA.md for details.

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // output: 'standalone' produces a self-contained Node.js server in
  // .next/standalone/ — required for the Docker-based AWS/ECS deployment.
  // The web/Dockerfile copies this directory to build a minimal runtime image.
  // Local dev (next dev) and Vercel are unaffected by this setting.
  output: "standalone",
  turbopack: {
    // Pin root to this project so Next doesn't pick up a lockfile
    // from a parent IdeaProjects directory.
    root: process.cwd(),
  },
};

export default withNextIntl(nextConfig);

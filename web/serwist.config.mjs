/**
 * Post-build script: compiles src/app/sw.ts into public/sw.js and injects
 * the Serwist precache manifest. Run after `next build`.
 *
 * Uses @serwist/next's configurator mode so it works with Turbopack
 * (the withSerwistInit webpack plugin does not run under Turbopack).
 */
import { serwist } from "@serwist/next/config";
import { injectManifest } from "@serwist/build";

const rawConfig = await serwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
});

// serwist() returns some Next-specific and esbuild-specific keys that
// @serwist/build's injectManifest does not accept; strip them.
const { cacheOnNavigation, reloadOnOnline, esbuildOptions, ...config } =
  rawConfig;

const result = await injectManifest(config);

if (result.warnings.length > 0) {
  console.warn("[serwist] warnings:", result.warnings);
}

console.log("[serwist] service worker written to:", result.filePaths[0]);

# PWA Offline Support

Tidyboard ships as a Progressive Web App (PWA) using [Serwist](https://serwist.pages.dev/) with Next.js App Router.

## Approach: Configurator mode (Turbopack-compatible)

Next.js 16 uses Turbopack by default. Serwist's original `withSerwistInit` webpack plugin does **not** run under Turbopack, so the service worker was never compiled during `next build`. The fix is to use Serwist's **configurator mode**: a standalone post-build Node script that compiles and injects the precache manifest independently of the bundler.

### How it works

1. **`next build`** compiles the app with Turbopack as usual.

2. **`node serwist.config.mjs`** runs after the Next.js build:
   - Calls `serwist()` from `@serwist/next/config` to generate the Serwist options (glob patterns, manifest transforms, ignore rules) by reading the Next.js output directory.
   - Calls `injectManifest()` from `@serwist/build` to compile `src/app/sw.ts` into `public/sw.js` and inject the precache manifest of all static assets and prerendered pages.

3. **`package.json` `build` script** chains both steps:
   ```
   next build && node serwist.config.mjs
   ```

4. **`src/app/sw.ts`** is the service worker source. It:
   - Precaches every entry in `__SW_MANIFEST` on install.
   - Uses `skipWaiting` + `clientsClaim` so updates activate immediately.
   - Enables Navigation Preload for faster navigations on supporting browsers.
   - Applies Serwist's `defaultCache` runtime caching strategies (network-first for navigations, cache-first for static assets).

5. **`src/components/sw-register.tsx`** is a client component that registers `/sw.js` on mount in production. It is mounted in `layout.tsx`.

6. **`src/app/offline/page.tsx`** is served by the service worker when the browser is offline and the requested page is not in the cache.

## File summary

| File | Role |
|------|------|
| `serwist.config.mjs` | Post-build script: compiles sw.ts → public/sw.js |
| `src/app/sw.ts` | Service worker source (compiled by serwist.config.mjs) |
| `public/sw.js` | Compiled service worker (generated, not committed) |
| `src/components/sw-register.tsx` | Registers /sw.js in the browser |
| `src/app/offline/page.tsx` | Offline fallback page |

## Precached routes

Serwist precaches everything Next.js emits at build time, which includes:

- `/` — Dashboard
- `/onboarding`
- `/calendar`
- `/routines`
- `/meals`
- `/shopping`
- `/settings`
- All static JS/CSS chunks, fonts, and images in `/_next/static/`

Dynamic routes like `/recipes/[id]` are **not** precached; they are served from the runtime cache only if the user has visited them during the current online session.

## Testing offline locally

1. Run a production build: `npm run build && npm start`
2. Open the app in Chrome/Edge.
3. Open DevTools → **Application** → **Service Workers** — confirm `sw.js` is registered and active.
4. Go to DevTools → **Network** tab → check **Offline**.
5. Navigate to a precached route (e.g. `/`) — it should load from the cache.
6. Navigate to a route you have not visited (e.g. `/recipes/123`) — the service worker serves `/offline` instead.

## Why not the webpack plugin?

`@serwist/next`'s `withSerwistInit` wraps `next.config.ts` and hooks into webpack's build pipeline to compile the service worker. In Next.js 16, `next build` runs Turbopack by default, and Turbopack does not invoke webpack plugins. The warning printed during build is:

```
[@serwist/next] WARNING: You are using '@serwist/next' with `next dev --turbopack`,
but it doesn't support Turbopack.
```

The configurator mode approach avoids this entirely by running `injectManifest` as a plain Node.js script after `next build` completes, with no dependency on the bundler used.

## Known limitations

- **Dynamic recipe/item pages** (`/recipes/[id]`, etc.) are only available offline if the user visited them while online; they are not precached.
- **API calls** (future backend) will fail offline; the app handles those errors gracefully via the fallback layer in `src/lib/api/fallback.ts`.
- Service worker registration is **production-only**. During `next dev`, no service worker is installed so hot reload is unaffected.

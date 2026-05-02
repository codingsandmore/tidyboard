/**
 * /companion/manifest — companion-flagged PWA manifest endpoint (issue #89).
 *
 * Returns a `Web App Manifest` shaped for the phone-side experience.
 * `start_url` is `/companion` and the manifest declares shortcuts for the
 * three sub-pages (events / chores / shopping) so an "Add to Home Screen"
 * install on an adult's phone lands directly on the companion shell instead
 * of the kiosk root.
 *
 * Each shortcut carries the `companion` flag in its description so the
 * client can introspect that this manifest is the companion variant.
 */

export const dynamic = "force-static";

/**
 * Build the manifest body. Pure (no I/O) so unit tests can call this
 * directly to assert the shape without spinning up Next's runtime.
 */
export function buildCompanionManifest(): {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: string;
  orientation: string;
  theme_color: string;
  background_color: string;
  lang: string;
  categories: string[];
  icons: Array<{ src: string; sizes: string; type: string; purpose: string }>;
  shortcuts: Array<{
    name: string;
    short_name: string;
    description: string;
    url: string;
    icons: Array<{ src: string; sizes: string }>;
  }>;
} {
  return {
    name: "Tidyboard Companion",
    short_name: "Companion",
    description:
      "Phone-side companion for Tidyboard — manage household state on the go.",
    start_url: "/companion",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#4F7942",
    background_color: "#FAFAF9",
    lang: "en",
    categories: ["productivity", "lifestyle"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    shortcuts: [
      {
        name: "Events",
        short_name: "Events",
        description: "companion: upcoming household events",
        url: "/companion/events",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Chores",
        short_name: "Chores",
        description: "companion: outstanding household chores",
        url: "/companion/chores",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Shopping",
        short_name: "Shopping",
        description: "companion: phone-side shopping list",
        url: "/companion/shopping",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}

export function GET(): Response {
  return new Response(JSON.stringify(buildCompanionManifest(), null, 2), {
    status: 200,
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "public, max-age=300, must-revalidate",
    },
  });
}

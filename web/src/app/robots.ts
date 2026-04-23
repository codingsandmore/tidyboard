import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Disallow preview/design-canvas routes — they're dev artifacts
        disallow: [
          "/preview",
          "/dashboard/",
          "/calendar/day-dark",
          "/calendar/day/",
          "/calendar/week/",
          "/calendar/month/",
          "/calendar/agenda/",
          "/calendar/event/",
          "/routines/kid",
          "/routines/kid-dark",
          "/routines/checklist",
          "/routines/path",
          "/lock/screen",
          "/lock/members",
          "/recipes/preview-",
          "/meals/preview",
          "/shopping/preview",
          "/equity/preview",
          "/settings/preview",
          "/race/preview",
          "/onboarding/",
        ],
      },
    ],
    sitemap: "https://tidyboard.dev/sitemap.xml",
    host: "https://tidyboard.dev",
  };
}

import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale, locales, type Locale } from "./config";

function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  // Parse Accept-Language header and find first supported locale
  const preferred = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase().slice(0, 2));
  for (const lang of preferred) {
    if (locales.includes(lang as Locale)) return lang as Locale;
  }
  return defaultLocale;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieLocale = cookieStore.get("tb-locale")?.value;
  const locale: Locale =
    cookieLocale && locales.includes(cookieLocale as Locale)
      ? (cookieLocale as Locale)
      : negotiateLocale(headerStore.get("accept-language"));

  const messages = (
    await import(`./messages/${locale}.json`)
  ).default;

  // Default the formatter timezone to UTC on the server so SSR + client
  // agree. The client switches to its real local zone after hydration.
  // Without this, next-intl's <Date /> formatter logs ENVIRONMENT_FALLBACK
  // and can produce hydration mismatches around midnight.
  return {
    locale,
    messages,
    timeZone: "UTC",
    now: new Date(),
  };
});

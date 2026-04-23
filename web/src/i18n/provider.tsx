"use client";

import { NextIntlClientProvider, useLocale as useNextIntlLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { TB } from "@/lib/tokens";
import { locales, type Locale } from "./config";

export { useLocale } from "next-intl";

interface I18nProviderProps {
  locale: string;
  messages: Record<string, unknown>;
  children: ReactNode;
}

export function I18nProvider({ locale, messages, children }: I18nProviderProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  de: "DE",
};

export function LocaleSwitcher() {
  const router = useRouter();
  const currentLocale = useNextIntlLocale();

  function switchLocale(locale: Locale) {
    document.cookie = `tb-locale=${locale};path=/;max-age=31536000;SameSite=Lax`;
    router.refresh();
  }

  return (
    <div
      style={{
        display: "inline-flex",
        padding: 3,
        background: TB.bg2,
        borderRadius: 8,
        gap: 2,
      }}
    >
      {locales.map((locale) => (
        <button
          key={locale}
          onClick={() => switchLocale(locale)}
          style={{
            padding: "5px 12px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: currentLocale === locale ? 600 : 500,
            background: currentLocale === locale ? TB.surface : "transparent",
            color: currentLocale === locale ? TB.text : TB.text2,
            cursor: "pointer",
            border: "none",
            boxShadow:
              currentLocale === locale ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            fontFamily: TB.fontBody,
          }}
        >
          {LOCALE_LABELS[locale]}
        </button>
      ))}
    </div>
  );
}

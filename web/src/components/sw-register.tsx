"use client";

import { useEffect } from "react";

export default function SWRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silent on failure — PWA is a progressive enhancement
      });
    }
  }, []);

  return null;
}

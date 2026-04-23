"use client";

/**
 * /admin/audit/preview — device-framed design-review page.
 *
 * Renders the AuditLogPage inside a LaptopFrame with mock data active.
 * No AuthGate / AdminGate so designers can view it without logging in.
 */

import { LaptopFrame } from "@/components/frames/device-frames";
import { AuditLogPage } from "../page";
import { TB } from "@/lib/tokens";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth/auth-store";

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

export default function AuditPreviewPage() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <div
          style={{
            minHeight: "100vh",
            background: "#f0eee9",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: "40px 20px 60px",
            fontFamily: TB.fontBody,
          }}
        >
          <div style={{ marginBottom: 24, textAlign: "center" }}>
            <div
              style={{
                fontFamily: TB.fontDisplay,
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: TB.primary,
              }}
            >
              Audit log · preview
            </div>
            <div style={{ fontSize: 13, color: TB.text2, marginTop: 4 }}>
              Mock data · LaptopFrame · 1440 × 900
            </div>
          </div>
          <div style={{ transformOrigin: "top center", transform: "scale(0.7)" }}>
            <LaptopFrame w={1440} h={900}>
              <AuditLogPage mockMode />
            </LaptopFrame>
          </div>
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

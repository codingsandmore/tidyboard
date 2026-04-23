"use client";

import { AdaptiveDashboard } from "@/components/adaptive-dashboard";
import { AuthGate } from "@/components/auth-gate";

export default function Home() {
  return (
    <AuthGate>
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
        <AdaptiveDashboard />
      </div>
    </AuthGate>
  );
}

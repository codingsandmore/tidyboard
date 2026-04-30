"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdaptiveDashboard } from "@/components/adaptive-dashboard";
import { AuthGate } from "@/components/auth-gate";
import { useAuth } from "@/lib/auth/auth-store";
import { useHousehold } from "@/lib/api/hooks";

/**
 * Root page. When kiosk_mode_enabled is true and no activeMember is set,
 * redirect to /kiosk so any household member must authenticate first.
 */
function KioskGate({ children }: { children: React.ReactNode }) {
  const { household, activeMember, member } = useAuth();
  const { data: hh } = useHousehold(household?.id);
  const router = useRouter();

  const kioskEnabled = hh?.settings?.kiosk_mode_enabled ?? false;
  // activeMember defaults to member in the provider, so if they differ
  // it means someone explicitly set it; but if kiosk is enabled we require
  // explicit activeMember (not just the signed-in profile default).
  const hasActiveMember = Boolean(activeMember && activeMember.id === member?.id
    ? false  // same as signed-in member — need explicit switch
    : activeMember);

  useEffect(() => {
    if (kioskEnabled && !hasActiveMember) {
      router.push("/kiosk");
    }
  }, [kioskEnabled, hasActiveMember, router]);

  if (kioskEnabled && !hasActiveMember) {
    return null;
  }

  return <>{children}</>;
}

export default function Home() {
  return (
    <AuthGate>
      <KioskGate>
        <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
          <AdaptiveDashboard />
        </div>
      </KioskGate>
    </AuthGate>
  );
}

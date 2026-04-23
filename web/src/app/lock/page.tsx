"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KioskLock, KioskLockMembers } from "@/components/screens/routine";

type LockState = "lock" | "members";

export default function LockPage() {
  const [state, setState] = useState<LockState>("lock");
  const router = useRouter();

  return (
    <div
      style={{ width: "100vw", height: "100vh", overflow: "hidden" }}
      onClick={state === "lock" ? () => setState("members") : undefined}
    >
      {state === "lock" && <KioskLock />}
      {state === "members" && (
        <MembersWithNav onSelect={() => router.push("/")} />
      )}
    </div>
  );
}

function MembersWithNav({ onSelect }: { onSelect: () => void }) {
  return (
    <div
      style={{ width: "100%", height: "100%" }}
      onClick={onSelect}
    >
      <KioskLockMembers />
    </div>
  );
}

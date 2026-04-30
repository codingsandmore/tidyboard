"use client";

import { useRouter } from "next/navigation";
import { useMembers } from "@/lib/api/hooks";
import { TB } from "@/lib/tokens";
import type { AuthMember } from "@/lib/auth/auth-store";
import type { Member } from "@/lib/api/types";

interface MemberContextRequiredProps {
  title: string;
  returnTo: string;
  onAdultSelect(member: AuthMember): void;
}

function toAuthMember(member: Member): AuthMember {
  return {
    id: member.id,
    name: member.name,
    role: member.role === "child" ? "child" : "adult",
  };
}

export function MemberContextRequired({
  title,
  returnTo,
  onAdultSelect,
}: MemberContextRequiredProps) {
  const router = useRouter();
  const { data: members, isLoading } = useMembers();
  const selectableMembers = members?.filter((member) => member.role !== "pet") ?? [];

  function handleSelect(member: Member) {
    if (member.role === "child") {
      router.push(`/kiosk?member=${encodeURIComponent(member.id)}&returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    onAdultSelect(toAuthMember(member));
  }

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        background: TB.bg,
        color: TB.text,
        fontFamily: TB.fontBody,
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: 18 }}>
        <a href="/" style={{ color: TB.text2, textDecoration: "none", fontSize: 13 }}>Home</a>
        <div>
          <h1 style={{ margin: 0, fontFamily: TB.fontDisplay, fontSize: 28, fontWeight: 600 }}>
            {title}
          </h1>
          <p style={{ margin: "6px 0 0", color: TB.text2, fontSize: 14 }}>
            Adults can continue directly. Kids unlock with their kiosk PIN.
          </p>
        </div>

        {isLoading && <div style={{ color: TB.text2, fontSize: 14 }}>Loading members...</div>}

        {!isLoading && selectableMembers.length === 0 && (
          <div style={{ color: TB.text2, fontSize: 14 }}>
            Add a person to this family before using this page.
          </div>
        )}

        {!isLoading && selectableMembers.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            {selectableMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => handleSelect(member)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr",
                  gap: 12,
                  alignItems: "center",
                  textAlign: "left",
                  padding: 14,
                  minHeight: 76,
                  border: `1px solid ${TB.border}`,
                  borderRadius: 8,
                  background: TB.surface,
                  color: TB.text,
                  cursor: "pointer",
                  fontFamily: TB.fontBody,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: member.color,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                >
                  {member.initial}
                </span>
                <span style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{member.name}</span>
                  <span style={{ color: TB.text2, fontSize: 12 }}>
                    {member.role === "child" ? "Unlock with PIN" : "Continue"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

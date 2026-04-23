import type { CSSProperties } from "react";
import { TB } from "@/lib/tokens";
import type { Member } from "@/lib/data";

export function Avatar({
  member,
  size = 40,
  ring = true,
  selected = false,
  showInitial = true,
  style,
}: {
  member: Member;
  size?: number;
  ring?: boolean;
  selected?: boolean;
  showInitial?: boolean;
  style?: CSSProperties;
}) {
  const ringW = size >= 60 ? 3 : 2;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: member.color,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: TB.fontBody,
        fontWeight: 600,
        fontSize: Math.round(size * 0.42),
        boxShadow: ring
          ? `0 0 0 ${ringW}px ${selected ? "#fff" : "transparent"}, 0 0 0 ${
              ringW + 2
            }px ${selected ? member.color : "transparent"}`
          : "none",
        transition: "all .2s",
        flexShrink: 0,
        ...style,
      }}
    >
      {showInitial && member.initial}
    </div>
  );
}

export function StackedAvatars({
  members,
  size = 22,
  max = 4,
}: {
  members: Member[];
  size?: number;
  max?: number;
}) {
  const shown = members.slice(0, max);
  return (
    <div style={{ display: "flex" }}>
      {shown.map((m, i) => (
        <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -size * 0.33 }}>
          <Avatar
            member={m}
            size={size}
            ring={false}
            style={{ border: `1.5px solid ${TB.surface}` }}
          />
        </div>
      ))}
      {members.length > max && (
        <div
          style={{
            width: size,
            height: size,
            marginLeft: -size * 0.33,
            borderRadius: "50%",
            background: TB.bg2,
            border: `1.5px solid ${TB.surface}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.42,
            fontWeight: 600,
            color: TB.text2,
          }}
        >
          +{members.length - max}
        </div>
      )}
    </div>
  );
}

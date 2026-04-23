import type { CSSProperties, ReactNode } from "react";
import { TB } from "@/lib/tokens";

export function Badge({
  children,
  color,
  style,
}: {
  children?: ReactNode;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 9999,
        fontFamily: TB.fontBody,
        fontSize: 11,
        fontWeight: 600,
        background: color ? color + "20" : TB.bg2,
        color: color ?? TB.text2,
        border: `1px solid ${color ? color + "30" : TB.border}`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

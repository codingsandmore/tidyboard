import type { CSSProperties, ReactNode } from "react";
import { TB } from "@/lib/tokens";

export function Card({
  children,
  pad = 16,
  style,
  onClick,
  elevated = false,
  dark = false,
}: {
  children?: ReactNode;
  pad?: number;
  style?: CSSProperties;
  onClick?: () => void;
  elevated?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: dark ? TB.dElevated : TB.surface,
        border: `1px solid ${dark ? TB.dBorder : TB.border}`,
        borderRadius: TB.r.lg,
        padding: pad,
        boxShadow: elevated ? TB.shadow : "none",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// StripePlaceholder — diagonal-stripe image placeholder. Ported from primitives.jsx.
import type { CSSProperties } from "react";
import { TB } from "@/lib/tokens";

export function StripePlaceholder({
  w = "100%",
  h = 160,
  label = "",
  style = {},
}: {
  w?: number | string;
  h?: number | string;
  label?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        background: "repeating-linear-gradient(135deg, #E7E5E4 0 8px, #F5F5F4 8px 16px)",
        borderRadius: TB.r.md,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: TB.muted,
        fontFamily: TB.fontMono,
        fontSize: 11,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        ...style,
      }}
    >
      {label}
    </div>
  );
}

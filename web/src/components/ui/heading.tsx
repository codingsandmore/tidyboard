import type { CSSProperties, ReactNode } from "react";
import { TB } from "@/lib/tokens";
import { TYPE, type TypeName } from "@/lib/tokens";

export function H({
  as = "h1",
  children,
  style,
}: {
  as?: TypeName | "h1" | "h2" | "h3";
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const spec = TYPE[as as TypeName] ?? TYPE.h1;
  const Tag = /^h[1-3]$/.test(as) ? (as as "h1" | "h2" | "h3") : "div";
  return (
    <Tag
      style={{
        fontFamily: spec.font,
        fontSize: spec.size,
        fontWeight: spec.weight,
        letterSpacing:
          typeof spec.letter === "string" || typeof spec.letter === "number"
            ? spec.letter
            : "normal",
        lineHeight: 1.15,
        color: TB.text,
        margin: 0,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

import type { CSSProperties, ReactNode } from "react";
import { TB } from "@/lib/tokens";
import { Icon, type IconName } from "./icon";

type Kind = "primary" | "secondary" | "ghost" | "destructive" | "accent";
type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, { h: number; px: number; fs: number; gap: number }> = {
  sm: { h: 32, px: 12, fs: 13, gap: 6 },
  md: { h: 40, px: 16, fs: 14, gap: 8 },
  lg: { h: 48, px: 20, fs: 15, gap: 10 },
  xl: { h: 56, px: 24, fs: 16, gap: 10 },
};

const KINDS: Record<Kind, { bg: string; color: string; border: string; hover: string }> = {
  primary: { bg: TB.primary, color: "#fff", border: TB.primary, hover: TB.primaryHover },
  secondary: { bg: TB.surface, color: TB.text, border: TB.border, hover: TB.bg2 },
  ghost: { bg: "transparent", color: TB.text, border: "transparent", hover: TB.bg2 },
  destructive: { bg: TB.destructive, color: "#fff", border: TB.destructive, hover: "#B91C1C" },
  accent: { bg: TB.accent, color: "#fff", border: TB.accent, hover: "#6AA09B" },
};

// Maps each kind to its hover background. Passed as a CSS custom property
// so the global .tb-btn:hover rule can apply it — zero JS re-renders on hover.
const KIND_HOVER_VARS: Record<Kind, string> = {
  primary: TB.primaryHover,
  secondary: TB.bg2,
  ghost: TB.bg2,
  destructive: "#B91C1C",
  accent: "#6AA09B",
};

export function Btn({
  children,
  kind = "primary",
  size = "md",
  icon,
  iconRight,
  full,
  onClick,
  disabled,
  style,
}: {
  children?: ReactNode;
  kind?: Kind;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  full?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const s = SIZES[size];
  const k = KINDS[kind];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-kind={kind}
      className="tb-btn"
      style={{
        height: s.h,
        padding: `0 ${s.px}px`,
        fontFamily: TB.fontBody,
        fontSize: s.fs,
        fontWeight: 550,
        background: k.bg,
        color: k.color,
        border: `1px solid ${k.border}`,
        borderRadius: TB.r.md,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        width: full ? "100%" : "auto",
        transition: "background .12s, transform .06s",
        // expose hover color as a CSS custom property so the stylesheet rule works
        ["--tb-btn-hover" as string]: KIND_HOVER_VARS[kind],
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={s.fs + 2} />}
      {children}
      {iconRight && <Icon name={iconRight} size={s.fs + 2} />}
    </button>
  );
}

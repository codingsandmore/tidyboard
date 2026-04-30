import { TB } from "@/lib/tokens";

export interface MoneyDisplayProps {
  cents: number;
  color?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZES: Record<NonNullable<MoneyDisplayProps["size"]>, number> = {
  sm: 14,
  md: 18,
  lg: 28,
  xl: 48,
};

export function MoneyDisplay({ cents, color, size = "md" }: MoneyDisplayProps) {
  const negative = cents < 0;
  const dollars = Math.abs(cents) / 100;
  const formatted = dollars.toLocaleString("en-US", { style: "currency", currency: "USD" });
  return (
    <span
      style={{
        fontFamily: TB.fontDisplay,
        fontSize: SIZES[size],
        fontWeight: 600,
        color: color ?? TB.text,
      }}
    >
      {negative ? "−" + formatted : formatted}
    </span>
  );
}

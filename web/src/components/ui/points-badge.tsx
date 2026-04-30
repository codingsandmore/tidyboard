import { cn } from "@/lib/utils";

export interface PointsBadgeProps {
  value: number;
  color: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PointsBadge({ value, color, className, size = "md" }: PointsBadgeProps) {
  const sign = value > 0 ? "+" : "";
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : size === "lg" ? "text-lg px-4 py-1.5" : "text-sm px-3 py-1";
  return (
    <span
      className={cn("inline-flex items-center rounded-full font-semibold text-white", sizeClass, className)}
      style={{ backgroundColor: color }}
    >
      {sign}{value}
    </span>
  );
}

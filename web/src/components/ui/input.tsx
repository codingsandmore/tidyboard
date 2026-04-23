"use client";

import type { CSSProperties } from "react";
import { TB } from "@/lib/tokens";
import { Icon, type IconName } from "./icon";

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  full = true,
  error,
  style,
}: {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: IconName;
  full?: boolean;
  error?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div style={{ position: "relative", width: full ? "100%" : "auto" }}>
      {icon && (
        <div
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: TB.text2,
            pointerEvents: "none",
          }}
        >
          <Icon name={icon} size={16} />
        </div>
      )}
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          height: 44,
          padding: icon ? "0 12px 0 36px" : "0 12px",
          fontFamily: TB.fontBody,
          fontSize: 14,
          color: TB.text,
          background: TB.surface,
          border: `1px solid ${error ? TB.destructive : TB.border}`,
          borderRadius: TB.r.sm,
          outline: "none",
          transition: "border-color .1s, box-shadow .1s",
          boxSizing: "border-box",
          ...style,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = TB.primary;
          e.target.style.boxShadow = `0 0 0 3px ${TB.primary}22`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? TB.destructive : TB.border;
          e.target.style.boxShadow = "none";
        }}
      />
    </div>
  );
}

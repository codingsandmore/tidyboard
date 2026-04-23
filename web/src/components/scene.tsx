// Scene — centers a device frame on a warm-gray design canvas background.
import type { ReactNode } from "react";

export function Scene({
  children,
  label,
  pad = 40,
}: {
  children: ReactNode;
  label?: string;
  pad?: number;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0eee9",
        padding: pad,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflow: "auto",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}
    >
      <div style={{ display: "inline-flex", flexDirection: "column", gap: 10 }}>
        {label && (
          <div
            style={{
              fontSize: 13,
              color: "rgba(60,50,40,0.7)",
              fontWeight: 500,
              paddingLeft: 4,
            }}
          >
            {label}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

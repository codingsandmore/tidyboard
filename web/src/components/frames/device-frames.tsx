// Device frames — iPhone, iPad, laptop-ish. Ported from specs/design/app.jsx.
import type { CSSProperties, ReactNode } from "react";
import { TB } from "@/lib/tokens";

export function PhoneFrame({
  children,
  w = 390,
  h = 844,
  showStatus = true,
}: {
  children?: ReactNode;
  w?: number;
  h?: number;
  showStatus?: boolean;
}) {
  return (
    <div
      style={{
        width: w + 16,
        height: h + 16,
        borderRadius: 54,
        background: "#1C1917",
        padding: 8,
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: w,
          height: h,
          borderRadius: 46,
          overflow: "hidden",
          background: "#fff",
          position: "relative",
        }}
      >
        {showStatus && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 28px",
              zIndex: 20,
              fontFamily: "-apple-system, system-ui",
              fontSize: 14,
              fontWeight: 600,
              color: "#1C1917",
            }}
          >
            <span>9:41</span>
            <div
              style={{
                width: 110,
                height: 28,
                borderRadius: 14,
                background: "#1C1917",
                position: "absolute",
                top: 10,
                left: "50%",
                transform: "translateX(-50%)",
              }}
            />
            <span>100%</span>
          </div>
        )}
        <div
          style={{
            position: "absolute",
            top: showStatus ? 44 : 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function TabletFrame({
  children,
  w = 768,
  h = 1024,
}: {
  children?: ReactNode;
  w?: number;
  h?: number;
}) {
  return (
    <div
      style={{
        width: w + 24,
        height: h + 24,
        borderRadius: 36,
        background: "#1C1917",
        padding: 12,
        boxShadow: "0 30px 80px rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{
          width: w,
          height: h,
          borderRadius: 24,
          overflow: "hidden",
          background: "#fff",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function LaptopFrame({
  children,
  w = 1440,
  h = 900,
}: {
  children?: ReactNode;
  w?: number;
  h?: number;
}) {
  const chromeStyle: CSSProperties = {
    height: 36,
    padding: "0 14px",
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#2A2824",
  };
  const dotStyle = (bg: string): CSSProperties => ({
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: bg,
  });
  return (
    <div
      style={{
        width: w + 28,
        height: h + 60,
        borderRadius: 20,
        background: "#1C1917",
        boxShadow: "0 30px 80px rgba(0,0,0,0.3)",
        overflow: "hidden",
      }}
    >
      <div style={chromeStyle}>
        <div style={dotStyle("#ff6057")} />
        <div style={dotStyle("#febc2e")} />
        <div style={dotStyle("#29c33f")} />
        <div
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 11,
            color: "#A8A29E",
            fontFamily: TB.fontBody,
          }}
        >
          tidyboard · family dashboard
        </div>
      </div>
      <div style={{ width: w, height: h, background: "#fff", margin: "0 14px" }}>
        {children}
      </div>
    </div>
  );
}

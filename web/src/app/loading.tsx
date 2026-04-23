import { TB } from "@/lib/tokens";

// Content-shaped skeleton — matches the typical dashboard layout.
// Pulsing placeholder shapes; no spinners (per design system §6.1).
export default function Loading() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: TB.bg,
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes tb-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .tb-skel {
          animation: tb-pulse 1.6s ease-in-out infinite;
          background: ${TB.bg2};
          border-radius: ${TB.r.md}px;
        }
        @media (prefers-reduced-motion: reduce) {
          .tb-skel { animation: none; opacity: 0.6; }
        }
      `}</style>

      {/* Top bar skeleton */}
      <div
        style={{
          height: 56,
          background: TB.surface,
          borderBottom: `1px solid ${TB.border}`,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div className="tb-skel" style={{ width: 100, height: 20 }} />
        <div style={{ flex: 1 }} />
        <div className="tb-skel" style={{ width: 36, height: 36, borderRadius: 18 }} />
      </div>

      {/* Body skeleton */}
      <div style={{ flex: 1, padding: 24, display: "flex", gap: 20 }}>
        {/* Left sidebar */}
        <div
          style={{
            width: 120,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            flexShrink: 0,
          }}
        >
          {[48, 48, 48, 48].map((size, i) => (
            <div
              key={i}
              className="tb-skel"
              style={{
                width: size,
                height: size,
                borderRadius: 24,
                alignSelf: "center",
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="tb-skel" style={{ width: "50%", height: 28 }} />
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="tb-skel"
              style={{
                width: "100%",
                height: 72,
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

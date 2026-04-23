import type { CSSProperties } from "react";

export function FamilyShapes({
  size = 240,
  style,
}: {
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 320 240" style={style}>
      <rect x="0" y="0" width="320" height="240" fill="#F5F5F4" rx="18" />
      <rect x="32" y="140" width="120" height="76" fill="#fff" stroke="#E7E5E4" rx="8" />
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={32 + i * 30}
          y1="140"
          x2={32 + i * 30}
          y2="216"
          stroke="#E7E5E4"
        />
      ))}
      {[0, 1].map((i) => (
        <line
          key={i}
          x1="32"
          y1={168 + i * 24}
          x2="152"
          y2={168 + i * 24}
          stroke="#E7E5E4"
        />
      ))}
      <rect x="38" y="148" width="22" height="14" rx="3" fill="#4F7942" />
      <rect x="72" y="174" width="22" height="14" rx="3" fill="#D4A574" />
      <rect x="104" y="196" width="22" height="14" rx="3" fill="#7FB5B0" />
      <circle cx="200" cy="90" r="28" fill="#3B82F6" />
      <circle cx="248" cy="100" r="22" fill="#EF4444" />
      <circle cx="220" cy="150" r="16" fill="#22C55E" />
      <circle cx="254" cy="160" r="14" fill="#F59E0B" />
      <circle cx="72" cy="58" r="22" fill="#F59E0B" />
      <path d="M 260 30 Q 300 20 290 60 Q 270 60 260 30 Z" fill="#4F7942" />
    </svg>
  );
}

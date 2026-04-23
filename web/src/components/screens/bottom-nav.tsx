import Link from "next/link";
import type { CSSProperties } from "react";
import { TB } from "@/lib/tokens";
import { Icon, type IconName } from "@/components/ui/icon";

export type NavTab = { n: IconName; l: string; href?: string };

export function BottomNav({
  tabs,
  active = 0,
  dark = false,
  compact = false,
}: {
  tabs: NavTab[];
  active?: number;
  dark?: boolean;
  compact?: boolean;
}) {
  const bg = dark ? TB.dElevated : TB.surface;
  const border = dark ? TB.dBorder : TB.border;
  const tc2 = dark ? TB.dText2 : TB.text2;

  const tabContent = (t: NavTab, i: number, key: string | number) => {
    const style: CSSProperties = {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 3,
      padding: "6px 0",
      position: "relative",
      cursor: "pointer",
      color: i === active ? TB.primary : tc2,
      textDecoration: "none",
    };
    const body = (
      <>
        <Icon
          name={t.n}
          size={compact ? 20 : 22}
          color={i === active ? TB.primary : tc2}
          stroke={i === active ? 2.2 : 1.75}
        />
        <div
          style={{
            fontSize: compact ? 10 : 11,
            fontWeight: i === active ? 600 : 500,
            color: i === active ? TB.primary : tc2,
          }}
        >
          {t.l}
        </div>
        {i === active && (
          <div
            style={{
              position: "absolute",
              top: -1,
              width: 28,
              height: 3,
              borderRadius: 9999,
              background: TB.primary,
            }}
          />
        )}
      </>
    );
    return t.href ? (
      <Link key={key} href={t.href} style={style}>
        {body}
      </Link>
    ) : (
      <div key={key} style={style}>
        {body}
      </div>
    );
  };

  return (
    <div
      style={{
        borderTop: `1px solid ${border}`,
        background: bg,
        display: "flex",
        padding: compact ? "6px 0" : "8px 0",
        flexShrink: 0,
      }}
    >
      {tabs.map((t, i) => tabContent(t, i, i))}
    </div>
  );
}

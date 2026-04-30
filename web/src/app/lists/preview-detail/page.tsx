import Link from "next/link";
import { TB } from "@/lib/tokens";

export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: TB.bg,
        color: TB.text,
        fontFamily: TB.fontBody,
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ fontFamily: TB.fontDisplay, fontSize: 32, margin: 0 }}>List detail</h1>
        <p style={{ color: TB.text2, lineHeight: 1.5 }}>
          Open a real household list from the live lists screen.
        </p>
        <Link href="/lists" style={{ color: TB.primary, fontWeight: 700 }}>
          View lists
        </Link>
      </div>
    </main>
  );
}

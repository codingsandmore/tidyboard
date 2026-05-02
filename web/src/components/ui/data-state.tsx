import { TB } from "@/lib/tokens";
import { Btn } from "@/components/ui/button";
import { H } from "@/components/ui/heading";
import { SystemStatusPanel } from "@/components/ui/system-status";

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const maybe = error as { message?: unknown; status?: unknown; code?: unknown };
    const parts = [
      typeof maybe.status === "number" ? `HTTP ${maybe.status}` : "",
      typeof maybe.code === "string" ? maybe.code : "",
      typeof maybe.message === "string" ? maybe.message : "",
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(" - ");
  }
  if (error instanceof Error && error.message) return error.message;
  return "The backend request failed.";
}

export function DataErrorState({
  title = "Unable to load live data",
  error,
  onRetry,
  dark = false,
}: {
  title?: string;
  error: unknown;
  onRetry?: () => void;
  dark?: boolean;
}) {
  const bg = dark ? TB.dBg : TB.bg;
  const text = dark ? TB.dText : TB.text;
  const muted = dark ? TB.dText2 : TB.text2;
  const border = dark ? TB.dBorder : TB.border;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 180,
        background: bg,
        color: text,
        fontFamily: TB.fontBody,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        role="alert"
        style={{
          maxWidth: 460,
          width: "100%",
          border: `1px solid ${border}`,
          borderRadius: 10,
          background: dark ? TB.dElevated : TB.surface,
          padding: 18,
        }}
      >
        <H as="h2" style={{ fontSize: 20, color: text }}>
          {title}
        </H>
        <div style={{ marginTop: 8, color: muted, fontSize: 13, lineHeight: 1.45 }}>
          {errorMessage(error)}
        </div>
        <div style={{ marginTop: 12 }}>
          <SystemStatusPanel />
        </div>
        {onRetry && (
          <div style={{ marginTop: 14 }}>
            <Btn kind="secondary" size="sm" onClick={onRetry}>
              Retry
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}

export function DataLoadingState({ label = "Loading live data...", dark = false }: { label?: string; dark?: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 180,
        background: dark ? TB.dBg : TB.bg,
        color: dark ? TB.dText2 : TB.text2,
        fontFamily: TB.fontBody,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontSize: 14 }}>{label}</div>
    </div>
  );
}

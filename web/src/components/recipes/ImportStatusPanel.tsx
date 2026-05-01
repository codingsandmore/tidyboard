/**
 * Status panel for the recipe import-job polling flow (issue #108).
 *
 * Renders one of three visual states based on the supplied job:
 *   - running   : spinner + "Importing…" label.
 *   - succeeded : success label + a link to the created recipe.
 *   - failed    : the verbatim server `error_message` and a copy button.
 *
 * The component is intentionally presentational; the polling hook lives
 * in `@/lib/api/hooks` (`useImportJob`).
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { TB } from "@/lib/tokens";

export interface ImportJob {
  id: string;
  status: "running" | "succeeded" | "failed";
  error_message?: string;
  recipe_id?: string;
}

interface Props {
  job: ImportJob | null | undefined;
}

export function ImportStatusPanel({ job }: Props) {
  const [copied, setCopied] = useState(false);

  if (!job) return null;

  const baseStyle: React.CSSProperties = {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    border: `1px solid ${TB.border}`,
    background: TB.surface,
    fontSize: 13,
    color: TB.text,
  };

  if (job.status === "running") {
    return (
      <div data-testid="import-job-status" data-status="running" style={baseStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            data-testid="import-job-spinner"
            aria-label="Loading"
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: `2px solid ${TB.border}`,
              borderTopColor: TB.primary,
              display: "inline-block",
              animation: "tb-spin 0.8s linear infinite",
            }}
          />
          <span>Importing… this may take up to 30 seconds.</span>
          <style>{`@keyframes tb-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (job.status === "succeeded") {
    return (
      <div data-testid="import-job-status" data-status="succeeded" style={baseStyle}>
        <div style={{ color: TB.success, fontWeight: 600, marginBottom: 6 }}>
          Recipe imported.
        </div>
        {job.recipe_id ? (
          <Link
            data-testid="import-job-recipe-link"
            href={`/recipes/${job.recipe_id}`}
            style={{ color: TB.primary, textDecoration: "underline" }}
          >
            Open the new recipe →
          </Link>
        ) : null}
      </div>
    );
  }

  // Failed — render the server message verbatim. We intentionally do NOT wrap
  // it with "Failed to import" because the upstream message is already the
  // primary signal (issue #108 acceptance criterion).
  const msg = job.error_message ?? "";
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard may be unavailable in older browsers / non-https contexts;
      // we don't want to crash the panel if the copy fails.
    }
  }

  return (
    <div
      data-testid="import-job-status"
      data-status="failed"
      style={{
        ...baseStyle,
        borderColor: TB.destructive,
      }}
    >
      <div style={{ color: TB.destructive, fontWeight: 600, marginBottom: 6 }}>
        Import failed
      </div>
      <pre
        data-testid="import-job-error"
        style={{
          margin: 0,
          padding: 8,
          background: TB.bg,
          borderRadius: 6,
          fontSize: 12,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {msg}
      </pre>
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button
          type="button"
          data-testid="import-job-error-copy"
          onClick={handleCopy}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: `1px solid ${TB.border}`,
            background: TB.bg,
            color: TB.text,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          {copied ? "Copied" : "Copy error"}
        </button>
      </div>
    </div>
  );
}

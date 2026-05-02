/**
 * SmartImportReview — issue #87 (Cozyla Hub: review-based smart import).
 *
 * Renders the {draft, normalized?} envelope returned by
 * POST /v1/recipes/smart-import as an editable review form. The user can
 * tweak any field before confirming; only on Confirm is the recipe
 * actually persisted via the regular POST /v1/recipes endpoint.
 *
 * The component is intentionally self-contained: it has no networking
 * (the parent owns the API calls + routing) and no global state. It
 * accepts `initialDraft` plus callbacks and renders three groups of
 * controls: title/description, source metadata, and tags/categories.
 *
 * Acceptance criteria covered here:
 *   - "Import produces a draft review screen before writing records."
 *   - "Web tests for review/confirm/cancel."
 *
 * The companion test lives at SmartImportReview.test.tsx.
 */
"use client";

import { useState } from "react";
import { TB } from "@/lib/tokens";
import { Btn } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { H } from "@/components/ui/heading";

export type SmartImportSource = "url" | "photo";

export interface SmartImportDraft {
  title: string;
  description?: string;
  source_url?: string;
  source_domain?: string;
  image_url?: string;
  servings?: number;
  servings_unit?: string;
  categories?: string[];
  tags?: string[];
  difficulty?: string;
  notes?: string;
  source: SmartImportSource;
}

export interface SmartImportReviewProps {
  /** The raw scraped/parsed draft. */
  initialDraft: SmartImportDraft;
  /** Optional AI-normalized variant. When present, the form starts with
   * Normalized values and shows an "AI tidied" badge. */
  normalized?: SmartImportDraft | null;
  /** Provider name, e.g. "ollama" or "disabled". Drives the badge. */
  aiProvider?: string;
  /** Non-fatal AI failure surface. When set the form still renders the
   * raw draft, but a small hint explains AI was off. */
  aiError?: string;
  /** Confirm = save. Receives the user-edited draft. Async so the parent
   * can drive a spinner. */
  onConfirm: (draft: SmartImportDraft) => void | Promise<void>;
  /** Cancel = discard + leave the screen. */
  onCancel: () => void;
}

/** Convert a string of comma-separated values to a clean string[]. Used
 * for the tags / categories inputs so users can type "dinner, easy". */
function csvToList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function SmartImportReview({
  initialDraft,
  normalized,
  aiProvider,
  aiError,
  onConfirm,
  onCancel,
}: SmartImportReviewProps) {
  // Prefer the normalized variant when AI returned one — that's the whole
  // point of running normalization. The user can still edit anything.
  const start = normalized ?? initialDraft;
  const [title, setTitle] = useState(start.title ?? "");
  const [description, setDescription] = useState(start.description ?? "");
  const [tagsCsv, setTagsCsv] = useState((start.tags ?? []).join(", "));
  const [categoriesCsv, setCategoriesCsv] = useState(
    (start.categories ?? []).join(", "),
  );
  const [difficulty, setDifficulty] = useState(start.difficulty ?? "easy");
  const [busy, setBusy] = useState(false);

  const aiBadge =
    normalized && aiProvider && aiProvider !== "disabled"
      ? `AI tidied · ${aiProvider}`
      : null;

  async function handleConfirm() {
    if (!title.trim()) return; // hard-required
    setBusy(true);
    try {
      await onConfirm({
        ...start,
        title: title.trim(),
        description: description.trim(),
        tags: csvToList(tagsCsv),
        categories: csvToList(categoriesCsv),
        difficulty,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      data-testid="smart-import-review"
      style={{
        background: TB.surface,
        border: `1px solid ${TB.border}`,
        borderRadius: 12,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <H as="h3" style={{ fontSize: 18 }}>
          Review draft
        </H>
        {aiBadge && (
          <span
            data-testid="smart-import-ai-badge"
            style={{
              fontSize: 11,
              color: TB.primary,
              background: TB.primary + "18",
              padding: "2px 8px",
              borderRadius: 999,
            }}
          >
            {aiBadge}
          </span>
        )}
        {initialDraft.source === "photo" && (
          <span
            style={{
              fontSize: 11,
              color: TB.text2,
              background: TB.border,
              padding: "2px 8px",
              borderRadius: 999,
            }}
          >
            from photo
          </span>
        )}
      </div>

      {aiError && (
        <div
          data-testid="smart-import-ai-error"
          style={{
            fontSize: 12,
            color: TB.text2,
            padding: "8px 12px",
            background: TB.border,
            borderRadius: 8,
          }}
        >
          AI couldn’t tidy this draft — review the raw fields below.
        </div>
      )}

      {initialDraft.source === "photo" && initialDraft.image_url && (
        <img
          src={initialDraft.image_url}
          alt="Imported photo preview"
          data-testid="smart-import-photo-preview"
          style={{
            width: "100%",
            maxHeight: 200,
            objectFit: "cover",
            borderRadius: 8,
            border: `1px solid ${TB.border}`,
          }}
        />
      )}

      <label style={{ fontSize: 12, color: TB.text2 }}>Title</label>
      <Input
        value={title}
        onChange={(v) => setTitle(v)}
        ariaLabel="Recipe title"
      />

      <label style={{ fontSize: 12, color: TB.text2 }}>Description</label>
      <Input
        value={description}
        onChange={(v) => setDescription(v)}
        ariaLabel="Recipe description"
      />

      <label style={{ fontSize: 12, color: TB.text2 }}>
        Tags (comma-separated)
      </label>
      <Input
        value={tagsCsv}
        onChange={(v) => setTagsCsv(v)}
        ariaLabel="Recipe tags"
      />

      <label style={{ fontSize: 12, color: TB.text2 }}>
        Categories (comma-separated)
      </label>
      <Input
        value={categoriesCsv}
        onChange={(v) => setCategoriesCsv(v)}
        ariaLabel="Recipe categories"
      />

      <label style={{ fontSize: 12, color: TB.text2 }}>Difficulty</label>
      <select
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value)}
        aria-label="Recipe difficulty"
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          border: `1px solid ${TB.border}`,
          background: TB.bg,
          color: TB.text,
          fontSize: 14,
        }}
      >
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 8,
          justifyContent: "flex-end",
        }}
      >
        <Btn
          kind="ghost"
          size="md"
          onClick={onCancel}
          data-testid="smart-import-cancel"
        >
          Cancel
        </Btn>
        <Btn
          kind="primary"
          size="md"
          onClick={handleConfirm}
          disabled={busy || !title.trim()}
          data-testid="smart-import-confirm"
        >
          {busy ? "Saving…" : "Confirm and save"}
        </Btn>
      </div>
    </div>
  );
}

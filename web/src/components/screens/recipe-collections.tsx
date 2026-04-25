"use client";

import { useState } from "react";
import { TB } from "@/lib/tokens";
import { Icon } from "@/components/ui/icon";
import { Btn } from "@/components/ui/button";
import { H } from "@/components/ui/heading";
import {
  useRecipeCollections,
  useCreateCollection,
  useDeleteCollection,
  useAssignRecipeToCollection,
  useRemoveRecipeFromCollection,
  useCollectionRecipes,
  useRecipes,
} from "@/lib/api/hooks";
import type { RecipeCollection } from "@/lib/api/types";
import type { Recipe } from "@/lib/data";

// ── Create collection modal ────────────────────────────────────────────────

function CreateCollectionModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const create = useCreateCollection();

  function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    create.mutate(
      { name: name.trim() },
      {
        onSuccess: () => { onClose(); },
        onError: () => { setError("Failed to create collection"); },
      }
    );
  }

  return (
    <div
      data-testid="create-collection-modal"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: TB.surface,
          borderRadius: 16,
          padding: 24,
          width: 340,
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
      >
        <H as="h3" style={{ fontSize: 18, marginBottom: 16 }}>
          New collection
        </H>
        <input
          data-testid="collection-name-input"
          autoFocus
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          placeholder="e.g. Quick weeknights"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: `1px solid ${error ? TB.destructive : TB.border}`,
            background: TB.bg,
            color: TB.text,
            fontSize: 14,
            fontFamily: TB.fontBody,
            boxSizing: "border-box",
          }}
        />
        {error && (
          <div style={{ fontSize: 12, color: TB.destructive, marginTop: 4 }}>
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <Btn kind="ghost" size="sm" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            kind="primary"
            size="sm"
            onClick={handleSubmit}
          >
            {create.isPending ? "Creating…" : "Create"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Add to collection dropdown ─────────────────────────────────────────────

export function AddToCollectionMenu({
  recipe,
  onClose,
}: {
  recipe: Recipe;
  onClose: () => void;
}) {
  const { data: collections = [] } = useRecipeCollections();
  const assign = useAssignRecipeToCollection();
  const remove = useRemoveRecipeFromCollection();
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Determine which collections already contain this recipe by fetching each.
  // For UI purposes we track optimistically.
  const [assigned, setAssigned] = useState<Set<string>>(new Set());

  function toggle(col: RecipeCollection) {
    setBusy(col.id);
    if (assigned.has(col.id)) {
      remove.mutate(
        { collectionId: col.id, recipeId: recipe.id },
        {
          onSuccess: () => {
            setAssigned((prev) => { const s = new Set(prev); s.delete(col.id); return s; });
            setBusy(null);
          },
          onError: () => setBusy(null),
        }
      );
    } else {
      assign.mutate(
        { collectionId: col.id, recipeId: recipe.id },
        {
          onSuccess: () => {
            setAssigned((prev) => new Set([...prev, col.id]));
            setBusy(null);
          },
          onError: () => setBusy(null),
        }
      );
    }
  }

  return (
    <>
      <div
        data-testid="add-to-collection-menu"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
        }}
      />
      <div
        data-testid="collection-menu-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: 4,
          background: TB.surface,
          border: `1px solid ${TB.border}`,
          borderRadius: 12,
          padding: 8,
          minWidth: 220,
          boxShadow: TB.shadow,
          zIndex: 201,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: TB.text2,
            padding: "4px 8px 8px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Add to collection
        </div>

        {collections.length === 0 && (
          <div style={{ fontSize: 12, color: TB.muted, padding: "6px 8px" }}>
            No collections yet
          </div>
        )}

        {collections.map((col) => (
          <button
            key={col.id}
            data-testid={`assign-collection-${col.id}`}
            onClick={() => toggle(col)}
            disabled={busy === col.id}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 8px",
              border: "none",
              borderRadius: 8,
              background: "transparent",
              color: TB.text,
              cursor: "pointer",
              fontFamily: TB.fontBody,
              fontSize: 13,
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                border: `1.5px solid ${assigned.has(col.id) ? TB.primary : TB.border}`,
                background: assigned.has(col.id) ? TB.primary : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {assigned.has(col.id) && (
                <Icon name="check" size={10} color="#fff" />
              )}
            </div>
            <span style={{ flex: 1 }}>{col.name}</span>
            {busy === col.id && (
              <span style={{ fontSize: 10, color: TB.muted }}>…</span>
            )}
          </button>
        ))}

        <div
          style={{
            borderTop: `1px solid ${TB.borderSoft}`,
            marginTop: 4,
            paddingTop: 4,
          }}
        >
          <button
            data-testid="create-new-collection-btn"
            onClick={() => setShowCreate(true)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 8px",
              border: "none",
              borderRadius: 8,
              background: "transparent",
              color: TB.primary,
              cursor: "pointer",
              fontFamily: TB.fontBody,
              fontSize: 13,
              textAlign: "left",
              fontWeight: 600,
            }}
          >
            <Icon name="plus" size={14} color={TB.primary} />
            New collection
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateCollectionModal
          onClose={() => { setShowCreate(false); }}
        />
      )}
    </>
  );
}

// ── Collection sidebar for recipes page ───────────────────────────────────

export function CollectionSidebar({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { data: collections = [] } = useRecipeCollections();
  const deleteCollection = useDeleteCollection();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <div
        data-testid="collection-sidebar"
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: `1px solid ${TB.border}`,
          display: "flex",
          flexDirection: "column",
          background: TB.surface,
          height: "100%",
          overflow: "auto",
        }}
      >
        <div
          style={{
            padding: "12px 14px 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: TB.text2,
              textTransform: "uppercase",
            }}
          >
            Collections
          </span>
          <button
            data-testid="new-collection-btn"
            onClick={() => setShowCreate(true)}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 2,
              color: TB.primary,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Icon name="plus" size={16} color={TB.primary} />
          </button>
        </div>

        {/* All recipes item */}
        <button
          data-testid="collection-all"
          onClick={() => onSelect(null)}
          style={{
            padding: "8px 14px",
            border: "none",
            background: selectedId === null ? TB.primary + "15" : "transparent",
            color: selectedId === null ? TB.primary : TB.text,
            cursor: "pointer",
            fontFamily: TB.fontBody,
            fontSize: 13,
            fontWeight: selectedId === null ? 600 : 400,
            textAlign: "left",
            borderLeft: selectedId === null ? `3px solid ${TB.primary}` : "3px solid transparent",
            width: "100%",
          }}
        >
          All recipes
        </button>

        {collections.map((col) => (
          <div
            key={col.id}
            style={{ display: "flex", alignItems: "center", paddingRight: 6 }}
          >
            <button
              data-testid={`collection-item-${col.id}`}
              onClick={() => onSelect(col.id)}
              style={{
                flex: 1,
                padding: "8px 14px",
                border: "none",
                background: selectedId === col.id ? TB.primary + "15" : "transparent",
                color: selectedId === col.id ? TB.primary : TB.text,
                cursor: "pointer",
                fontFamily: TB.fontBody,
                fontSize: 13,
                fontWeight: selectedId === col.id ? 600 : 400,
                textAlign: "left",
                borderLeft: selectedId === col.id ? `3px solid ${TB.primary}` : "3px solid transparent",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {col.name}
            </button>
            <button
              data-testid={`delete-collection-${col.id}`}
              onClick={() => deleteCollection.mutate(col.id)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: "2px 4px",
                color: TB.muted,
                fontSize: 12,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {showCreate && (
        <CreateCollectionModal onClose={() => setShowCreate(false)} />
      )}
    </>
  );
}

// ── Collection recipes view ────────────────────────────────────────────────

export function CollectionRecipesView({ collectionId }: { collectionId: string }) {
  const { data: recipes = [], isLoading } = useCollectionRecipes(collectionId);

  if (isLoading) {
    return (
      <div style={{ padding: 32, color: TB.text2, fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div
        data-testid="empty-collection"
        style={{
          padding: "48px 24px",
          textAlign: "center",
          color: TB.text2,
          fontSize: 14,
        }}
      >
        No recipes in this collection yet. Use the menu on a recipe card to add one.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 16,
        padding: 24,
      }}
    >
      {recipes.map((r: Recipe) => (
        <a
          key={r.id}
          href={`/recipes/${r.id}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div
            style={{
              background: TB.surface,
              border: `1px solid ${TB.border}`,
              borderRadius: 12,
              padding: 14,
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600 }}>{r.title}</div>
            <div
              style={{ fontSize: 11, color: TB.text2, marginTop: 4, fontFamily: TB.fontMono }}
            >
              {r.source}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

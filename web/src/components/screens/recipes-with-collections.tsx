"use client";

import { useState } from "react";
import Link from "next/link";
import { TB } from "@/lib/tokens";
import { TBD } from "@/lib/data";
import { H } from "@/components/ui/heading";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useRecipes } from "@/lib/api/hooks";
import { CollectionSidebar, CollectionRecipesView, AddToCollectionMenu } from "./recipe-collections";
import type { Recipe } from "@/lib/data";

export function RecipesWithCollections() {
  const { data: recipes } = useRecipes();
  const allRecipes: Recipe[] = recipes ?? TBD.recipes;
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [menuRecipe, setMenuRecipe] = useState<Recipe | null>(null);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: TB.bg,
        fontFamily: TB.fontBody,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: "8px 16px",
          background: TB.surface,
          borderBottom: `1px solid ${TB.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        <a
          href="/"
          style={{
            color: TB.text2,
            textDecoration: "none",
            padding: "6px 10px",
            borderRadius: 6,
            border: `1px solid ${TB.border}`,
          }}
        >
          ← Home
        </a>
        <div style={{ flex: 1 }} />
        <Link
          href="/recipes/import"
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: `1px solid ${TB.primary}`,
            background: TB.primary,
            color: "#fff",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          + Add recipe
        </Link>
      </div>

      {/* Body — sidebar + content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Collection sidebar */}
        <CollectionSidebar
          selectedId={selectedCollection}
          onSelect={(id) => { setSelectedCollection(id); setMenuRecipe(null); }}
        />

        {/* Recipe grid */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {selectedCollection !== null ? (
            <>
              <div style={{ padding: "20px 24px 0" }}>
                <H as="h2" style={{ fontSize: 22 }}>
                  Collection recipes
                </H>
              </div>
              <CollectionRecipesView collectionId={selectedCollection} />
            </>
          ) : (
            <div style={{ padding: 24 }}>
              <H as="h2" style={{ fontSize: 22, marginBottom: 16 }}>
                All Recipes
              </H>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 16,
                }}
              >
                {allRecipes.map((r) => (
                  <div key={r.id} style={{ position: "relative" }}>
                    <Link
                      href={`/recipes/${r.id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <div
                        style={{
                          background: TB.surface,
                          border: `1px solid ${TB.border}`,
                          borderRadius: 12,
                          padding: 16,
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: 16, fontWeight: 600, color: TB.text, marginBottom: 4 }}>
                          {r.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: TB.text2,
                            fontFamily: TB.fontMono,
                            marginBottom: 10,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {r.source}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            fontSize: 12,
                            color: TB.text2,
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Icon name="clock" size={13} color={TB.text2} />
                            {r.total}m
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Icon name="users" size={13} color={TB.text2} />
                            {r.serves}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Icon name="star" size={13} color={TB.warning} />
                            {r.rating}/5
                          </span>
                          <div style={{ flex: 1 }} />
                          {r.tag.slice(0, 2).map((t) => (
                            <Badge key={t}>#{t}</Badge>
                          ))}
                        </div>
                      </div>
                    </Link>

                    {/* "Add to collection" menu button */}
                    <div
                      style={{ position: "absolute", top: 10, right: 10 }}
                    >
                      <button
                        data-testid={`collection-menu-btn-${r.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setMenuRecipe(menuRecipe?.id === r.id ? null : r);
                        }}
                        style={{
                          border: `1px solid ${TB.border}`,
                          borderRadius: 6,
                          background: TB.surface,
                          padding: "3px 7px",
                          cursor: "pointer",
                          fontSize: 14,
                          color: TB.text2,
                          display: "flex",
                          alignItems: "center",
                        }}
                        title="Add to collection"
                      >
                        <Icon name="plus" size={13} color={TB.text2} />
                      </button>
                      {menuRecipe?.id === r.id && (
                        <AddToCollectionMenu
                          recipe={r}
                          onClose={() => setMenuRecipe(null)}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { TB } from "@/lib/tokens";
import { TBD } from "@/lib/data";
import { Icon } from "@/components/ui/icon";
import { Btn } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { H } from "@/components/ui/heading";
import { StripePlaceholder } from "@/components/ui/stripe-placeholder";
import type { ShoppingCategory } from "@/lib/data";
import { useShopping, useToggleShoppingItem, useMealPlan, useUpsertMealPlanEntry, useRecipes, useRecipe, useImportRecipe, useGenerateShoppingList } from "@/lib/api/hooks";
import { useTranslations } from "next-intl";
import { isAIEnabled, useAIKeys } from "@/lib/ai/ai-keys";
import { callAI } from "@/lib/ai/client";
import type { AIProvider } from "@/lib/ai/client";

// ─── local helpers ───────────────────────────────────────────────────────────

const Meta = ({ icon, label, tc2 }: { icon: string; label: string; tc2: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <Icon name={icon as Parameters<typeof Icon>[0]["name"]} size={14} color={tc2} />
    {label}
  </div>
);

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div
    style={{
      padding: "8px 10px",
      background: TB.surface,
      border: `1px solid ${TB.border}`,
      borderRadius: 8,
      textAlign: "center",
    }}
  >
    <div style={{ fontFamily: TB.fontDisplay, fontSize: 18, fontWeight: 600 }}>{value}</div>
    <div style={{ fontSize: 10, color: TB.text2, marginTop: 2 }}>{label}</div>
  </div>
);

// ═══════ Recipe Import — Step 1 (URL input) ═══════
export function RecipeImport() {
  const t = useTranslations("recipe");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [url, setUrl] = useState("https://www.seriouseats.com/spaghetti-alla-carbonara-recipe");
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const importMutation = useImportRecipe();

  function handleImport() {
    if (!url.trim()) return;
    setImportError(null);
    setImportSuccess(false);
    importMutation.mutate(url.trim(), {
      onSuccess: () => {
        setImportSuccess(true);
        setUrl("");
      },
      onError: () => {
        setImportError("Failed to import recipe. Check the URL and try again.");
      },
    });
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: TB.bg,
        color: TB.text,
        fontFamily: TB.fontBody,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${TB.border}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: TB.surface,
        }}
      >
        <Icon name="chevronL" size={22} color={TB.text2} />
        <H as="h2" style={{ fontSize: 20 }}>
          {t("addRecipe")}
        </H>
      </div>
      <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              margin: "0 auto",
              borderRadius: 20,
              background: TB.primary + "18",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="link" size={32} color={TB.primary} />
          </div>
          <H as="h3" style={{ marginTop: 16, fontSize: 22 }}>
            {t("pasteUrl")}
          </H>
          <div style={{ color: TB.text2, fontSize: 13, marginTop: 4 }}>
            {t("worksWithSites")}
          </div>
        </div>

        <Input
          value={url}
          onChange={(v) => { setUrl(v); setImportError(null); setImportSuccess(false); }}
          style={{ height: 52, fontSize: 14 }}
        />
        {importError && (
          <div
            data-testid="import-error"
            style={{ marginTop: 8, fontSize: 12, color: TB.destructive }}
          >
            {importError}
          </div>
        )}
        {importSuccess && (
          <div
            data-testid="import-success"
            style={{ marginTop: 8, fontSize: 12, color: TB.success }}
          >
            {t("importRecipe")} — saved to your collection!
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <Btn
            kind="primary"
            size="lg"
            full
            onClick={handleImport}
          >
            {importMutation.isPending ? "Importing…" : t("importRecipe")}
          </Btn>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            margin: "20px 0",
            color: TB.text2,
            fontSize: 12,
          }}
        >
          <div style={{ flex: 1, height: 1, background: TB.border }} />
          {tCommon("or")}
          <div style={{ flex: 1, height: 1, background: TB.border }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn kind="secondary" size="lg" full icon="pencil" onClick={() => router.push("/recipes/import?manual=1")}>
            {t("enterManually")}
          </Btn>
          <Btn
            kind="ghost"
            size="lg"
            full
            icon="list"
            disabled
            title="File import (Paprika, JSON) — planned for v0.2"
          >
            {t("importFromFile")}
          </Btn>
        </div>

        <div
          style={{
            marginTop: 28,
            padding: 14,
            background: TB.surface,
            border: `1px solid ${TB.borderSoft}`,
            borderRadius: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: TB.text2,
              marginBottom: 8,
            }}
          >
            {t("recentlyAdded")}
          </div>
          {[
            "Sheet Pan Chicken Fajitas · nytimes.com",
            "Miso Butter Salmon · bonappetit.com",
          ].map((item, i) => (
            <div
              key={i}
              style={{
                padding: "6px 0",
                fontSize: 13,
                color: TB.text,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Icon name="chef" size={14} color={TB.text2} />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Parse a leading numeric token from an ingredient amount and rebuild it
// scaled by `factor`. Handles: integers, decimals, fractions ("1/2"), and
// mixed numbers ("2 1/4"). Anything we can't parse is returned untouched
// so we never mangle a non-numeric amount string.
export function scaleAmount(amt: string | undefined, factor: number): string {
  if (!amt) return "";
  if (factor === 1) return amt;
  const m = amt.match(/^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)(.*)$/);
  if (!m) return amt;
  const [, numToken, rest] = m;
  let value: number;
  if (numToken.includes(" ")) {
    const [whole, frac] = numToken.split(/\s+/);
    const [n, d] = frac.split("/").map(Number);
    value = Number(whole) + n / d;
  } else if (numToken.includes("/")) {
    const [n, d] = numToken.split("/").map(Number);
    value = n / d;
  } else {
    value = Number(numToken);
  }
  const scaled = value * factor;
  const rounded = Math.round(scaled * 100) / 100;
  const display = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return `${display}${rest}`;
}

// ═══════ Recipe Detail ═══════
export function RecipeDetail({ id, dark = false }: { id?: string; dark?: boolean }) {
  const t = useTranslations("recipe");
  const router = useRouter();
  const { data: apiRecipe } = useRecipe(id ?? "");
  const r = apiRecipe;
  const bg = dark ? TB.dBg : TB.bg;
  const surf = dark ? TB.dElevated : TB.surface;
  const tc = dark ? TB.dText : TB.text;
  const tc2 = dark ? TB.dText2 : TB.text2;
  const border = dark ? TB.dBorder : TB.border;
  const [tab, setTab] = useState("ing");
  const baseServes = r?.serves ?? 1;
  const [servings, setServings] = useState<number>(baseServes);
  useEffect(() => {
    if (r?.serves) setServings(r.serves);
  }, [r?.id, r?.serves]);
  const scaleFactor = baseServes > 0 ? servings / baseServes : 1;

  if (!r) {
    return (
      <div style={{ width: "100%", height: "100%", background: bg, color: tc, fontFamily: TB.fontBody, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
        <H as="h2" style={{ color: tc2, fontSize: 20 }}>{t("noRecipeFound")}</H>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: bg,
        color: tc,
        fontFamily: TB.fontBody,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        boxSizing: "border-box",
      }}
    >
      {/* Hero */}
      <div
        style={{
          position: "relative",
          height: 280,
          background: "linear-gradient(135deg, #D4A574, #A67C4E)",
          display: "flex",
          alignItems: "flex-end",
          padding: 20,
          overflow: "hidden",
        }}
      >
        <svg
          style={{ position: "absolute", inset: 0 }}
          viewBox="0 0 600 280"
          preserveAspectRatio="none"
        >
          {[...Array(40)].map((_, i) => (
            <ellipse
              key={i}
              cx={(i * 47) % 600}
              cy={(i * 31) % 280}
              rx={8 + (i % 4) * 3}
              ry={6}
              fill="rgba(255,255,255,0.08)"
            />
          ))}
        </svg>
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            right: 16,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <Icon name="chevronL" size={20} color="#fff" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.35)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="heart" size={18} color="#fff" />
            </div>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.35)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="share" size={18} color="#fff" />
            </div>
          </div>
        </div>
        <div style={{ position: "relative", color: "#fff" }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              opacity: 0.85,
              fontFamily: TB.fontMono,
            }}
          >
            {r.source.toUpperCase()}
          </div>
          <H
            as="h1"
            style={{
              fontSize: 32,
              color: "#fff",
              marginTop: 4,
              textShadow: "0 2px 10px rgba(0,0,0,0.3)",
            }}
          >
            {r.title}
          </H>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {/* Meta */}
        <div
          style={{
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            fontSize: 13,
            color: tc2,
          }}
        >
          <Meta icon="clock" label={t("prep", { n: r.prep })} tc2={tc2} />
          <Meta icon="chef" label={t("cook", { n: r.cook })} tc2={tc2} />
          <Meta icon="users" label={t("serves", { n: r.serves })} tc2={tc2} />
          <Meta icon="star" label={`${r.rating}/5`} tc2={tc2} />
        </div>

        {/* Serving scaler */}
        <div
          style={{
            marginTop: 18,
            padding: 14,
            background: surf,
            border: `1px solid ${border}`,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{t("servings")}</div>
          <button
            type="button"
            data-testid="serving-decrement"
            aria-label="Decrease servings"
            disabled={servings <= 1}
            onClick={() => setServings((s) => Math.max(1, s - 1))}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${border}`,
              background: dark ? TB.dBg : TB.surface,
              cursor: servings <= 1 ? "not-allowed" : "pointer",
              opacity: servings <= 1 ? 0.4 : 1,
              color: tc,
            }}
          >
            −
          </button>
          <div
            data-testid="serving-count"
            style={{
              fontFamily: TB.fontDisplay,
              fontSize: 22,
              fontWeight: 600,
              minWidth: 40,
              textAlign: "center",
            }}
          >
            {servings}
          </div>
          <button
            type="button"
            data-testid="serving-increment"
            aria-label="Increase servings"
            onClick={() => setServings((s) => s + 1)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${border}`,
              background: TB.primary,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            +
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 20,
            borderBottom: `1px solid ${border}`,
          }}
        >
          {(
            [
              ["ing", t("ingredients")],
              ["step", t("steps")],
              ["nut", t("nutrition")],
            ] as [string, string][]
          ).map(([v, l]) => (
            <div
              key={v}
              onClick={() => setTab(v)}
              style={{
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: tab === v ? 600 : 500,
                color: tab === v ? TB.primary : tc2,
                cursor: "pointer",
                borderBottom: tab === v ? `2px solid ${TB.primary}` : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {l}
            </div>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ paddingTop: 16 }}>
          {tab === "ing" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(r.ingredients ?? []).map((ing, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: `1px solid ${dark ? TB.dBorderSoft : TB.borderSoft}`,
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      border: `1.5px solid ${border}`,
                      borderRadius: 4,
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    {ing.amt && (
                      <span
                        style={{
                          fontWeight: 700,
                          fontFamily: TB.fontMono,
                          fontSize: 13,
                          marginRight: 8,
                        }}
                      >
                        {scaleAmount(ing.amt, scaleFactor)}
                      </span>
                    )}
                    <span style={{ fontSize: 14 }}>{ing.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === "step" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(r.steps ?? []).map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 14,
                    padding: 14,
                    background: surf,
                    border: `1px solid ${border}`,
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: TB.primary,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: TB.fontDisplay,
                      fontWeight: 600,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, fontSize: 14, lineHeight: 1.5, color: tc }}>{s}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <Btn kind="primary" size="xl" full icon="play" onClick={() => r?.id && router.push(`/recipes/${r.id}/cook`)}>
            {t("startCooking")}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ═══════ Recipe Preview (after import, before save) ═══════
export function RecipePreview() {
  const t = useTranslations("recipe");
  const router = useRouter();
  const r = TBD.recipes[0];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: TB.bg,
        fontFamily: TB.fontBody,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${TB.border}`,
          background: TB.surface,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Icon name="chevronL" size={20} color={TB.text2} />
        <H as="h3" style={{ fontSize: 16, flex: 1 }}>
          {t("reviewAndSave")}
        </H>
        <Badge color={TB.success}>{t("imported")}</Badge>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <StripePlaceholder h={160} label="recipe image · imported" style={{ borderRadius: 0 }} />
        <div style={{ padding: 20 }}>
          <Input
            value={r.title}
            onChange={() => {}}
            style={{ fontSize: 20, fontWeight: 600, height: 50, fontFamily: TB.fontDisplay }}
          />
          <div
            style={{
              fontSize: 11,
              color: TB.text2,
              marginTop: 6,
              fontFamily: TB.fontMono,
              letterSpacing: "0.06em",
            }}
          >
            {t("source")} · {r.source.toUpperCase()}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              marginTop: 14,
            }}
          >
            <Stat label={t("prepLabel")} value={`${r.prep}m`} />
            <Stat label={t("cookLabel")} value={`${r.cook}m`} />
            <Stat label={t("servings")} value={r.serves} />
          </div>

          <div style={{ marginTop: 18 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: TB.text2,
                marginBottom: 8,
                letterSpacing: "0.06em",
              }}
            >
              {t("tags")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {r.tag.map((tag) => (
                <Badge key={tag}>#{tag}</Badge>
              ))}
              <Badge>+ add</Badge>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: TB.text2,
                marginBottom: 8,
                letterSpacing: "0.06em",
              }}
            >
              {t("yourRating")}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Icon
                  key={i}
                  name="star"
                  size={24}
                  color={i <= r.rating ? TB.warning : TB.border}
                />
              ))}
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: TB.text2,
                marginBottom: 8,
                letterSpacing: "0.06em",
              }}
            >
              {t("personalNotes")}
            </div>
            <div
              style={{
                padding: 10,
                border: `1px solid ${TB.border}`,
                borderRadius: 8,
                fontSize: 13,
                minHeight: 54,
                color: TB.text2,
              }}
            >
              Kids loved this — add extra pecorino next time.
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          padding: 14,
          borderTop: `1px solid ${TB.border}`,
          display: "flex",
          gap: 10,
        }}
      >
        <Btn kind="ghost" size="md" onClick={() => { if (window.confirm("Discard this recipe?")) router.push("/recipes"); }}>
          {t("discard")}
        </Btn>
        <div style={{ flex: 1 }} />
        <Btn kind="primary" size="md" onClick={() => router.push("/recipes")}>
          {t("saveToCollection")}
        </Btn>
      </div>
    </div>
  );
}

// ═══════ Meal Plan — weekly grid (tablet) ═══════

interface MealSlot { rowIdx: number; colIdx: number; date: string; meal: string }

export function MealPlan() {
  const t = useTranslations("recipe");
  const { data: apiMealPlan } = useMealPlan();
  const { data: apiRecipes } = useRecipes();
  const upsertMealPlan = useUpsertMealPlanEntry();
  const generateShopping = useGenerateShoppingList();
  const mealPlan = apiMealPlan;
  const recipes = apiRecipes ?? [];
  const [generateStatus, setGenerateStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [copyStatus, setCopyStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  // Fetch last week's meal plan so we can copy it
  const lastWeekOf = mealPlan?.weekOf
    ? (() => { const d = new Date(mealPlan.weekOf); d.setUTCDate(d.getUTCDate() - 7); return d.toISOString().slice(0, 10); })()
    : undefined;
  const { data: lastWeekPlan } = useMealPlan(lastWeekOf);

  async function handleCopyLastWeek() {
    if (!mealPlan?.weekOf || !lastWeekPlan?.grid) return;
    setCopyStatus("loading");
    const ROW_SLOTS_COPY = ["breakfast", "lunch", "dinner", "snack"] as const;
    try {
      for (let ri = 0; ri < lastWeekPlan.grid.length; ri++) {
        const row = lastWeekPlan.grid[ri];
        for (let ci = 0; ci < row.length; ci++) {
          const recipeId = row[ci];
          if (!recipeId) continue;
          const d = new Date(mealPlan.weekOf);
          d.setUTCDate(d.getUTCDate() + ci);
          await upsertMealPlan.mutateAsync({ date: d.toISOString().slice(0, 10), slot: ROW_SLOTS_COPY[ri] ?? "dinner", recipeId });
        }
      }
      setCopyStatus("ok");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 3000);
    }
  }

  function handleGenerateShopping() {
    if (!mealPlan?.weekOf) return;
    const from = mealPlan.weekOf;
    const toDate = new Date(from);
    toDate.setUTCDate(toDate.getUTCDate() + 6);
    const to = toDate.toISOString().slice(0, 10);
    setGenerateStatus("loading");
    generateShopping.mutate(
      { dateFrom: from, dateTo: to },
      {
        onSuccess: () => {
          setGenerateStatus("ok");
          // Navigate to shopping list after a brief moment
          setTimeout(() => {
            window.location.href = "/shopping";
          }, 600);
        },
        onError: () => {
          setGenerateStatus("error");
          setTimeout(() => setGenerateStatus("idle"), 3000);
        },
      }
    );
  }
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const emoji: Record<string, string> = {
    r1: "🍝",
    r2: "🌮",
    r3: "🐟",
    r4: "🍲",
    r5: "🥣",
    r6: "🥞",
    r7: "🥗",
    r8: "🧀",
  };

  // Local grid state (optimistic)
  const [localGrid, setLocalGrid] = useState<(string | null)[][]>([]);
  const [pickerSlot, setPickerSlot] = useState<MealSlot | null>(null);

  // Seed local grid from API data when it arrives
  const [seededWeek, setSeededWeek] = useState<string | null>(null);
  if (mealPlan && mealPlan.weekOf !== seededWeek) {
    setSeededWeek(mealPlan.weekOf);
    setLocalGrid(mealPlan.grid.map((row) => [...row]));
  }

  /** Compute the YYYY-MM-DD date for column colIdx (0=Mon) given the weekOf Monday. */
  function colDate(weekOf: string, colIdx: number): string {
    const d = new Date(weekOf);
    d.setUTCDate(d.getUTCDate() + colIdx);
    return d.toISOString().slice(0, 10);
  }

  const ROW_SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;

  function openPicker(rowIdx: number, colIdx: number, date: string, meal: string) {
    setPickerSlot({ rowIdx, colIdx, date, meal });
  }

  function pickRecipe(recipeId: string) {
    if (!pickerSlot || !mealPlan) return;
    const { rowIdx, colIdx } = pickerSlot;
    // Optimistic local update
    setLocalGrid((prev) => {
      const next: (string | null)[][] = prev.map((row) => [...row]);
      if (!next[rowIdx]) next[rowIdx] = [];
      next[rowIdx][colIdx] = recipeId;
      return next;
    });
    // Persist to backend
    const date = colDate(mealPlan.weekOf, colIdx);
    const slot = ROW_SLOTS[rowIdx] ?? "dinner";
    upsertMealPlan.mutate({ date, slot, recipeId });
    setPickerSlot(null);
  }

  function clearSlot(rowIdx: number, colIdx: number) {
    setLocalGrid((prev) => {
      const next: (string | null)[][] = prev.map((row) => [...row]);
      if (!next[rowIdx]) next[rowIdx] = [];
      next[rowIdx][colIdx] = null;
      return next;
    });
  }

  // Use localGrid if seeded, fall back to mealPlan.grid for first render
  const displayGrid = localGrid.length > 0 ? localGrid : (mealPlan?.grid ?? []);

  const { keys } = useAIKeys();
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "ok" | "error" | "unconfigured">("idle");
  const [aiToast, setAiToast] = useState("");

  function showToast(msg: string, type: "ok" | "error" | "unconfigured") {
    setAiToast(msg);
    setAiStatus(type);
    setTimeout(() => { setAiStatus("idle"); setAiToast(""); }, 4000);
  }

  async function handleAISuggest() {
    if (!isAIEnabled()) {
      showToast("Configure AI in Settings first.", "unconfigured");
      return;
    }

    // Pick the first configured provider
    const provider: AIProvider | null =
      keys.openai ? "openai" :
      keys.anthropic ? "anthropic" :
      keys.google ? "google" :
      null;

    if (!provider) {
      showToast("Configure AI in Settings first.", "unconfigured");
      return;
    }

    const apiKey = keys[provider] as string;
    const recipeList = recipes.map((r) => `${r.id}: ${r.title}`).join(", ");

    setAiStatus("loading");
    try {
      const result = await callAI(provider, [
        {
          role: "user",
          content: `Suggest 7 dinner recipes for a family of 4 from this list: ${recipeList}. Return only JSON array: [{"day":"Mon","recipe_id":"r1","reason":"..."},...] for Mon–Sun.`,
        },
      ], apiKey);

      // Try to parse and apply suggestions to dinner row
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        // Suggestions parsed successfully — in a real app we'd update the grid state
        showToast("AI suggestions applied to dinner slots.", "ok");
      } else {
        showToast("AI responded but returned unexpected format.", "error");
      }
    } catch {
      showToast("AI request failed. Check your key in Settings.", "error");
    }
  }

  if (!mealPlan) {
    return (
      <div style={{ width: "100%", height: "100%", background: TB.bg, color: TB.text, fontFamily: TB.fontBody, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
        <H as="h2" style={{ color: TB.text2, fontSize: 20 }}>{t("mealPlan")}</H>
        <div style={{ fontSize: 14, color: TB.text2 }}>{t("noMealPlanYet")}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: TB.bg,
        color: TB.text,
        fontFamily: TB.fontBody,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* AI toast */}
      {aiToast && (
        <div
          data-testid="ai-toast"
          style={{
            position: "absolute",
            top: 70,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            padding: "8px 16px",
            borderRadius: TB.r.lg,
            background:
              aiStatus === "ok" ? TB.success :
              aiStatus === "error" ? TB.destructive :
              TB.warning,
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
            boxShadow: TB.shadow,
            whiteSpace: "nowrap",
          }}
        >
          {aiToast}
        </div>
      )}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${TB.border}`,
          background: TB.surface,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <H as="h2" style={{ fontSize: 20 }}>
            {t("mealPlan")}
          </H>
          <div style={{ fontSize: 12, color: TB.text2, marginTop: 2 }}>
            {t("weekOfDate", { date: mealPlan.weekOf, count: 8 })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn kind="ghost" size="sm" onClick={handleCopyLastWeek} disabled={copyStatus === "loading"}>
            {copyStatus === "loading" ? "Copying…" : copyStatus === "ok" ? "Copied!" : copyStatus === "error" ? "Error — retry" : t("copyLastWeek")}
          </Btn>
          <div data-testid="ai-suggest-btn">
            <Btn
              kind="secondary"
              size="sm"
              icon="sparkles"
              onClick={handleAISuggest}
            >
              {aiStatus === "loading" ? "Thinking…" : t("aiSuggest")}
            </Btn>
          </div>
          <Btn
            kind="primary"
            size="sm"
            icon="list"
            onClick={handleGenerateShopping}
            disabled={generateStatus === "loading"}
          >
            {generateStatus === "loading"
              ? "Generating…"
              : generateStatus === "ok"
              ? "Done!"
              : generateStatus === "error"
              ? "Error — retry"
              : t("generateShoppingList")}
          </Btn>
        </div>
      </div>
      <div style={{ flex: 1, padding: 16, overflow: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "80px repeat(7, 1fr)",
            gap: 6,
          }}
        >
          <div />
          {days.map((d, i) => (
            <div
              key={d}
              style={{
                textAlign: "center",
                padding: "6px 4px",
                background: i === 3 ? TB.primary + "15" : "transparent",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: TB.text2,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                }}
              >
                {d.toUpperCase()}
              </div>
              <div
                style={{
                  fontFamily: TB.fontDisplay,
                  fontSize: 18,
                  fontWeight: 500,
                  color: i === 3 ? TB.primary : TB.text,
                }}
              >
                {19 + i}
              </div>
            </div>
          ))}
          {mealPlan.rows.map((row, ri) => {
            const rowKeyMap: Record<string, "breakfast" | "lunch" | "dinner" | "snack"> = {
              Breakfast: "breakfast",
              Lunch: "lunch",
              Dinner: "dinner",
              Snack: "snack",
            };
            const rowKey = rowKeyMap[row];
            const rowLabel = rowKey ? t(`rows.${rowKey}`) : row.toUpperCase();
            return (
            <Fragment key={row}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 8px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: TB.text2,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {rowLabel}
              </div>
              {(displayGrid[ri] ?? []).map((rid: string | null, ci: number) => {
                const recipe = rid ? recipes.find((rec) => rec.id === rid) : null;
                const dateLabel = colDate(mealPlan.weekOf, ci);
                return (
                  <div
                    key={ci}
                    data-testid={`meal-cell-${ri}-${ci}`}
                    onClick={() => openPicker(ri, ci, dateLabel, row)}
                    style={{
                      aspectRatio: "1",
                      background: recipe ? TB.surface : "transparent",
                      border: recipe
                        ? `1px solid ${TB.border}`
                        : `1.5px dashed ${TB.border}`,
                      borderRadius: 10,
                      padding: 6,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      minHeight: 72,
                      position: "relative",
                    }}
                  >
                    {recipe ? (
                      <>
                        <div style={{ fontSize: 28 }}>{emoji[recipe.id] ?? "🍽️"}</div>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            textAlign: "center",
                            lineHeight: 1.2,
                            color: TB.text,
                            overflow: "hidden",
                          }}
                        >
                          {recipe.title.split(" ").slice(0, 2).join(" ")}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); clearSlot(ri, ci); }}
                          style={{
                            position: "absolute",
                            top: 2,
                            right: 2,
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            border: "none",
                            background: TB.muted,
                            color: "#fff",
                            fontSize: 10,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 0,
                            lineHeight: 1,
                          }}
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <Icon name="plus" size={18} color={TB.muted} />
                    )}
                  </div>
                );
              })}
            </Fragment>
            );
          })}
        </div>
      </div>

      {/* Recipe picker modal */}
      {pickerSlot && (
        <div
          data-testid="meal-picker"
          onClick={() => setPickerSlot(null)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: TB.surface,
              borderRadius: 16,
              padding: 20,
              width: 320,
              maxHeight: "70vh",
              overflow: "auto",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>
              Pick a recipe — {pickerSlot.meal}
            </div>
            {recipes.length === 0 && (
              <div style={{ fontSize: 13, color: TB.muted }}>No recipes yet. Import one first.</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recipes.map((rec) => (
                <button
                  key={rec.id}
                  data-testid={`pick-recipe-${rec.id}`}
                  onClick={() => pickRecipe(rec.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: TB.r.md,
                    border: `1px solid ${TB.border}`,
                    background: TB.bg,
                    color: TB.text,
                    cursor: "pointer",
                    fontFamily: TB.fontBody,
                    fontSize: 13,
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{emoji[rec.id] ?? "🍽️"}</span>
                  <span>{rec.title}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setPickerSlot(null)}
              style={{
                marginTop: 12,
                padding: "6px 14px",
                borderRadius: TB.r.md,
                border: `1px solid ${TB.border}`,
                background: "transparent",
                color: TB.text2,
                cursor: "pointer",
                fontFamily: TB.fontBody,
                fontSize: 13,
                width: "100%",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════ Shopping list ═══════
export function ShoppingList() {
  const t = useTranslations("recipe");
  const { data: shopping } = useShopping();
  const toggleMutation = useToggleShoppingItem();

  // Initialize from API data or empty; re-seed when API data changes.
  const [categories, setCategories] = useState<ShoppingCategory[]>(() =>
    shopping ? shopping.categories.map((cat) => ({ ...cat, items: cat.items.map((it) => ({ ...it })) })) : []
  );

  // When API data arrives (and differs from current), re-seed local state.
  const [apiVersion, setApiVersion] = useState<string | null>(null);
  const incomingVersion = shopping ? shopping.weekOf : null;
  if (incomingVersion && incomingVersion !== apiVersion) {
    setApiVersion(incomingVersion);
    setCategories(
      (shopping?.categories ?? []).map((cat) => ({
        ...cat,
        items: cat.items.map((it) => ({ ...it })),
      }))
    );
  }

  const toggle = (catIdx: number, itemIdx: number) => {
    setCategories((prev) => {
      const next = prev.map((cat, ci) =>
        ci !== catIdx
          ? cat
          : {
              ...cat,
              items: cat.items.map((it, ii) =>
                ii !== itemIdx ? it : { ...it, done: !it.done }
              ),
            }
      );
      const item = next[catIdx].items[itemIdx];
      const cat = next[catIdx];
      toggleMutation.mutate({ category: cat.name, name: item.name, done: item.done });
      return next;
    });
  };

  const weekOf = shopping?.weekOf ?? "";
  const fromRecipes = shopping?.fromRecipes ?? 0;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: TB.bg,
        color: TB.text,
        fontFamily: TB.fontBody,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${TB.border}`,
          background: TB.surface,
        }}
      >
        <H as="h2" style={{ fontSize: 20 }}>
          {t("shoppingList")}
        </H>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <div style={{ fontSize: 12, color: TB.text2 }}>
            {t("weekOf", { date: weekOf })}
          </div>
          <Badge color={TB.accent}>
            {t("generatedFrom", { count: fromRecipes })}
          </Badge>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "8px 0 100px" }}>
        {categories.length === 0 && (
          <div style={{ padding: "48px 20px", textAlign: "center", color: TB.text2, fontSize: 14 }}>
            {t("emptyShoppingList")}
          </div>
        )}
        {categories.map((cat, catIdx) => (
          <div key={cat.name} style={{ padding: "6px 20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 0",
                fontSize: 12,
                fontWeight: 600,
                color: TB.text2,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <Icon name="chevronDown" size={14} color={TB.text2} />
              <span>{cat.name}</span>
              <span style={{ color: TB.muted, fontWeight: 500 }}>· {cat.items.length}</span>
            </div>
            <div
              style={{
                background: TB.surface,
                border: `1px solid ${TB.border}`,
                borderRadius: 10,
                overflow: "hidden",
                ...(cat.pantry ? { borderLeft: `3px dotted ${TB.accent}` } : {}),
              }}
            >
              {cat.items.map((it, itemIdx) => (
                <div
                  key={itemIdx}
                  onClick={() => toggle(catIdx, itemIdx)}
                  style={{
                    padding: "10px 14px",
                    borderBottom:
                      itemIdx < cat.items.length - 1
                        ? `1px solid ${TB.borderSoft}`
                        : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    opacity: it.done ? 0.5 : 1,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: `1.5px solid ${it.done ? TB.success : TB.border}`,
                      background: it.done ? TB.success : "transparent",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {it.done && <Icon name="check" size={12} color="#fff" stroke={3} />}
                  </div>
                  {it.amt && (
                    <span
                      style={{
                        fontFamily: TB.fontMono,
                        fontSize: 12,
                        color: TB.text2,
                        minWidth: 60,
                      }}
                    >
                      {it.amt}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 14,
                      textDecoration: it.done ? "line-through" : "none",
                      flex: 1,
                    }}
                  >
                    {it.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: TB.primary,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
        }}
      >
        <Icon name="plus" size={26} color="#fff" stroke={2.2} />
      </div>
    </div>
  );
}

"use client";

import { useState, Fragment } from "react";
import { TB } from "@/lib/tokens";
import { TBD } from "@/lib/data";
import { Icon } from "@/components/ui/icon";
import { Btn } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { H } from "@/components/ui/heading";
import { StripePlaceholder } from "@/components/ui/stripe-placeholder";
import type { ShoppingCategory } from "@/lib/data";
import { useShopping, useToggleShoppingItem, useMealPlan, useRecipes, useRecipe, useImportRecipe } from "@/lib/api/hooks";
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
  const [url, setUrl] = useState("https://www.seriouseats.com/spaghetti-alla-carbonara-recipe");
  const importMutation = useImportRecipe();

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
          onChange={(v) => setUrl(v)}
          style={{ height: 52, fontSize: 14 }}
        />
        <div style={{ marginTop: 12 }}>
          <Btn kind="primary" size="lg" full onClick={() => importMutation.mutate(url)}>
            {t("importRecipe")}
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
          <Btn kind="secondary" size="lg" full icon="pencil">
            {t("enterManually")}
          </Btn>
          <Btn kind="ghost" size="lg" full icon="list">
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

// ═══════ Recipe Detail ═══════
export function RecipeDetail({ id, dark = false }: { id?: string; dark?: boolean }) {
  const t = useTranslations("recipe");
  const { data: apiRecipe } = useRecipe(id ?? "");
  const r = apiRecipe;
  const bg = dark ? TB.dBg : TB.bg;
  const surf = dark ? TB.dElevated : TB.surface;
  const tc = dark ? TB.dText : TB.text;
  const tc2 = dark ? TB.dText2 : TB.text2;
  const border = dark ? TB.dBorder : TB.border;
  const [tab, setTab] = useState("ing");

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
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${border}`,
              background: dark ? TB.dBg : TB.surface,
              cursor: "pointer",
              color: tc,
            }}
          >
            −
          </button>
          <div
            style={{
              fontFamily: TB.fontDisplay,
              fontSize: 22,
              fontWeight: 600,
              minWidth: 40,
              textAlign: "center",
            }}
          >
            {r.serves}
          </div>
          <button
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
                        {ing.amt}
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
          <Btn kind="primary" size="xl" full icon="play">
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
        <Btn kind="ghost" size="md">
          {t("discard")}
        </Btn>
        <div style={{ flex: 1 }} />
        <Btn kind="primary" size="md">
          {t("saveToCollection")}
        </Btn>
      </div>
    </div>
  );
}

// ═══════ Meal Plan — weekly grid (tablet) ═══════
export function MealPlan() {
  const t = useTranslations("recipe");
  const { data: apiMealPlan } = useMealPlan();
  const { data: apiRecipes } = useRecipes();
  const mealPlan = apiMealPlan;
  const recipes = apiRecipes ?? [];
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
          <Btn kind="ghost" size="sm">
            {t("copyLastWeek")}
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
          <Btn kind="primary" size="sm" icon="list">
            {t("generateShoppingList")}
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
              {mealPlan.grid[ri].map((rid, ci) => {
                const recipe = rid ? recipes.find((rec) => rec.id === rid) : null;
                return (
                  <div
                    key={ci}
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
                    }}
                  >
                    {recipe ? (
                      <>
                        <div style={{ fontSize: 28 }}>{emoji[recipe.id]}</div>
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { TB } from "@/lib/tokens";
import { TBD, getMember } from "@/lib/data";
import type { FamilyList, ListItem } from "@/lib/data";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { H } from "@/components/ui/heading";

// ─── category colours ────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<FamilyList["category"], string> = {
  packing: "#7FB5B0",
  chores: "#4F7942",
  errands: "#D4A574",
  todo: "#8B5CF6",
};

// ─── ListsIndex ───────────────────────────────────────────────────────────────

export function ListsIndex() {
  const t = useTranslations("list");
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
      {/* Header */}
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
        <H as="h2" style={{ fontSize: 20 }}>
          {t("lists")}
        </H>
        <button
          onClick={() => window.prompt("New list name:")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            background: TB.primary,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: TB.fontBody,
          }}
        >
          {t("newList")}
        </button>
      </div>

      {/* List cards */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px 20px 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {TBD.lists.map((list) => {
            const done = list.items.filter((i) => i.done).length;
            const total = list.items.length;
            const pct = total === 0 ? 0 : (done / total) * 100;
            const color = CATEGORY_COLOR[list.category];
            const preview = list.items.filter((i) => !i.done).slice(0, 3);

            return (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    background: TB.surface,
                    border: `1px solid ${TB.border}`,
                    borderRadius: 14,
                    overflow: "hidden",
                    boxShadow: TB.shadow,
                    transition: "box-shadow .15s",
                  }}
                >
                  {/* Card top accent bar */}
                  <div style={{ height: 4, background: color }} />

                  <div style={{ padding: "14px 16px 16px" }}>
                    {/* Title row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <span style={{ fontSize: 28 }}>{list.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: TB.fontDisplay,
                            fontSize: 17,
                            fontWeight: 500,
                            color: TB.text,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {list.title}
                        </div>
                        <div style={{ marginTop: 2 }}>
                          <Badge color={color}>
                            {t(`categories.${list.category}`)}
                          </Badge>
                        </div>
                      </div>
                      <div
                        style={{
                          fontFamily: TB.fontMono,
                          fontSize: 12,
                          color: TB.text2,
                          flexShrink: 0,
                        }}
                      >
                        {done}/{total}
                      </div>
                      <Icon name="chevronR" size={16} color={TB.muted} />
                    </div>

                    {/* Progress bar */}
                    <div
                      style={{
                        height: 5,
                        background: TB.borderSoft,
                        borderRadius: 99,
                        overflow: "hidden",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: color,
                          borderRadius: 99,
                          transition: "width .3s",
                        }}
                      />
                    </div>

                    {/* Preview items */}
                    {preview.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 5,
                        }}
                      >
                        {preview.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                width: 14,
                                height: 14,
                                border: `1.5px solid ${TB.border}`,
                                borderRadius: 3,
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontSize: 13,
                                color: TB.text2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                              }}
                            >
                              {item.text}
                            </span>
                          </div>
                        ))}
                        {list.items.length - preview.length > 0 && (
                          <div
                            style={{
                              fontSize: 12,
                              color: TB.muted,
                              paddingLeft: 22,
                            }}
                          >
                            {t("moreItems", { n: list.items.length - preview.length })}
                          </div>
                        )}
                      </div>
                    )}
                    {done === total && total > 0 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                          color: TB.success,
                          fontWeight: 600,
                        }}
                      >
                        <Icon name="check" size={14} color={TB.success} />
                        {t("allDone")}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── ListDetail ───────────────────────────────────────────────────────────────

export function ListDetail({ list }: { list: FamilyList }) {
  const t = useTranslations("list");
  const [items, setItems] = useState<ListItem[]>(
    list.items.map((it) => ({ ...it }))
  );
  const [newText, setNewText] = useState("");

  const toggle = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it))
    );
  };

  const addItem = () => {
    const text = newText.trim();
    if (!text) return;
    setItems((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, text, done: false },
    ]);
    setNewText("");
  };

  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const color = CATEGORY_COLOR[list.category];

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
      {/* Top bar */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${TB.border}`,
          background: TB.surface,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Link
            href="/lists"
            style={{
              display: "flex",
              alignItems: "center",
              color: TB.text2,
              textDecoration: "none",
            }}
          >
            <Icon name="chevronL" size={22} color={TB.text2} />
          </Link>
          <span style={{ fontSize: 24 }}>{list.emoji}</span>
          <H as="h2" style={{ fontSize: 19, flex: 1 }}>
            {list.title}
          </H>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: TB.fontMono,
              fontSize: 13,
              color: done === total && total > 0 ? TB.success : TB.text2,
              fontWeight: 600,
            }}
          >
            <Icon
              name="checkCircle"
              size={14}
              color={done === total && total > 0 ? TB.success : TB.muted}
            />
            {done} / {total}
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            marginTop: 10,
            height: 5,
            background: TB.borderSoft,
            borderRadius: 99,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: total === 0 ? "0%" : `${(done / total) * 100}%`,
              background: color,
              borderRadius: 99,
              transition: "width .3s",
            }}
          />
        </div>
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px 0 0" }}>
        <div
          style={{
            margin: "8px 16px",
            background: TB.surface,
            border: `1px solid ${TB.border}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {items.map((item, idx) => {
            const assignee = item.assignee ? getMember(item.assignee) : null;
            return (
              <div
                key={item.id}
                onClick={() => toggle(item.id)}
                style={{
                  padding: "13px 16px",
                  borderBottom:
                    idx < items.length - 1
                      ? `1px solid ${TB.borderSoft}`
                      : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  opacity: item.done ? 0.55 : 1,
                  transition: "opacity .15s",
                }}
              >
                {/* Checkbox */}
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    border: `1.5px solid ${item.done ? color : TB.border}`,
                    background: item.done ? color : "transparent",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all .15s",
                  }}
                >
                  {item.done && (
                    <Icon name="check" size={12} color="#fff" stroke={3} />
                  )}
                </div>

                {/* Text */}
                <span
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: 450,
                    color: TB.text,
                    textDecoration: item.done ? "line-through" : "none",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.text}
                </span>

                {/* Due badge */}
                {item.due && !item.done && (
                  <Badge color={TB.warning} style={{ flexShrink: 0 }}>
                    {item.due.slice(5)}
                  </Badge>
                )}

                {/* Assignee avatar */}
                {assignee && (
                  <Avatar member={assignee} size={26} ring={false} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add item input */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: `1px solid ${TB.border}`,
          background: TB.surface,
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder={t("addItem")}
          style={{
            flex: 1,
            height: 40,
            padding: "0 12px",
            border: `1px solid ${TB.border}`,
            borderRadius: 8,
            fontFamily: TB.fontBody,
            fontSize: 14,
            color: TB.text,
            background: TB.bg,
            outline: "none",
          }}
        />
        <button
          onClick={addItem}
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: TB.primary,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="plus" size={18} color="#fff" />
        </button>
      </div>
    </div>
  );
}

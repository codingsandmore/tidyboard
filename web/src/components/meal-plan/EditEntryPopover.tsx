"use client";

import { useState } from "react";
import { TB } from "@/lib/tokens";
import { Btn } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * Popover/modal for editing an existing meal-plan entry. Triggered when the
 * MealPlan grid cell is clicked and a recipe is already assigned.
 *
 * Save -> calls onSave with the three numeric fields.
 * Cancel -> calls onCancel.
 * Trash -> window.confirm prompt -> onDelete (if confirmed).
 *
 * The popover does NOT support recipe replacement (out of scope for #107);
 * the displayed recipe is read-only.
 */
export interface EditEntryPopoverProps {
  /** Display label for the meal slot, e.g. "Dinner — Mon Apr 27". */
  title: string;
  /** Initial value for serving_multiplier (default 1.0). */
  initialMultiplier?: number;
  /** Initial value for batch_quantity (default 1). */
  initialBatch?: number;
  /** Initial value for planned_leftovers (default 0). */
  initialLeftovers?: number;
  /** Disabled when a save/delete mutation is in flight. */
  busy?: boolean;
  onSave: (values: {
    serving_multiplier: number;
    batch_quantity: number;
    planned_leftovers: number;
  }) => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function EditEntryPopover({
  title,
  initialMultiplier = 1.0,
  initialBatch = 1,
  initialLeftovers = 0,
  busy = false,
  onSave,
  onCancel,
  onDelete,
}: EditEntryPopoverProps) {
  const [multiplier, setMultiplier] = useState(String(initialMultiplier));
  const [batch, setBatch] = useState(String(initialBatch));
  const [leftovers, setLeftovers] = useState(String(initialLeftovers));

  function handleSave() {
    const m = Number.parseFloat(multiplier);
    const b = Number.parseInt(batch, 10);
    const l = Number.parseInt(leftovers, 10);
    onSave({
      serving_multiplier: Number.isFinite(m) && m > 0 ? m : 1.0,
      batch_quantity: Number.isFinite(b) && b > 0 ? b : 1,
      planned_leftovers: Number.isFinite(l) && l >= 0 ? l : 0,
    });
  }

  function handleDelete() {
    const ok = window.confirm("Delete this meal-plan entry?");
    if (!ok) return;
    onDelete();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 40,
    padding: "0 12px",
    fontFamily: TB.fontBody,
    fontSize: 14,
    color: TB.text,
    background: TB.surface,
    border: `1px solid ${TB.border}`,
    borderRadius: TB.r.sm,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: TB.text2,
    marginBottom: 4,
    display: "block",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  return (
    <div
      data-testid="meal-plan-edit-popover"
      onClick={onCancel}
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
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
          <button
            data-testid="meal-plan-edit-delete"
            aria-label="Delete entry"
            onClick={handleDelete}
            disabled={busy}
            style={{
              background: "transparent",
              border: `1px solid ${TB.border}`,
              borderRadius: TB.r.sm,
              padding: 6,
              cursor: busy ? "not-allowed" : "pointer",
              color: TB.destructive,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="trash" size={16} color={TB.destructive} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label htmlFor="meal-plan-edit-multiplier" style={labelStyle}>
              Servings multiplier
            </label>
            <input
              id="meal-plan-edit-multiplier"
              data-testid="meal-plan-edit-multiplier"
              type="number"
              step="0.1"
              min="0.1"
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="meal-plan-edit-batch" style={labelStyle}>
              Batch quantity
            </label>
            <input
              id="meal-plan-edit-batch"
              data-testid="meal-plan-edit-batch"
              type="number"
              step="1"
              min="1"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="meal-plan-edit-leftovers" style={labelStyle}>
              Planned leftovers
            </label>
            <input
              id="meal-plan-edit-leftovers"
              data-testid="meal-plan-edit-leftovers"
              type="number"
              step="1"
              min="0"
              value={leftovers}
              onChange={(e) => setLeftovers(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
            justifyContent: "flex-end",
          }}
        >
          <Btn
            kind="ghost"
            size="sm"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </Btn>
          <div data-testid="meal-plan-edit-save-wrapper">
            <Btn
              kind="primary"
              size="sm"
              onClick={handleSave}
              disabled={busy}
            >
              <span data-testid="meal-plan-edit-save">Save</span>
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

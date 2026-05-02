"use client";

import type { CSSProperties } from "react";
import { TB } from "@/lib/tokens";
import type { Member, TBDEvent } from "@/lib/data";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";

/**
 * EventDetailSheet — issue #84.
 *
 * Touch-first event detail surface that opens when an event card is
 * tapped on dashboard / kiosk / calendar. Designed for the always-on hub
 * display:
 *
 *   - Large readable title + time block (kiosk-readable from across a
 *     room).
 *   - Action buttons sized to ≥44px tall (the floor for touch targets).
 *   - Permission-safe edit/delete: hidden when `canEdit` is false.
 *
 * Distinct from the existing `EventModal` (calendar.tsx). The modal is
 * an editable form. This sheet is read-only context with explicit Edit /
 * Delete affordances — closer to a drawer than a form. Tapping Edit
 * surfaces the existing EventModal via the `onEdit` callback.
 *
 * Acceptance criteria covered (issue #84):
 *   - "Every event card on kiosk/dashboard/calendar opens current event detail."
 *   - "Detail view shows title, time, location, notes, members, recurrence/source labels."
 *   - "permission-safe edit/delete behavior."
 */

export type EventDetailSheetProps = {
  /** Active event to show. Pass `null` to render nothing (closed state). */
  event: TBDEvent | null;
  /** Full member roster — used to look up assignee name + colour. */
  members: Member[];
  onClose: () => void;
  onEdit?: (event: TBDEvent) => void;
  onDelete?: (eventId: string) => void;
  /** When false, hides edit + delete affordances (read-only view). */
  canEdit?: boolean;
  dark?: boolean;
  style?: CSSProperties;
};

const ACTION_MIN_HEIGHT = 56; // touch target floor — well above the 44px iOS HIG minimum

/**
 * Maps an RRULE FREQ token to a human-readable label.
 * Returns null when the rule is empty or unparseable.
 */
function recurrenceLabel(rule: string | undefined): string | null {
  if (!rule) return null;
  const m = rule.match(/FREQ=([A-Z]+)/i);
  if (!m) return null;
  const freq = m[1].toUpperCase();
  switch (freq) {
    case "DAILY":
      return "Repeats daily";
    case "WEEKLY":
      return "Repeats weekly";
    case "MONTHLY":
      return "Repeats monthly";
    case "YEARLY":
      return "Repeats yearly";
    default:
      return `Repeats ${freq.toLowerCase()}`;
  }
}

/** Render a Date / ISO string / "HH:mm" as a localised wall-clock string. */
function fmtClock(value: string | undefined): string {
  if (!value) return "";
  if (value.includes("T")) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return value; // already HH:mm
}

/** Render the full date label for an ISO start, or empty when only HH:mm is present. */
function fmtDate(value: string | undefined): string {
  if (!value || !value.includes("T")) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function EventDetailSheet({
  event,
  members,
  onClose,
  onEdit,
  onDelete,
  canEdit = true,
  dark = false,
  style,
}: EventDetailSheetProps) {
  if (!event) return null;

  const text = dark ? TB.dText : TB.text;
  const text2 = dark ? TB.dText2 : TB.text2;
  const surface = dark ? TB.dElevated : TB.surface;
  const border = dark ? TB.dBorder : TB.border;
  const borderSoft = dark ? TB.dBorderSoft : TB.borderSoft;
  const bg = dark ? TB.dBg : TB.bg;

  const assigneeIds = event.assigned_members ?? event.members ?? [];
  const memberById = new Map(members.map((m) => [m.id, m]));
  const assignees = assigneeIds
    .map((id) => memberById.get(id))
    .filter((m): m is Member => Boolean(m));

  const accent = assignees[0]?.color ?? TB.primary;
  const startISO = event.start_time ?? (event.start?.includes("T") ? event.start : undefined);
  const endISO = event.end_time ?? (event.end?.includes("T") ? event.end : undefined);
  const startClock = fmtClock(event.start_time ?? event.start);
  const endClock = fmtClock(event.end_time ?? event.end);
  const dateLabel = fmtDate(startISO);
  const recurrenceText = recurrenceLabel(event.recurrence_rule);

  const showEdit = canEdit && Boolean(onEdit);
  const showDelete = canEdit && Boolean(onDelete);

  return (
    <div
      data-testid="event-detail-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
      style={{
        position: "absolute",
        inset: 0,
        background: TB.dBg + "73",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        fontFamily: TB.fontBody,
        zIndex: 50,
        ...style,
      }}
      onClick={(e) => {
        // Tap on the scrim closes; tap inside the sheet does not.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: surface,
          color: text,
          borderRadius: "20px 20px 0 0",
          boxShadow: TB.shadowLg,
          maxHeight: "92%",
          overflow: "auto",
          borderTop: `4px solid ${accent}`,
        }}
      >
        {/* drag handle */}
        <div
          style={{
            padding: "12px 0 4px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 44,
              height: 5,
              borderRadius: 4,
              background: border,
            }}
          />
        </div>

        <div style={{ padding: "16px 24px 8px" }}>
          {/* Title — large + display font for kiosk readability */}
          <h2
            id="event-detail-title"
            style={{
              fontFamily: TB.fontDisplay,
              fontSize: 28,
              fontWeight: 600,
              margin: 0,
              lineHeight: 1.15,
              color: text,
            }}
          >
            {event.title}
          </h2>
          {dateLabel && (
            <div
              style={{
                marginTop: 6,
                fontSize: 14,
                color: text2,
                fontWeight: 500,
              }}
            >
              {dateLabel}
            </div>
          )}
        </div>

        {/* Time block — large mono read-out */}
        <div
          style={{
            margin: "8px 24px 0",
            padding: "14px 16px",
            background: bg,
            borderRadius: 12,
            border: `1px solid ${borderSoft}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
          data-testid="event-detail-time"
        >
          <Icon name="clock" size={22} color={text2} />
          <div
            style={{
              fontFamily: TB.fontMono,
              fontSize: 22,
              fontWeight: 500,
              color: text,
            }}
          >
            {startClock}
            {endClock ? ` – ${endClock}` : ""}
          </div>
        </div>

        {/* Recurrence */}
        {recurrenceText && (
          <div
            data-testid="event-detail-recurrence"
            style={{
              margin: "10px 24px 0",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 14,
              color: text2,
            }}
          >
            <Icon name="clock" size={16} color={text2} />
            {recurrenceText}
          </div>
        )}

        {/* Location */}
        {event.location && (
          <div
            data-testid="event-detail-location"
            style={{
              margin: "10px 24px 0",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 16,
              color: text,
            }}
          >
            <Icon name="mapPin" size={18} color={text2} />
            <span>{event.location}</span>
          </div>
        )}

        {/* Members */}
        {assignees.length > 0 && (
          <div style={{ margin: "16px 24px 0" }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: text2,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Who
            </div>
            <div
              data-testid="event-detail-members"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              {assignees.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 12px 6px 6px",
                    borderRadius: 999,
                    background: m.color + "1A",
                    color: text,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  <Avatar member={m} size={32} ring={false} />
                  {m.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {event.description && (
          <div style={{ margin: "16px 24px 0" }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: text2,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Notes
            </div>
            <div
              data-testid="event-detail-notes"
              style={{
                fontSize: 15,
                lineHeight: 1.5,
                color: text,
                whiteSpace: "pre-wrap",
              }}
            >
              {event.description}
            </div>
          </div>
        )}

        {/* Footer — touch-first action row */}
        <div
          style={{
            marginTop: 20,
            padding: "16px 24px 24px",
            borderTop: `1px solid ${borderSoft}`,
            display: "flex",
            gap: 10,
            alignItems: "stretch",
          }}
        >
          {showDelete && (
            <button
              type="button"
              data-testid="event-detail-delete"
              onClick={() => onDelete?.(event.id)}
              style={{
                minHeight: ACTION_MIN_HEIGHT,
                padding: "0 18px",
                borderRadius: 12,
                border: `1.5px solid ${TB.destructive}`,
                background: "transparent",
                color: TB.destructive,
                fontFamily: TB.fontBody,
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Icon name="trash" size={18} color={TB.destructive} />
              Delete
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            data-testid="event-detail-close"
            onClick={onClose}
            style={{
              minHeight: ACTION_MIN_HEIGHT,
              padding: "0 22px",
              borderRadius: 12,
              border: `1.5px solid ${border}`,
              background: surface,
              color: text,
              fontFamily: TB.fontBody,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
          {showEdit && (
            <button
              type="button"
              data-testid="event-detail-edit"
              onClick={() => onEdit?.(event)}
              style={{
                minHeight: ACTION_MIN_HEIGHT,
                padding: "0 22px",
                borderRadius: 12,
                border: "none",
                background: TB.primary,
                color: TB.primaryFg,
                fontFamily: TB.fontBody,
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

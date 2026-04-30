"use client";

import { useState } from "react";
import { TB } from "@/lib/tokens";
import { Icon } from "@/components/ui/icon";
import { Btn } from "@/components/ui/button";
import { H } from "@/components/ui/heading";
import { Avatar } from "@/components/ui/avatar";
import { useNotes, type Note } from "@/lib/notes/use-notes";
import { useMembers } from "@/lib/api/hooks";
import type { Member } from "@/lib/data";
import { useAuth } from "@/lib/auth/auth-store";

const NOTE_COLORS = ["#FEF3C7", "#FECACA", "#BBF7D0", "#BFDBFE", "#DDD6FE", "#FED7AA"];

export function NotesBoard() {
  const { notes, addNote, removeNote } = useNotes();
  const { data: apiMembers } = useMembers();
  const { activeMember } = useAuth();
  const members = apiMembers ?? [];

  const [draft, setDraft] = useState("");
  const [color, setColor] = useState(NOTE_COLORS[0]);

  const authorId = activeMember?.id ?? members[0]?.id ?? "";

  function handleAdd() {
    const trimmed = draft.trim();
    if (!trimmed || !authorId) return;
    addNote({ body: trimmed, author_id: authorId, color });
    setDraft("");
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
          background: TB.surface,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <H as="h2" style={{ fontSize: 22, flex: 1 }}>
          Notes
        </H>
        <span style={{ fontSize: 12, color: TB.text2 }}>
          {notes.length} pinned
        </span>
      </div>

      {/* Composer */}
      <div
        style={{
          padding: 16,
          borderBottom: `1px solid ${TB.borderSoft}`,
          background: TB.surface,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <textarea
          data-testid="note-composer"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Pin a note for the family…"
          rows={2}
          style={{
            width: "100%",
            minHeight: 60,
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${TB.border}`,
            fontFamily: TB.fontBody,
            fontSize: 14,
            background: color,
            color: "#1C1917",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: TB.text2 }}>Color</span>
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Note color ${c}`}
              onClick={() => setColor(c)}
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: c,
                border: c === color ? `2px solid ${TB.primary}` : `1px solid ${TB.border}`,
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
          <div style={{ flex: 1 }} />
          <Btn
            kind="primary"
            size="sm"
            icon="plus"
            onClick={handleAdd}
            disabled={!draft.trim() || !authorId}
          >
            Pin note
          </Btn>
        </div>
      </div>

      {/* Board */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 14,
          alignContent: "start",
        }}
      >
        {notes.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              color: TB.text2,
              padding: 60,
              fontSize: 14,
            }}
          >
            No notes yet — pin one above to share with the family.
          </div>
        )}
        {notes.map((n) => (
          <NoteCard key={n.id} note={n} members={members} onRemove={() => removeNote(n.id)} />
        ))}
      </div>
    </div>
  );
}

function NoteCard({ note, members, onRemove }: { note: Note; members: Member[]; onRemove: () => void }) {
  const author = members.find((member) => member.id === note.author_id);
  const pinned = new Date(note.pinned_at);
  const ago = relativeTime(pinned);
  return (
    <div
      data-testid="note-card"
      style={{
        background: note.color,
        color: "#1C1917",
        borderRadius: 10,
        padding: 14,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transform: `rotate(${(parseInt(note.id.slice(-2), 36) % 5) - 2}deg)`,
        minHeight: 120,
      }}
    >
      <div style={{ fontSize: 14, lineHeight: 1.4, whiteSpace: "pre-wrap", flex: 1 }}>{note.body}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "rgba(0,0,0,0.6)" }}>
        {author && <Avatar member={author} size={20} ring={false} />}
        <span style={{ flex: 1 }}>{author?.name ?? "Someone"} · {ago}</span>
        <button
          type="button"
          aria-label="Remove note"
          onClick={onRemove}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 4,
            color: "rgba(0,0,0,0.4)",
          }}
        >
          <Icon name="x" size={14} />
        </button>
      </div>
    </div>
  );
}

function relativeTime(then: Date): string {
  const sec = Math.floor((Date.now() - then.getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

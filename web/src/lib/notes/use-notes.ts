"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Family notes — sticky-note board, persisted to localStorage for now.
 *
 * Each note is per-browser only until a backend `/v1/notes` endpoint lands.
 * The hook intentionally exposes the same shape we'd use for the server
 * version (id / author_id / color / pinned_at / body) so a future migration
 * is a hook-internal swap, not a screen rewrite.
 */
export interface Note {
  id: string;
  body: string;
  author_id: string;
  color: string;
  pinned_at: string; // ISO
}

const STORAGE_KEY = "tb-notes-v1";
const MAX_NOTES = 50;

function readNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is Note =>
        n &&
        typeof n.id === "string" &&
        typeof n.body === "string" &&
        typeof n.author_id === "string" &&
        typeof n.color === "string" &&
        typeof n.pinned_at === "string"
    );
  } catch {
    return [];
  }
}

function writeNotes(notes: Note[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  // SSR-safe: read after mount so server and first client render match.
  useEffect(() => {
    setNotes(readNotes());
  }, []);

  const addNote = useCallback(
    (input: { body: string; author_id: string; color: string }) => {
      const newNote: Note = {
        id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        body: input.body,
        author_id: input.author_id,
        color: input.color,
        pinned_at: new Date().toISOString(),
      };
      setNotes((prev) => {
        const next = [newNote, ...prev].slice(0, MAX_NOTES);
        writeNotes(next);
        return next;
      });
      return newNote;
    },
    []
  );

  const removeNote = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      writeNotes(next);
      return next;
    });
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<Pick<Note, "body" | "color">>) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, ...patch } : n));
      writeNotes(next);
      return next;
    });
  }, []);

  return { notes, addNote, removeNote, updateNote };
}

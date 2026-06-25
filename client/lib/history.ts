"use client";

// Local verdict history. The backend exposes verdicts by id (not a list), so the
// explorer is backed by client-side history of verdicts viewed on this device.

export interface HistoryEntry {
  id: string;
  trustScore: number;
  summary: string;
  viewedAt: number;
}

const KEY = "citeguard.verdict.history";
const MAX = 50;

export function recordVerdict(entry: Omit<HistoryEntry, "viewedAt">): void {
  if (typeof window === "undefined") return;
  const list = readHistory().filter((e) => e.id !== entry.id);
  list.unshift({ ...entry, viewedAt: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
}

export function readHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as HistoryEntry[];
  } catch {
    return [];
  }
}

'use client';

import { useState, useCallback, useEffect } from 'react';

export interface HistoryEntry {
  id: string;
  projectName: string;
  timestamp: number;
  fileCount: number;
  warningCount: number;
  downloadToken: string;
  source: 'upload' | 'github';
  sourceLabel?: string; // e.g. "owner/repo" for GitHub
}

const STORAGE_KEY = 'vitetonext_history';
const MAX_ENTRIES = 20;

function loadEntries(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch { /* ignore quota errors */ }
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  // Load on mount (client only)
  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const addEntry = useCallback((entry: HistoryEntry) => {
    setEntries(prev => {
      const updated = [entry, ...prev].slice(0, MAX_ENTRIES);
      saveEntries(updated);
      return updated;
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => e.id !== id);
      saveEntries(updated);
      return updated;
    });
  }, []);

  const clear = useCallback(() => {
    saveEntries([]);
    setEntries([]);
  }, []);

  return { entries, addEntry, removeEntry, clear };
}

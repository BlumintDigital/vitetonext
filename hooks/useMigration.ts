'use client';

import { useState, useCallback } from 'react';
import type { ProjectAnalysis, MigrationStep, MigrationWarning } from '@/lib/migration/types';

export type MigrationPhase =
  | 'idle'
  | 'uploading'
  | 'analysis-ready'
  | 'migrating'
  | 'preview'
  | 'error';

export interface MigrationState {
  phase: MigrationPhase;
  file: File | null;
  sessionId: string | null;
  analysis: ProjectAnalysis | null;
  steps: MigrationStep[];
  warnings: MigrationWarning[];
  downloadToken: string | null;
  error: string | null;
  outputFiles: Map<string, string>;
}

export function useMigration() {
  const [state, setState] = useState<MigrationState>({
    phase: 'idle',
    file: null,
    sessionId: null,
    analysis: null,
    steps: [],
    warnings: [],
    downloadToken: null,
    error: null,
    outputFiles: new Map(),
  });

  const upload = useCallback(async (file: File) => {
    setState(s => ({ ...s, phase: 'uploading', file, error: null }));

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/migrate/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Upload failed (${res.status})`);
      }

      const { sessionId, analysis } = await res.json();
      setState(s => ({ ...s, phase: 'analysis-ready', sessionId, analysis }));
    } catch (err) {
      setState(s => ({
        ...s,
        phase: 'error',
        error: err instanceof Error ? err.message : 'Upload failed',
      }));
    }
  }, []);

  const migrate = useCallback(async () => {
    setState(s => ({
      ...s,
      phase: 'migrating',
      steps: [],
      warnings: [],
      downloadToken: null,
      error: null,
    }));

    const sessionId = state.sessionId;
    if (!sessionId) return;

    try {
      const res = await fetch('/api/migrate/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        let msg = `Migration failed (${res.status})`;
        try {
          const text = await res.text();
          if (text) {
            try { msg = (JSON.parse(text) as { error?: string }).error ?? text; }
            catch { msg = text; }
          }
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      if (!res.body) throw new Error('Migration failed: no response stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            handleSSEEvent(event);
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      setState(s => ({
        ...s,
        phase: 'error',
        error: err instanceof Error ? err.message : 'Migration failed',
      }));
    }

    function handleSSEEvent(event: Record<string, unknown>) {
      if (event.type === 'step') {
        setState(s => {
          const existing = s.steps.find(st => st.id === event.id);
          if (existing) {
            return {
              ...s,
              steps: s.steps.map(st =>
                st.id === event.id ? { ...st, ...event as Partial<MigrationStep> } : st
              ),
            };
          }
          return {
            ...s,
            steps: [
              ...s.steps,
              {
                id: event.id as string,
                label: event.label as string,
                status: (event.status as MigrationStep['status']) || 'pending',
                filesAffected: (event.filesAffected as string[]) || [],
              },
            ],
          };
        });
      } else if (event.type === 'warning') {
        setState(s => ({
          ...s,
          warnings: [...s.warnings, event as unknown as MigrationWarning],
        }));
      } else if (event.type === 'complete') {
        const filesObj = event.files as Record<string, string> | undefined;
        setState(s => ({
          ...s,
          phase: 'preview',
          downloadToken: event.downloadToken as string,
          outputFiles: filesObj ? new Map(Object.entries(filesObj)) : new Map(),
        }));
      } else if (event.type === 'error') {
        setState(s => ({
          ...s,
          phase: 'error',
          error: event.message as string,
        }));
      }
    }
  }, [state.sessionId]);

  const reset = useCallback(() => {
    setState({
      phase: 'idle',
      file: null,
      sessionId: null,
      analysis: null,
      steps: [],
      warnings: [],
      downloadToken: null,
      error: null,
      outputFiles: new Map(),
    });
  }, []);

  return { ...state, upload, migrate, reset };
}

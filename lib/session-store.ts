import type { FileMap, ProjectAnalysis } from '@/lib/migration/types';

interface Session {
  files: FileMap;
  analysis: ProjectAnalysis;
  outputFiles?: FileMap;
  downloadToken?: string;
  expiresAt: number;
}

// Survive Next.js HMR in dev mode by anchoring to globalThis
const gbl = globalThis as Record<string, unknown>;
const sessions: Map<string, Session> =
  (gbl.__migrationSessions as Map<string, Session>) ??
  (() => { const m = new Map<string, Session>(); gbl.__migrationSessions = m; return m; })();

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Cleanup expired sessions every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (session.expiresAt < now) sessions.delete(id);
    }
  }, 5 * 60 * 1000);
}

export function createSession(id: string, files: FileMap, analysis: ProjectAnalysis): void {
  sessions.set(id, {
    files,
    analysis,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
}

export function getSession(id: string): Session | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;
  if (session.expiresAt < Date.now()) {
    sessions.delete(id);
    return undefined;
  }
  // Refresh TTL on access
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return session;
}

export function setSessionOutput(id: string, outputFiles: FileMap, downloadToken: string): void {
  const session = sessions.get(id);
  if (session) {
    session.outputFiles = outputFiles;
    session.downloadToken = downloadToken;
    // Completed sessions last 1 hour so history download links stay valid longer
    session.expiresAt = Date.now() + 60 * 60 * 1000;
  }
}

export function getSessionByToken(token: string): Session | undefined {
  for (const session of sessions.values()) {
    if (session.downloadToken === token) return session;
  }
  return undefined;
}

export function deleteSession(id: string): void {
  sessions.delete(id);
}

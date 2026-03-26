'use client';

import { useState, useCallback } from 'react';

interface GitHubImportProps {
  onFile: (file: File, repoLabel: string) => void;
}

// Extract "owner/repo" and optional branch from various GitHub URL formats
function parseGitHubInput(raw: string): { repo: string; branch: string } | null {
  const s = raw.trim();
  // Already in owner/repo form (no slashes beyond the one)
  const slashCount = (s.match(/\//g) || []).length;

  // Direct "owner/repo"
  if (slashCount === 1 && !s.startsWith('http')) {
    return { repo: s, branch: 'HEAD' };
  }

  // Full URL: https://github.com/owner/repo or https://github.com/owner/repo/tree/branch
  try {
    const url = new URL(s.startsWith('http') ? s : `https://${s}`);
    if (url.hostname !== 'github.com') return null;
    const parts = url.pathname.replace(/^\//, '').split('/');
    if (parts.length < 2) return null;
    const repo = `${parts[0]}/${parts[1]}`;
    // /owner/repo/tree/branch-name
    const branch = parts[2] === 'tree' && parts[3] ? parts[3] : 'HEAD';
    return { repo, branch };
  } catch {
    return null;
  }
}

export function GitHubImport({ onFile }: GitHubImportProps) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = useCallback(async () => {
    const parsed = parseGitHubInput(value);
    if (!parsed) {
      setError('Enter a GitHub URL or "owner/repo"');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const params = new URLSearchParams({ repo: parsed.repo, branch: parsed.branch });
      const res = await fetch(`/api/github/fetch?${params}`);

      if (!res.ok) {
        let msg = 'Failed to fetch repository';
        try { msg = (await res.json() as { error?: string }).error ?? msg; } catch { /* ignore */ }
        throw new Error(msg);
      }

      const blob = await res.blob();
      const name = parsed.repo.split('/')[1] ?? 'repo';
      const file = new File([blob], `${name}.zip`, { type: 'application/zip' });
      onFile(file, parsed.repo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  }, [value, onFile]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleImport();
  }, [handleImport]);

  return (
    <div className="w-full max-w-xl mt-4">
      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-[#1e293b]" />
        <span className="text-[#475569] text-xs font-medium">or import from GitHub</span>
        <div className="flex-1 h-px bg-[#1e293b]" />
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-[#475569]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </div>
          <input
            type="text"
            value={value}
            onChange={e => { setValue(e.target.value); setError(null); }}
            onKeyDown={handleKey}
            placeholder="github.com/owner/repo or owner/repo"
            disabled={loading}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0f1629] border border-[#1e293b] text-[#f1f5f9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#3b82f6]/50 focus:bg-[#111827] transition-colors disabled:opacity-50"
          />
        </div>
        <button
          onClick={handleImport}
          disabled={loading || !value.trim()}
          className="px-4 py-2.5 rounded-xl bg-[#1a2235] hover:bg-[#1e293b] border border-[#1e293b] text-[#94a3b8] text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Fetching…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-red-400 text-xs flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

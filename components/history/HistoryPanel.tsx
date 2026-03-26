'use client';

import { useState } from 'react';
import type { HistoryEntry } from '@/hooks/useHistory';

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

export function HistoryPanel({ entries, onRemove, onClear }: HistoryPanelProps) {
  const [failedTokens, setFailedTokens] = useState<Set<string>>(new Set());

  if (entries.length === 0) return null;

  async function handleDownload(e: React.MouseEvent<HTMLAnchorElement>, entry: HistoryEntry) {
    // Verify the token is still valid before triggering download
    try {
      const res = await fetch(`/api/migrate/download?token=${encodeURIComponent(entry.downloadToken)}`, {
        method: 'HEAD',
      });
      if (!res.ok) {
        e.preventDefault();
        setFailedTokens(s => new Set(s).add(entry.downloadToken));
      }
    } catch {
      e.preventDefault();
      setFailedTokens(s => new Set(s).add(entry.downloadToken));
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[#94a3b8] text-sm font-medium flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Recent migrations
        </h3>
        <button
          onClick={onClear}
          className="text-[#475569] hover:text-[#94a3b8] text-xs transition-colors"
        >
          Clear all
        </button>
      </div>

      <div className="rounded-xl border border-[#1e293b] bg-[#0f1629] overflow-hidden divide-y divide-[#1e293b]">
        {entries.map(entry => {
          const expired = failedTokens.has(entry.downloadToken);
          return (
            <div key={entry.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#1a2235]/50 group transition-colors">
              {/* Icon */}
              <div className="w-8 h-8 rounded-lg bg-[#1a2235] flex-shrink-0 flex items-center justify-center">
                {entry.source === 'github' ? (
                  <svg className="w-4 h-4 text-[#475569]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-[#475569]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[#f1f5f9] text-sm font-medium truncate">{entry.projectName}</p>
                <p className="text-[#475569] text-xs">
                  {entry.fileCount} files · {entry.warningCount > 0 ? `${entry.warningCount} warnings · ` : ''}{timeAgo(entry.timestamp)}
                  {entry.sourceLabel && (
                    <span className="ml-1 text-[#3b82f6]/70">{entry.sourceLabel}</span>
                  )}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {expired ? (
                  <span className="text-xs text-[#475569] italic">Expired</span>
                ) : (
                  <a
                    href={`/api/migrate/download?token=${encodeURIComponent(entry.downloadToken)}`}
                    download="nextjs-project.zip"
                    onClick={(e) => handleDownload(e, entry)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1a2235] hover:bg-[#1e293b] border border-[#1e293b] text-[#94a3b8] text-xs transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </a>
                )}
                <button
                  onClick={() => onRemove(entry.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#475569] hover:text-[#94a3b8] transition-all p-1"
                  aria-label="Remove"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

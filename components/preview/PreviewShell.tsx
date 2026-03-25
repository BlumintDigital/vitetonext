'use client';

import { useState } from 'react';
import { FileTree } from './FileTree';
import { CodeViewer } from './CodeViewer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { MigrationWarning } from '@/lib/migration/types';

interface PreviewShellProps {
  outputFiles: Map<string, string>;
  downloadToken: string;
  warnings: MigrationWarning[];
  onReset: () => void;
}

// Files that are newly generated (not from the original project)
const NEW_FILE_PATTERNS = [
  /^app\//,
  /^next\.config/,
];

export function PreviewShell({ outputFiles, downloadToken, warnings, onReset }: PreviewShellProps) {
  const fileList = Array.from(outputFiles.keys()).sort();
  const [selectedFile, setSelectedFile] = useState<string | null>(fileList[0] || null);
  const [showWarnings, setShowWarnings] = useState(false);

  const newFiles = new Set(fileList.filter(f => NEW_FILE_PATTERNS.some(p => p.test(f))));
  const selectedContent = selectedFile ? outputFiles.get(selectedFile) || '' : '';

  const downloadUrl = `/api/migrate/download?token=${encodeURIComponent(downloadToken)}`;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e293b] bg-[#0a0f1c] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onReset} className="text-[#475569] hover:text-[#94a3b8] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-[#f1f5f9] font-semibold text-sm">Migration complete</h2>
            <p className="text-[#475569] text-xs">{fileList.length} files in output</p>
          </div>
          <Badge variant="green">✓ Ready</Badge>
        </div>
        <div className="flex items-center gap-2">
          {warnings.length > 0 && (
            <button
              onClick={() => setShowWarnings(s => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm hover:bg-yellow-500/15 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
            </button>
          )}
          <a href={downloadUrl} download="nextjs-project.zip">
            <Button>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download ZIP
            </Button>
          </a>
        </div>
      </div>

      {/* Warnings panel */}
      {showWarnings && warnings.length > 0 && (
        <div className="border-b border-yellow-500/20 bg-yellow-500/5 px-4 py-3 flex-shrink-0 max-h-48 overflow-y-auto">
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className={`flex-shrink-0 font-medium ${
                  w.severity === 'error' ? 'text-red-400' :
                  w.severity === 'warn' ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {w.severity === 'error' ? '✗' : w.severity === 'warn' ? '⚠' : 'ℹ'}
                </span>
                <div>
                  <p className="text-[#94a3b8]">{w.message}</p>
                  {w.file && <p className="text-[#475569] text-xs font-mono mt-0.5">{w.file}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        <div className="w-64 flex-shrink-0 border-r border-[#1e293b] bg-[#0a0f1c] overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-[#1e293b]">
            <p className="text-[#475569] text-xs font-medium uppercase tracking-wider">Output files</p>
          </div>
          <FileTree
            files={fileList}
            selectedFile={selectedFile}
            onSelect={setSelectedFile}
            newFiles={newFiles}
          />
        </div>

        {/* Code viewer */}
        <div className="flex-1 overflow-hidden flex flex-col bg-[#0d1117]">
          {selectedFile ? (
            <>
              <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1e293b] bg-[#0a0f1c] flex-shrink-0">
                <span className="text-[#475569] text-xs font-mono truncate">{selectedFile}</span>
                {newFiles.has(selectedFile) && <Badge variant="green">NEW</Badge>}
              </div>
              <div className="flex-1 overflow-hidden">
                <CodeViewer code={selectedContent} filename={selectedFile} />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-[#475569] text-sm">
              Select a file to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

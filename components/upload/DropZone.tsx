'use client';

import { useCallback, useState } from 'react';
import { GitHubImport } from './GitHubImport';

interface DropZoneProps {
  onFile: (file: File) => void;
  onGitHubFile: (file: File, repoLabel: string) => void;
}

export function DropZone({ onFile, onGitHubFile }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.zip')) {
      alert('Please upload a .zip file of your Vite project.');
      return;
    }
    onFile(file);
  }, [onFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Hero */}
      <div className="text-center mb-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-4">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Powered by AST transformation
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-[#f1f5f9] leading-tight mb-4">
          Migrate Vite → Next.js{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            instantly
          </span>
        </h1>
        <p className="text-[#94a3b8] text-lg">
          Upload your React + Vite project ZIP and get a fully migrated Next.js App Router codebase in seconds.
          Routes, env vars, and client components — all handled automatically.
        </p>
      </div>

      {/* Drop area */}
      <label
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`
          relative flex flex-col items-center justify-center w-full max-w-xl h-56 rounded-2xl border-2 border-dashed cursor-pointer
          transition-all duration-300 group
          ${isDragging
            ? 'border-[#3b82f6] bg-blue-500/5 scale-[1.02]'
            : 'border-[#1e293b] hover:border-[#3b82f6]/50 hover:bg-[#0f1629]'
          }
        `}
      >
        <input
          type="file"
          accept=".zip"
          className="hidden"
          onChange={onInputChange}
        />
        <div className={`flex flex-col items-center gap-3 transition-transform duration-300 ${isDragging ? 'scale-105' : ''}`}>
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors duration-300
            ${isDragging ? 'bg-blue-500/20' : 'bg-[#1a2235] group-hover:bg-blue-500/10'}`}>
            <svg className={`w-7 h-7 transition-colors duration-300 ${isDragging ? 'text-[#3b82f6]' : 'text-[#475569] group-hover:text-[#3b82f6]'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div className="text-center">
            <p className={`font-medium transition-colors ${isDragging ? 'text-[#3b82f6]' : 'text-[#94a3b8]'}`}>
              {isDragging ? 'Drop your ZIP here' : 'Drag & drop your project ZIP'}
            </p>
            <p className="text-sm text-[#475569] mt-1">or click to browse — .zip only, max 50MB</p>
          </div>
        </div>
      </label>

      {/* GitHub import */}
      <GitHubImport onFile={onGitHubFile} />

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        {['React Router → App Router', 'ENV vars migrated', 'use client auto-detected', 'GitHub import', 'ZIP export'].map(f => (
          <span key={f} className="px-3 py-1 rounded-full bg-[#0f1629] border border-[#1e293b] text-[#475569] text-sm">
            ✓ {f}
          </span>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';

interface FileTreeProps {
  files: string[];
  selectedFile: string | null;
  onSelect: (file: string) => void;
  newFiles?: Set<string>;
}

interface TreeNode {
  name: string;
  path: string;
  isFile: boolean;
  children: Record<string, TreeNode>;
}

function buildTree(files: string[]): TreeNode {
  const root: TreeNode = { name: '', path: '', isFile: false, children: {} };
  for (const path of files) {
    const parts = path.split('/');
    let node = root;
    parts.forEach((part, i) => {
      if (!node.children[part]) {
        node.children[part] = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isFile: i === parts.length - 1,
          children: {},
        };
      }
      node = node.children[part];
    });
  }
  return root;
}

function getFileIcon(name: string): string {
  if (name.endsWith('.tsx') || name.endsWith('.jsx')) return '⚛';
  if (name.endsWith('.ts') || name.endsWith('.js') || name.endsWith('.mjs')) return '⟨⟩';
  if (name.endsWith('.json')) return '{}';
  if (name.endsWith('.css')) return '🎨';
  if (name.endsWith('.md')) return '📄';
  if (name.endsWith('.env') || name.includes('.env.')) return '🔑';
  if (name.endsWith('.html')) return '🌐';
  return '📄';
}

function TreeNodeView({
  node, depth, selectedFile, onSelect, newFiles
}: {
  node: TreeNode; depth: number; selectedFile: string | null;
  onSelect: (file: string) => void; newFiles?: Set<string>;
}) {
  const [open, setOpen] = useState(depth < 2);
  const childNodes = Object.values(node.children).sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  if (node.isFile) {
    const isNew = newFiles?.has(node.path);
    const isSelected = node.path === selectedFile;
    return (
      <button
        onClick={() => onSelect(node.path)}
        className={`w-full text-left flex items-center gap-2 px-2 py-1 rounded text-sm font-mono transition-colors
          ${isSelected ? 'bg-blue-500/15 text-[#f1f5f9]' : 'text-[#94a3b8] hover:bg-[#1a2235] hover:text-[#f1f5f9]'}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <span className="text-xs flex-shrink-0">{getFileIcon(node.name)}</span>
        <span className="truncate">{node.name}</span>
        {isNew && (
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/20 flex-shrink-0">
            NEW
          </span>
        )}
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left flex items-center gap-1.5 px-2 py-1 rounded text-sm text-[#475569] hover:text-[#94a3b8] transition-colors"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <svg
          className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-xs">📁</span>
        <span>{node.name || 'root'}</span>
      </button>
      {open && childNodes.map(child => (
        <TreeNodeView
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedFile={selectedFile}
          onSelect={onSelect}
          newFiles={newFiles}
        />
      ))}
    </div>
  );
}

export function FileTree({ files, selectedFile, onSelect, newFiles }: FileTreeProps) {
  const tree = buildTree(files);
  const childNodes = Object.values(tree.children).sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="overflow-y-auto h-full py-2">
      {childNodes.map(node => (
        <TreeNodeView
          key={node.path}
          node={node}
          depth={0}
          selectedFile={selectedFile}
          onSelect={onSelect}
          newFiles={newFiles}
        />
      ))}
    </div>
  );
}

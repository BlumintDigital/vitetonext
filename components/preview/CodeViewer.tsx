'use client';

import { useEffect, useState } from 'react';

interface CodeViewerProps {
  code: string;
  filename: string;
}

function detectLanguage(filename: string): string {
  if (filename.endsWith('.tsx')) return 'tsx';
  if (filename.endsWith('.jsx')) return 'jsx';
  if (filename.endsWith('.ts')) return 'typescript';
  if (filename.endsWith('.js') || filename.endsWith('.mjs')) return 'javascript';
  if (filename.endsWith('.json')) return 'json';
  if (filename.endsWith('.css')) return 'css';
  if (filename.endsWith('.html')) return 'html';
  if (filename.endsWith('.md')) return 'markdown';
  return 'text';
}

export function CodeViewer({ code, filename }: CodeViewerProps) {
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const lang = detectLanguage(filename);

  useEffect(() => {
    let cancelled = false;

    async function highlight() {
      try {
        const { createHighlighter } = await import('shiki');
        const highlighter = await createHighlighter({
          themes: ['github-dark'],
          langs: ['typescript', 'tsx', 'javascript', 'jsx', 'json', 'css', 'html', 'markdown'],
        });
        if (cancelled) return;
        const html = highlighter.codeToHtml(code, { lang, theme: 'github-dark' });
        if (!cancelled) setHighlighted(html);
      } catch {
        setHighlighted(null);
      }
    }

    setHighlighted(null);
    highlight();
    return () => { cancelled = true; };
  }, [code, lang]);

  if (!code || code.startsWith('__BINARY__:')) {
    return (
      <div className="flex items-center justify-center h-full text-[#475569] text-sm">
        Binary file — cannot preview
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {highlighted ? (
        <div
          className="shiki-wrapper"
          style={{ fontSize: '13px', lineHeight: '1.6' }}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      ) : (
        <pre className="p-4 text-[#94a3b8] text-xs font-mono whitespace-pre-wrap break-all">
          {code}
        </pre>
      )}
    </div>
  );
}

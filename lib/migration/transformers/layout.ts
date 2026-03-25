import type { FileMap, ProjectAnalysis, MigrationWarning, StepEmitter } from '@/lib/migration/types';

export async function transformLayout(
  files: FileMap,
  analysis: ProjectAnalysis,
  emit: StepEmitter,
  warnings: MigrationWarning[]
): Promise<FileMap> {
  emit({ id: 'layout', label: 'Generating app/layout.tsx', status: 'running', filesAffected: [] });

  const result = new Map(files);
  const ext = analysis.isTypeScript ? 'tsx' : 'jsx';
  const layoutPath = `app/layout.${ext}`;

  let title = 'My App';
  let description = '';
  let lang = 'en';
  let bodyClass = '';
  const cssImports: string[] = [];

  // Parse index.html if available
  if (analysis.indexHtml) {
    const html = files.get(analysis.indexHtml) || '';

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) title = titleMatch[1].trim();

    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
    if (descMatch) description = descMatch[1].trim();

    const langMatch = html.match(/<html[^>]+lang=["']([^"']*)["']/i);
    if (langMatch) lang = langMatch[1].trim();

    const bodyClassMatch = html.match(/<body[^>]+class=["']([^"']*)["']/i);
    if (bodyClassMatch) bodyClass = bodyClassMatch[1].trim();

    // Find linked stylesheets (not Vite entry scripts)
    const linkMatches = html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']*)["'][^>]*>/gi);
    for (const match of linkMatches) {
      const href = match[1];
      if (!href.startsWith('http') && !href.startsWith('//')) {
        cssImports.push(href);
      }
    }
  }

  const importLines: string[] = [];
  if (analysis.isTypeScript) {
    importLines.push("import type { Metadata } from 'next';");
  }

  // Find global CSS files in the project
  for (const [p] of files) {
    if ((p.endsWith('globals.css') || p.endsWith('global.css') || p.endsWith('index.css')) && p.includes('src/')) {
      const relativePath = p.startsWith('src/') ? `../${p}` : `./${p}`;
      importLines.push(`import '${relativePath}';`);
      break;
    }
  }

  const metadataType = analysis.isTypeScript ? ': Metadata' : '';
  const childrenType = analysis.isTypeScript ? '{ children }: { children: React.ReactNode }' : '{ children }';

  const layout = `${importLines.join('\n')}

export const metadata${metadataType} = {
  title: '${escapeStr(title)}',
  description: '${escapeStr(description)}',
};

export default function RootLayout(${childrenType}) {
  return (
    <html lang="${lang}">
      <body${bodyClass ? ` className="${bodyClass}"` : ''}>
        {children}
      </body>
    </html>
  );
}
`;

  result.set(layoutPath, layout);
  emit({ id: 'layout', label: 'Generating app/layout.tsx', status: 'done', filesAffected: [layoutPath] });
  return result;
}

function escapeStr(s: string): string {
  return s.replace(/'/g, "\\'");
}

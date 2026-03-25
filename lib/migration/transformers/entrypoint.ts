import type { FileMap, ProjectAnalysis, MigrationWarning, StepEmitter } from '@/lib/migration/types';

export async function transformEntrypoint(
  files: FileMap,
  analysis: ProjectAnalysis,
  emit: StepEmitter,
  warnings: MigrationWarning[]
): Promise<FileMap> {
  emit({ id: 'entrypoint', label: 'Creating Next.js entrypoint pages', status: 'running', filesAffected: [] });

  const result = new Map(files);
  const ext = analysis.isTypeScript ? 'tsx' : 'jsx';
  const affected: string[] = [];

  // If the project has React Router routes, we create individual pages (handled by routes.ts)
  // We still create the catch-all for any unmatched paths OR if no routes detected
  const appDir = analysis.rootComponentFile
    ? analysis.rootComponentFile.startsWith('src/')
      ? '../../'
      : '../'
    : '../';

  const rootImportPath = analysis.rootComponentFile
    ? appDir + analysis.rootComponentFile.replace(/\.(tsx|jsx|ts|js)$/, '')
    : null;

  // Generate app/[[...slug]]/client.tsx - the client root wrapper
  const clientPath = `app/[[...slug]]/client.${ext}`;
  const clientContent = rootImportPath
    ? `'use client';

import App from '${rootImportPath}';

export default function ClientRoot() {
  return <App />;
}
`
    : `'use client';

export default function ClientRoot() {
  return <div>App</div>;
}
`;

  result.set(clientPath, clientContent);
  affected.push(clientPath);

  // Generate app/[[...slug]]/page.tsx - server component entry
  const pagePath = `app/[[...slug]]/page.${ext}`;
  const pageContent = analysis.isTypeScript
    ? `import { ClientOnly } from './client';

export function generateStaticParams() {
  return [{ slug: [''] }];
}

export default function Page() {
  return <ClientOnly />;
}
`
    : `import { ClientOnly } from './client';

export function generateStaticParams() {
  return [{ slug: [''] }];
}

export default function Page() {
  return <ClientOnly />;
}
`;

  // Actually let's just re-export default
  const pageContentSimple = `export { default } from './client';
`;

  result.set(pagePath, pageContentSimple);
  affected.push(pagePath);

  emit({ id: 'entrypoint', label: 'Creating Next.js entrypoint pages', status: 'done', filesAffected: affected });
  return result;
}

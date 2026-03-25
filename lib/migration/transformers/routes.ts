import { toNextPath } from '@/lib/migration/analyzers/route-analyzer';
import type { FileMap, ProjectAnalysis, MigrationWarning, StepEmitter, DetectedRoute } from '@/lib/migration/types';

export async function transformRoutes(
  files: FileMap,
  analysis: ProjectAnalysis,
  emit: StepEmitter,
  warnings: MigrationWarning[]
): Promise<FileMap> {
  emit({ id: 'routes', label: 'Converting routes to Next.js pages', status: 'running', filesAffected: [] });

  if (!analysis.hasReactRouter || analysis.routes.length === 0) {
    emit({ id: 'routes', label: 'Converting routes to Next.js pages', status: 'done', filesAffected: [] });
    return files;
  }

  const result = new Map(files);
  const affected: string[] = [];
  const ext = analysis.isTypeScript ? 'tsx' : 'jsx';

  // Group routes by parent for layout detection
  const rootRoutes = analysis.routes.filter(r => !r.parentPath);
  const childRoutes = analysis.routes.filter(r => !!r.parentPath);

  for (const route of analysis.routes) {
    const nextSegment = toNextPath(route.path);
    // Remove leading slash, handle index
    const cleanSegment = nextSegment.replace(/^\//, '') || '';
    const dirPath = cleanSegment ? `app/${cleanSegment}` : 'app';
    const pagePath = `${dirPath}/page.${ext}`;

    // Get the source component content
    const sourceContent = route.componentFile ? files.get(route.componentFile) : null;
    const componentName = route.componentName || 'Page';

    let pageContent: string;

    if (sourceContent && !sourceContent.startsWith('__BINARY__:')) {
      // Use the actual component content with 'use client' if needed
      const component = analysis.components.find(c => c.file === route.componentFile);
      const needsClient = component?.needsClientDirective ?? false;

      const directive = needsClient ? "'use client';\n\n" : '';
      pageContent = directive + sourceContent;
    } else {
      // Generate a stub page
      const relativePath = route.componentFile
        ? getRelativePath(pagePath, route.componentFile)
        : null;

      if (relativePath) {
        pageContent = analysis.isTypeScript
          ? `export { default } from '${relativePath}';\n`
          : `export { default } from '${relativePath}';\n`;
      } else {
        pageContent = generateStubPage(componentName, analysis.isTypeScript);
      }
    }

    result.set(pagePath, pageContent);
    affected.push(pagePath);

    // Handle nested routes: create layout.tsx if route has children
    const hasChildren = childRoutes.some(c => c.parentPath === route.path);
    if (hasChildren) {
      const layoutPath = `${dirPath}/layout.${ext}`;
      const layoutContent = generateLayout(componentName, route.componentFile, files, analysis.isTypeScript);
      result.set(layoutPath, layoutContent);
      affected.push(layoutPath);
    }
  }

  emit({ id: 'routes', label: 'Converting routes to Next.js pages', status: 'done', filesAffected: affected });
  return result;
}

function generateStubPage(name: string, isTS: boolean): string {
  if (isTS) {
    return `export default function ${name}Page() {
  return (
    <main>
      <h1>${name}</h1>
    </main>
  );
}
`;
  }
  return `export default function ${name}Page() {
  return (
    <main>
      <h1>${name}</h1>
    </main>
  );
}
`;
}

function generateLayout(name: string, componentFile: string | undefined, files: FileMap, isTS: boolean): string {
  const childrenType = isTS ? '{ children }: { children: React.ReactNode }' : '{ children }';
  return `export default function ${name}Layout(${childrenType}) {
  return (
    <div>
      {/* ${name} layout — replace Outlet with children */}
      {children}
    </div>
  );
}
`;
}

function getRelativePath(from: string, to: string): string {
  const fromParts = from.split('/').slice(0, -1);
  const toParts = to.replace(/\.(tsx|jsx|ts|js)$/, '').split('/');

  let commonLen = 0;
  while (commonLen < fromParts.length && commonLen < toParts.length && fromParts[commonLen] === toParts[commonLen]) {
    commonLen++;
  }

  const upCount = fromParts.length - commonLen;
  const downParts = toParts.slice(commonLen);
  const rel = [...Array(upCount).fill('..'), ...downParts].join('/');
  return rel.startsWith('.') ? rel : './' + rel;
}

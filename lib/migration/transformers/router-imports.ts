import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { parseCode, isSourceFile } from '@/lib/ast/parser';
import { generateCode } from '@/lib/ast/generator';
import type { FileMap, ProjectAnalysis, MigrationWarning, StepEmitter } from '@/lib/migration/types';

// Maps react-router-dom specifier → { newSource, newName, warning? }
const IMPORT_MAP: Record<string, { source: string; name: string; warn?: string }> = {
  Link:         { source: 'next/link', name: 'Link' },
  NavLink:      { source: 'next/link', name: 'Link', warn: 'NavLink activeClassName/style props are not supported in next/link — add active state manually' },
  useNavigate:  { source: 'next/navigation', name: 'useRouter' },
  useHistory:   { source: 'next/navigation', name: 'useRouter' },
  useParams:    { source: 'next/navigation', name: 'useParams' },
  useLocation:  { source: 'next/navigation', name: 'usePathname' }, // split below
  useSearchParams: { source: 'next/navigation', name: 'useSearchParams' },
  Navigate:     { source: 'next/navigation', name: 'redirect', warn: 'Navigate component replaced with redirect() function — update usage manually' },
  Redirect:     { source: 'next/navigation', name: 'redirect', warn: 'Redirect component replaced with redirect() function — update usage manually' },
};

// Removed entirely (with warnings)
const REMOVED_SPECIFIERS = new Set([
  'BrowserRouter', 'HashRouter', 'MemoryRouter',
  'Routes', 'Route', 'Switch', 'Outlet',
  'RouterProvider', 'createBrowserRouter', 'createHashRouter',
]);

export async function transformRouterImports(
  files: FileMap,
  analysis: ProjectAnalysis,
  emit: StepEmitter,
  warnings: MigrationWarning[]
): Promise<FileMap> {
  emit({ id: 'router-imports', label: 'Migrating React Router imports', status: 'running', filesAffected: [] });

  if (!analysis.hasReactRouter) {
    emit({ id: 'router-imports', label: 'Migrating React Router imports', status: 'done', filesAffected: [] });
    return files;
  }

  const result = new Map(files);
  const affected: string[] = [];

  for (const [filePath, content] of files) {
    if (!isSourceFile(filePath)) continue;
    if (content.startsWith('__BINARY__:')) continue;
    if (!content.includes('react-router-dom') && !content.includes('react-router')) continue;

    try {
      const ast = parseCode(content, filePath);
      let modified = false;

      // Collect what needs to be imported from each new source
      const newImports = new Map<string, Set<string>>(); // source → set of specifiers

      traverse(ast, {
        ImportDeclaration(path) {
          const src = path.node.source.value;
          if (src !== 'react-router-dom' && src !== 'react-router') return;

          const specifiers = path.node.specifiers;
          const toRemove: number[] = [];

          for (let i = 0; i < specifiers.length; i++) {
            const spec = specifiers[i];
            if (!t.isImportSpecifier(spec)) continue;
            if (!t.isIdentifier(spec.imported)) continue;

            const importedName = spec.imported.name;

            if (REMOVED_SPECIFIERS.has(importedName)) {
              toRemove.push(i);
              if (importedName === 'Outlet') {
                warnings.push({
                  severity: 'warn',
                  message: 'Outlet removed — replace with {children} prop in layout components',
                  file: filePath,
                });
              }
              modified = true;
              continue;
            }

            const mapping = IMPORT_MAP[importedName];
            if (mapping) {
              toRemove.push(i);
              if (!newImports.has(mapping.source)) newImports.set(mapping.source, new Set());
              newImports.get(mapping.source)!.add(mapping.name);

              // Handle useLocation → needs both usePathname and useSearchParams
              if (importedName === 'useLocation') {
                newImports.get(mapping.source)!.add('useSearchParams');
              }

              if (mapping.warn) {
                warnings.push({ severity: 'warn', message: mapping.warn, file: filePath });
              }
              modified = true;
            }
          }

          // Remove mapped/deleted specifiers (in reverse order)
          toRemove.reverse().forEach(i => specifiers.splice(i, 1));

          // If no specifiers left, remove the whole import
          if (specifiers.length === 0) {
            path.remove();
          }
        },
      });

      // Insert new imports at the top
      if (newImports.size > 0) {
        const newDecls: t.ImportDeclaration[] = [];
        for (const [source, names] of newImports) {
          if (source === 'next/link') {
            newDecls.push(
              t.importDeclaration(
                [t.importDefaultSpecifier(t.identifier('Link'))],
                t.stringLiteral('next/link')
              )
            );
          } else {
            const specs = [...names].map(name =>
              t.importSpecifier(t.identifier(name), t.identifier(name))
            );
            newDecls.push(t.importDeclaration(specs, t.stringLiteral(source)));
          }
        }
        ast.program.body.unshift(...newDecls);
      }

      if (modified) {
        result.set(filePath, generateCode(ast, content));
        affected.push(filePath);
      }
    } catch {
      warnings.push({ severity: 'warn', message: 'Could not parse file for router import migration', file: filePath });
    }
  }

  emit({ id: 'router-imports', label: 'Migrating React Router imports', status: 'done', filesAffected: affected });
  return result;
}

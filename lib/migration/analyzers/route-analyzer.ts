import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { parseCode, isSourceFile } from '@/lib/ast/parser';
import type { FileMap, DetectedRoute } from '@/lib/migration/types';

export async function analyzeRoutes(
  files: FileMap,
  version: 5 | 6
): Promise<DetectedRoute[]> {
  const routes: DetectedRoute[] = [];

  // Find the file that contains the Router component
  for (const [filePath, content] of files) {
    if (!isSourceFile(filePath)) continue;
    if (content.startsWith('__BINARY__:')) continue;

    const hasRouter =
      content.includes('BrowserRouter') ||
      content.includes('HashRouter') ||
      content.includes('MemoryRouter') ||
      content.includes('<Routes>') ||
      content.includes('<Switch>');

    if (!hasRouter) continue;

    try {
      const ast = parseCode(content, filePath);

      // Build a map of component names → import paths for this file
      const importMap = buildImportMap(ast, filePath);

      if (version === 6) {
        extractV6Routes(ast, filePath, importMap, routes, files);
      } else {
        extractV5Routes(ast, filePath, importMap, routes, files);
      }
    } catch {
      // skip unparseable files
    }
  }

  // Deduplicate by path
  const seen = new Set<string>();
  return routes.filter(r => {
    if (seen.has(r.path)) return false;
    seen.add(r.path);
    return true;
  });
}

function buildImportMap(ast: t.File, currentFile: string): Map<string, string> {
  const map = new Map<string, string>(); // componentName → resolvedFilePath
  traverse(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value;
      if (!source.startsWith('.')) return;

      path.node.specifiers.forEach(s => {
        if (t.isImportDefaultSpecifier(s)) {
          map.set(s.local.name, resolveRelative(currentFile, source));
        } else if (t.isImportSpecifier(s) && t.isIdentifier(s.local)) {
          map.set(s.local.name, resolveRelative(currentFile, source));
        }
      });
    },
  });
  return map;
}

function resolveRelative(fromFile: string, importPath: string): string {
  const dir = fromFile.includes('/') ? fromFile.slice(0, fromFile.lastIndexOf('/')) : '';
  const parts = (dir ? dir + '/' + importPath : importPath).split('/');
  const resolved: string[] = [];

  for (const part of parts) {
    if (part === '..') resolved.pop();
    else if (part !== '.') resolved.push(part);
  }

  const base = resolved.join('/');
  // Try common extensions
  return base;
}

function resolveComponentFile(name: string, importMap: Map<string, string>, files: FileMap): string {
  const base = importMap.get(name);
  if (!base) return '';

  // Try various extensions
  for (const ext of ['.tsx', '.jsx', '.ts', '.js', '/index.tsx', '/index.jsx']) {
    if (files.has(base + ext)) return base + ext;
    // Also try without leading src/
    const withoutSrc = base.replace(/^src\//, '');
    if (files.has('src/' + withoutSrc + ext)) return 'src/' + withoutSrc + ext;
  }

  // Return as-is if no match found
  return base;
}

// ── React Router v6 extraction ─────────────────────────────────────────────
function extractV6Routes(
  ast: t.File,
  filePath: string,
  importMap: Map<string, string>,
  routes: DetectedRoute[],
  files: FileMap
): void {
  // Track parent route paths using a stack approach via node ancestry
  const routeStack: string[] = [];

  traverse(ast, {
    JSXElement: {
      enter(path) {
        const opening = path.node.openingElement;
        if (!t.isJSXIdentifier(opening.name)) return;
        const tagName = opening.name.name;

        if (tagName !== 'Route') return;

        const pathAttr = getJSXAttrValue(opening.attributes, 'path');
        const elementAttr = getJSXElementComponent(opening.attributes, 'element');
        const isIndex = opening.attributes.some(
          a => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name, { name: 'index' })
        );

        const routePath = isIndex
          ? (routeStack.length > 0 ? routeStack[routeStack.length - 1] : '/')
          : pathAttr;

        if (!routePath && !isIndex) return;

        const fullPath = buildFullPath(routeStack, routePath || '/');
        const componentName = elementAttr || '';
        const componentFile = resolveComponentFile(componentName, importMap, files);

        routes.push({
          path: fullPath || '/',
          componentFile,
          componentName,
          isIndex,
          isDynamic: fullPath.includes(':') || fullPath.includes('['),
          isCatchAll: fullPath.includes('*'),
          parentPath: routeStack.length > 0 ? routeStack[routeStack.length - 1] : undefined,
        });

        if (routePath && !isIndex) {
          routeStack.push(fullPath);
        }
      },
      exit(path) {
        const opening = path.node.openingElement;
        if (!t.isJSXIdentifier(opening.name, { name: 'Route' })) return;
        const pathAttr = getJSXAttrValue(opening.attributes, 'path');
        if (pathAttr) routeStack.pop();
      },
    },
  });
}

// ── React Router v5 extraction ─────────────────────────────────────────────
function extractV5Routes(
  ast: t.File,
  filePath: string,
  importMap: Map<string, string>,
  routes: DetectedRoute[],
  files: FileMap
): void {
  traverse(ast, {
    JSXOpeningElement(path) {
      if (!t.isJSXIdentifier(path.node.name, { name: 'Route' })) return;

      const pathAttr = getJSXAttrValue(path.node.attributes, 'path');
      if (!pathAttr) return;

      // v5: component={Component} or render={() => <Component />}
      let componentName = '';
      for (const attr of path.node.attributes) {
        if (!t.isJSXAttribute(attr)) continue;
        if (t.isJSXIdentifier(attr.name, { name: 'component' })) {
          if (t.isJSXExpressionContainer(attr.value) && t.isIdentifier(attr.value.expression)) {
            componentName = attr.value.expression.name;
          }
        }
      }

      const componentFile = resolveComponentFile(componentName, importMap, files);
      routes.push({
        path: pathAttr,
        componentFile,
        componentName,
        isIndex: false,
        isDynamic: pathAttr.includes(':'),
        isCatchAll: pathAttr === '*',
      });
    },
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getJSXAttrValue(
  attrs: (t.JSXAttribute | t.JSXSpreadAttribute)[],
  name: string
): string | null {
  for (const attr of attrs) {
    if (!t.isJSXAttribute(attr)) continue;
    if (!t.isJSXIdentifier(attr.name, { name })) continue;

    if (t.isStringLiteral(attr.value)) return attr.value.value;
    if (t.isJSXExpressionContainer(attr.value)) {
      const expr = attr.value.expression;
      if (t.isStringLiteral(expr)) return expr.value;
      if (t.isTemplateLiteral(expr) && expr.quasis.length === 1) {
        return expr.quasis[0].value.cooked || expr.quasis[0].value.raw;
      }
    }
  }
  return null;
}

function getJSXElementComponent(
  attrs: (t.JSXAttribute | t.JSXSpreadAttribute)[],
  name: string
): string | null {
  for (const attr of attrs) {
    if (!t.isJSXAttribute(attr)) continue;
    if (!t.isJSXIdentifier(attr.name, { name })) continue;

    if (t.isJSXExpressionContainer(attr.value)) {
      const expr = attr.value.expression;
      // element={<ComponentName />}
      if (t.isJSXElement(expr)) {
        const opening = expr.openingElement;
        if (t.isJSXIdentifier(opening.name)) return opening.name.name;
        if (t.isJSXMemberExpression(opening.name)) {
          return `${(opening.name.object as t.JSXIdentifier).name}.${opening.name.property.name}`;
        }
      }
      // element={ComponentName} (reference)
      if (t.isIdentifier(expr)) return expr.name;
    }
  }
  return null;
}

function buildFullPath(stack: string[], segment: string): string {
  if (segment.startsWith('/')) return segment;
  if (stack.length === 0) return '/' + segment;
  const parent = stack[stack.length - 1];
  return parent.endsWith('/') ? parent + segment : parent + '/' + segment;
}

// Convert React Router path to Next.js App Router path segment
export function toNextPath(routerPath: string): string {
  return routerPath
    .split('/')
    .map(segment => {
      if (segment.startsWith(':')) return `[${segment.slice(1)}]`;
      if (segment === '*') return '[...rest]';
      return segment;
    })
    .join('/');
}

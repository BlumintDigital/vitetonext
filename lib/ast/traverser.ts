import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { File } from '@babel/types';
import type { ClientDirectiveReason } from '@/lib/migration/types';

// ── React hooks that require 'use client' ──────────────────────────────────
const REACT_HOOKS = new Set([
  'useState', 'useEffect', 'useLayoutEffect', 'useRef', 'useReducer',
  'useCallback', 'useMemo', 'useContext', 'useImperativeHandle',
  'useDeferredValue', 'useTransition', 'useId', 'useDebugValue',
  'useSyncExternalStore', 'useInsertionEffect',
]);

const BROWSER_GLOBALS = new Set([
  'window', 'document', 'localStorage', 'sessionStorage',
  'navigator', 'location', 'history', 'indexedDB', 'crypto',
  'performance', 'screen', 'alert', 'confirm', 'prompt',
]);

export interface ClientDirectiveCheck {
  needs: boolean;
  reasons: ClientDirectiveReason[];
}

// Check if a file needs 'use client' directive
export function checkNeedsClientDirective(ast: File, sourcePackages: Set<string>): ClientDirectiveCheck {
  const reasons: ClientDirectiveReason[] = [];

  // Pass 5: check if already has directive
  for (const directive of ast.program.directives) {
    if (directive.value.value === 'use client' || directive.value.value === 'use server') {
      return { needs: false, reasons: [] };
    }
  }

  // Track which hooks are imported from react vs third-party
  const reactImports = new Set<string>();
  const thirdPartyHooks = new Set<string>();

  traverse(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value;
      if (source === 'react' || source === 'react-dom') {
        path.node.specifiers.forEach(s => {
          if (t.isImportSpecifier(s) && t.isIdentifier(s.imported)) {
            reactImports.add(s.imported.name);
          }
        });
      } else if (!source.startsWith('.') && !source.startsWith('/')) {
        // Third-party import
        path.node.specifiers.forEach(s => {
          if (t.isImportSpecifier(s) && t.isIdentifier(s.imported)) {
            const name = s.imported.name;
            if (name.startsWith('use') && name.length > 3 && /^[A-Z]/.test(name[3])) {
              thirdPartyHooks.add(name);
            }
          } else if (t.isImportDefaultSpecifier(s)) {
            const localName = s.local.name;
            if (localName.startsWith('use') && localName.length > 3) {
              thirdPartyHooks.add(localName);
            }
          }
        });
      }
    },

    // Pass 1: Hook calls
    CallExpression(path) {
      const callee = path.node.callee;
      if (t.isIdentifier(callee)) {
        const name = callee.name;
        if (REACT_HOOKS.has(name)) {
          const reason = name as ClientDirectiveReason;
          if (!reasons.includes(reason)) reasons.push(reason as ClientDirectiveReason);
        } else if (thirdPartyHooks.has(name)) {
          if (!reasons.includes('thirdPartyHook')) reasons.push('thirdPartyHook');
        }
      }
      // Pass 4: React.lazy
      if (
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.object, { name: 'React' }) &&
        t.isIdentifier(callee.property, { name: 'lazy' })
      ) {
        if (!reasons.includes('reactLazy')) reasons.push('reactLazy');
      }
    },

    // Pass 2: Event handler JSX props
    JSXAttribute(path) {
      const name = path.node.name;
      if (t.isJSXIdentifier(name) && /^on[A-Z]/.test(name.name)) {
        if (t.isJSXExpressionContainer(path.node.value)) {
          if (!reasons.includes('eventHandler')) reasons.push('eventHandler');
        }
      }
    },

    // Pass 3: Browser globals
    MemberExpression(path) {
      if (t.isIdentifier(path.node.object) && BROWSER_GLOBALS.has(path.node.object.name)) {
        // Make sure it's not a property access on something else
        if (!t.isMemberExpression(path.parent)) {
          if (!reasons.includes('browserAPI')) reasons.push('browserAPI');
        }
      }
    },

    Identifier(path) {
      if (BROWSER_GLOBALS.has(path.node.name)) {
        // Check it's used as a standalone identifier (not part of a different member expression)
        if (
          !t.isMemberExpression(path.parent, { object: path.node }) &&
          !t.isImportDefaultSpecifier(path.parent) &&
          !t.isImportSpecifier(path.parent) &&
          !t.isExportSpecifier(path.parent) &&
          !t.isObjectProperty(path.parent, { key: path.node })
        ) {
          if (!reasons.includes('browserAPI')) reasons.push('browserAPI');
        }
      }
    },
  });

  // Map REACT_HOOKS to specific reasons
  const mappedReasons = reasons.filter(r =>
    REACT_HOOKS.has(r) || r === 'eventHandler' || r === 'browserAPI' || r === 'reactLazy' || r === 'thirdPartyHook'
  ) as ClientDirectiveReason[];

  return { needs: mappedReasons.length > 0, reasons: mappedReasons };
}

// Find import declaration by source
export function findImportDeclaration(ast: File, source: string): t.ImportDeclaration | null {
  let found: t.ImportDeclaration | null = null;
  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value === source) {
        found = path.node;
        path.stop();
      }
    },
  });
  return found;
}

// Get all imported names from a source
export function getImportedNames(ast: File, source: string): Map<string, string> {
  const names = new Map<string, string>(); // localName → importedName
  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value === source) {
        path.node.specifiers.forEach(s => {
          if (t.isImportSpecifier(s) && t.isIdentifier(s.imported)) {
            names.set(s.local.name, s.imported.name);
          } else if (t.isImportDefaultSpecifier(s)) {
            names.set(s.local.name, 'default');
          }
        });
      }
    },
  });
  return names;
}

// Add 'use client' directive to top of file
export function addUseClientDirective(ast: File): void {
  const directive = t.directive(t.directiveLiteral('use client'));
  ast.program.directives.unshift(directive);
}

// Check if a file already has a specific directive
export function hasDirective(ast: File, directive: string): boolean {
  return ast.program.directives.some(d => d.value.value === directive);
}

// Get all source packages imported by a file
export function getImportedPackages(ast: File): Set<string> {
  const packages = new Set<string>();
  traverse(ast, {
    ImportDeclaration(path) {
      packages.add(path.node.source.value);
    },
  });
  return packages;
}

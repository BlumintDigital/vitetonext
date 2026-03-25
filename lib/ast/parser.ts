import { parse } from '@babel/parser';
import type { File } from '@babel/types';

export function parseCode(code: string, filename: string): File {
  const isTS = /\.(ts|tsx)$/.test(filename);
  try {
    return parse(code, {
      sourceType: 'module',
      strictMode: false,
      plugins: [
        ...(isTS ? (['typescript'] as const) : []),
        'jsx',
        'importMeta',
        'dynamicImport',
        'classProperties',
        ['decorators', { decoratorsBeforeExport: true }],
        'optionalChaining',
        'nullishCoalescingOperator',
        'objectRestSpread',
        'asyncGenerators',
        'exportDefaultFrom',
        'exportNamespaceFrom',
      ],
    });
  } catch {
    // Fallback: try without TypeScript plugin
    return parse(code, {
      sourceType: 'module',
      strictMode: false,
      plugins: [
        'jsx',
        'importMeta',
        'dynamicImport',
        'classProperties',
        'optionalChaining',
        'nullishCoalescingOperator',
        'objectRestSpread',
      ],
    });
  }
}

export function isSourceFile(filename: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filename);
}

export function isComponentFile(filename: string): boolean {
  return /\.(tsx|jsx)$/.test(filename);
}

export function isBinaryPath(filename: string): boolean {
  return /\.(png|jpg|jpeg|gif|svg|webp|avif|ico|woff|woff2|ttf|eot|otf|mp4|mp3|pdf|zip|tar|gz)$/i.test(filename);
}

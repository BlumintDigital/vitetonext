import type { FileMap, ProjectAnalysis, MigrationWarning, StepEmitter } from '@/lib/migration/types';

const NEXT_COMPILER_OPTIONS = {
  target: 'ES2017',
  lib: ['dom', 'dom.iterable', 'esnext'],
  allowJs: true,
  skipLibCheck: true,
  strict: true,
  noEmit: true,
  esModuleInterop: true,
  module: 'esnext',
  moduleResolution: 'bundler',
  resolveJsonModule: true,
  isolatedModules: true,
  jsx: 'preserve',
  incremental: true,
  plugins: [{ name: 'next' }],
};

export async function transformTsconfig(
  files: FileMap,
  analysis: ProjectAnalysis,
  emit: StepEmitter,
  warnings: MigrationWarning[]
): Promise<FileMap> {
  emit({ id: 'tsconfig', label: 'Updating tsconfig.json', status: 'running', filesAffected: [] });

  if (!analysis.isTypeScript) {
    emit({ id: 'tsconfig', label: 'Updating tsconfig.json', status: 'done', filesAffected: [] });
    return files;
  }

  const content = files.get('tsconfig.json');
  let tsconfig: Record<string, unknown> = {};

  if (content) {
    try {
      tsconfig = JSON.parse(content);
    } catch {
      warnings.push({ severity: 'warn', message: 'Could not parse tsconfig.json', file: 'tsconfig.json' });
    }
  }

  const existing = (tsconfig.compilerOptions || {}) as Record<string, unknown>;

  // Preserve existing paths
  const existingPaths = existing.paths as Record<string, string[]> | undefined;

  const merged = {
    ...existing,
    ...NEXT_COMPILER_OPTIONS,
    paths: {
      '@/*': ['./*'],
      ...existingPaths,
    },
  };

  // Remove Vite-specific items
  const mergedAny = merged as Record<string, unknown>;
  delete mergedAny.references;
  delete mergedAny.composite;

  tsconfig.compilerOptions = merged;
  tsconfig.include = ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'];
  tsconfig.exclude = ['node_modules'];
  delete (tsconfig as Record<string, unknown>).references;

  const result = new Map(files);
  result.set('tsconfig.json', JSON.stringify(tsconfig, null, 2));
  emit({ id: 'tsconfig', label: 'Updating tsconfig.json', status: 'done', filesAffected: ['tsconfig.json'] });
  return result;
}

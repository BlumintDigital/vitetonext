import type { FileMap, ProjectAnalysis, MigrationWarning, StepEmitter } from '@/lib/migration/types';

const REPLACEMENTS: [RegExp, string][] = [
  [/import\.meta\.env\.VITE_(\w+)/g, 'process.env.NEXT_PUBLIC_$1'],
  [/import\.meta\.env\.MODE/g, 'process.env.NODE_ENV'],
  [/import\.meta\.env\.PROD/g, "(process.env.NODE_ENV === 'production')"],
  [/import\.meta\.env\.DEV/g, "(process.env.NODE_ENV === 'development')"],
  [/import\.meta\.env\.SSR/g, "(typeof window === 'undefined')"],
  [/import\.meta\.env\.BASE_URL/g, 'process.env.NEXT_PUBLIC_BASE_PATH'],
  [/import\.meta\.env\./g, 'process.env.'],
  [/import\.meta\.url/g, '/* TODO: import.meta.url not supported in Next.js — use __dirname or a static asset URL */'],
];

const SOURCE_EXTS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

export async function transformEnvVars(
  files: FileMap,
  analysis: ProjectAnalysis,
  emit: StepEmitter,
  warnings: MigrationWarning[]
): Promise<FileMap> {
  emit({ id: 'env-vars', label: 'Migrating environment variables', status: 'running', filesAffected: [] });

  const result = new Map(files);
  const affected: string[] = [];

  for (const [filePath, content] of files) {
    if (!SOURCE_EXTS.test(filePath)) continue;
    if (content.startsWith('__BINARY__:')) continue;
    if (!content.includes('import.meta.env') && !content.includes('import.meta.url')) continue;

    let updated = content;
    for (const [pattern, replacement] of REPLACEMENTS) {
      updated = updated.replace(pattern, replacement);
    }

    if (updated !== content) {
      result.set(filePath, updated);
      affected.push(filePath);
    }
  }

  emit({ id: 'env-vars', label: 'Migrating environment variables', status: 'done', filesAffected: affected });
  return result;
}

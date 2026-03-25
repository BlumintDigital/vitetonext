import type { FileMap, ProjectAnalysis, MigrationWarning, StepEmitter } from '@/lib/migration/types';

const FILES_TO_REMOVE = [
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mts',
  'vite.config.mjs',
  'vite-env.d.ts',
  'src/vite-env.d.ts',
  'tsconfig.node.json',
  'index.html',
];

export async function transformCleanup(
  files: FileMap,
  analysis: ProjectAnalysis,
  emit: StepEmitter,
  warnings: MigrationWarning[]
): Promise<FileMap> {
  emit({ id: 'cleanup', label: 'Removing Vite-specific files', status: 'running', filesAffected: [] });

  const result = new Map(files);
  const removed: string[] = [];

  for (const file of FILES_TO_REMOVE) {
    if (result.has(file)) {
      result.delete(file);
      removed.push(file);
    }
  }

  // Remove main.tsx / main.jsx (replaced by Next.js entrypoint)
  if (analysis.entryFile && result.has(analysis.entryFile)) {
    result.delete(analysis.entryFile);
    removed.push(analysis.entryFile);
  }

  emit({ id: 'cleanup', label: 'Removing Vite-specific files', status: 'done', filesAffected: removed });
  return result;
}

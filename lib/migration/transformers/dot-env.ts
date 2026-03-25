import type { FileMap, ProjectAnalysis, MigrationWarning, StepEmitter } from '@/lib/migration/types';

export async function transformDotEnv(
  files: FileMap,
  analysis: ProjectAnalysis,
  emit: StepEmitter,
  warnings: MigrationWarning[]
): Promise<FileMap> {
  emit({ id: 'dot-env', label: 'Updating .env files', status: 'running', filesAffected: [] });

  const result = new Map(files);
  const affected: string[] = [];

  for (const [filePath, content] of files) {
    const isEnvFile = /^\.env(\.(local|development|production|test)(\.local)?)?$/.test(filePath);
    if (!isEnvFile) continue;
    if (content.startsWith('__BINARY__:')) continue;

    const updated = content.replace(/^VITE_/gm, 'NEXT_PUBLIC_');
    if (updated !== content) {
      result.set(filePath, updated);
      affected.push(filePath);
    }
  }

  emit({ id: 'dot-env', label: 'Updating .env files', status: 'done', filesAffected: affected });
  return result;
}

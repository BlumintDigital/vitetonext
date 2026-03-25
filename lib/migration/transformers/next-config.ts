import type { FileMap, ProjectAnalysis, MigrationWarning, StepEmitter } from '@/lib/migration/types';

export async function transformNextConfig(
  files: FileMap,
  analysis: ProjectAnalysis,
  emit: StepEmitter,
  warnings: MigrationWarning[]
): Promise<FileMap> {
  emit({ id: 'next-config', label: 'Generating next.config.mjs', status: 'running', filesAffected: [] });

  const lines: string[] = [
    '/** @type {import(\'next\').NextConfig} */',
    '// Migrated from Vite project by ViteToNext.AI',
    'const nextConfig = {',
  ];

  // Check for SVGR usage
  const hasSvgr = [...files.keys()].some(f => f.endsWith('.svg')) &&
    (files.get('vite.config.ts') || '').includes('svgr');

  if (hasSvgr) {
    warnings.push({
      severity: 'warn',
      message: 'SVGR detected: install @svgr/webpack and configure in next.config.mjs manually',
    });
  }

  lines.push('};', '', 'export default nextConfig;');

  const result = new Map(files);
  result.set('next.config.mjs', lines.join('\n'));
  emit({ id: 'next-config', label: 'Generating next.config.mjs', status: 'done', filesAffected: ['next.config.mjs'] });
  return result;
}

import type { FileMap, ProjectAnalysis, MigrationWarning, StepEmitter } from '@/lib/migration/types';

const VITE_DEPS = new Set([
  'vite', '@vitejs/plugin-react', '@vitejs/plugin-react-swc',
  'vite-tsconfig-paths', 'vite-plugin-pwa', 'vite-plugin-svgr',
]);

function isViteDep(name: string): boolean {
  return VITE_DEPS.has(name) || name.startsWith('vite-plugin-');
}

export async function transformPackageJson(
  files: FileMap,
  analysis: ProjectAnalysis,
  emit: StepEmitter,
  warnings: MigrationWarning[]
): Promise<FileMap> {
  emit({ id: 'package-json', label: 'Transforming package.json', status: 'running', filesAffected: [] });

  const content = files.get('package.json');
  if (!content) {
    emit({ id: 'package-json', label: 'Transforming package.json', status: 'done', filesAffected: [] });
    return files;
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(content);
  } catch {
    warnings.push({ severity: 'warn', message: 'Could not parse package.json', file: 'package.json' });
    emit({ id: 'package-json', label: 'Transforming package.json', status: 'done', filesAffected: [] });
    return files;
  }

  // Remove Vite deps
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
    const deps = pkg[section] as Record<string, string> | undefined;
    if (!deps) continue;
    for (const name of Object.keys(deps)) {
      if (isViteDep(name)) delete deps[name];
    }
  }

  // Add Next.js
  const deps = (pkg.dependencies || {}) as Record<string, string>;
  deps['next'] = '15.2.1';
  pkg.dependencies = deps;

  // Add @types/node to devDeps
  const devDeps = (pkg.devDependencies || {}) as Record<string, string>;
  if (!devDeps['@types/node']) devDeps['@types/node'] = '^22.0.0';
  pkg.devDependencies = devDeps;

  // Update scripts
  pkg.scripts = {
    dev: 'next dev',
    build: 'next build',
    start: 'next start',
    lint: 'next lint',
  };

  const result = new Map(files);
  result.set('package.json', JSON.stringify(pkg, null, 2));
  emit({ id: 'package-json', label: 'Transforming package.json', status: 'done', filesAffected: ['package.json'] });
  return result;
}

import type { FileMap, ProjectAnalysis, MigrationResult, MigrationStep, MigrationWarning, StepEmitter } from '@/lib/migration/types';
import { analyzeProject } from './analyzers/project-analyzer';
import { transformPackageJson } from './transformers/package-json';
import { transformNextConfig } from './transformers/next-config';
import { transformTsconfig } from './transformers/tsconfig';
import { transformEnvVars } from './transformers/env-vars';
import { transformDotEnv } from './transformers/dot-env';
import { transformRouterImports } from './transformers/router-imports';
import { transformClientDirective } from './transformers/client-directive';
import { transformImageImports } from './transformers/image-imports';
import { transformLayout } from './transformers/layout';
import { transformEntrypoint } from './transformers/entrypoint';
import { transformRoutes } from './transformers/routes';
import { transformCleanup } from './transformers/cleanup';

export { analyzeProject };

export async function migrateProject(
  files: FileMap,
  onStep?: StepEmitter,
  precomputedAnalysis?: ProjectAnalysis
): Promise<MigrationResult> {
  const steps: MigrationStep[] = [];
  const warnings: MigrationWarning[] = [];

  const emit: StepEmitter = (partial) => {
    const existing = steps.find(s => s.id === partial.id);
    if (existing) {
      Object.assign(existing, partial);
    } else {
      steps.push({
        id: partial.id,
        label: partial.label || partial.id,
        status: partial.status || 'pending',
        filesAffected: partial.filesAffected || [],
        durationMs: partial.durationMs,
      });
    }
    onStep?.(partial);
  };

  // ── Phase 1: Analyze ────────────────────────────────────────────────────
  const analysis = precomputedAnalysis ?? await analyzeProject(files);

  // ── Phase 2: Transform pipeline ─────────────────────────────────────────
  const transformers = [
    { fn: transformPackageJson,   id: 'package-json' },
    { fn: transformNextConfig,    id: 'next-config' },
    { fn: transformTsconfig,      id: 'tsconfig' },
    { fn: transformEnvVars,       id: 'env-vars' },
    { fn: transformDotEnv,        id: 'dot-env' },
    { fn: transformRouterImports, id: 'router-imports' },
    { fn: transformClientDirective, id: 'client-directive' },
    { fn: transformImageImports,  id: 'image-imports' },
    { fn: transformLayout,        id: 'layout' },
    { fn: transformEntrypoint,    id: 'entrypoint' },
    { fn: transformRoutes,        id: 'routes' },
    { fn: transformCleanup,       id: 'cleanup' },
  ];

  let current = files;

  for (const { fn } of transformers) {
    const start = Date.now();
    try {
      current = await fn(current, analysis, emit, warnings);
      // Update duration on the completed step
      const step = steps[steps.length - 1];
      if (step) step.durationMs = Date.now() - start;
    } catch (err) {
      const id = transformers.find(t => t.fn === fn)?.id || 'unknown';
      emit({ id, status: 'error', label: `Error in ${id}` });
      warnings.push({
        severity: 'error',
        message: `Transformer ${id} failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return { outputFiles: current, analysis, steps, warnings };
}

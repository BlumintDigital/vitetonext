import { Spinner } from '@/components/ui/Spinner';
import type { MigrationStep, MigrationWarning } from '@/lib/migration/types';

interface MigrationProgressProps {
  steps: MigrationStep[];
  warnings: MigrationWarning[];
}

const STEP_LABELS: Record<string, string> = {
  'package-json':     'Transforming package.json',
  'next-config':      'Generating next.config.mjs',
  'tsconfig':         'Updating tsconfig.json',
  'env-vars':         'Migrating environment variables',
  'dot-env':          'Updating .env files',
  'router-imports':   'Migrating React Router imports',
  'client-directive': "Adding 'use client' directives",
  'image-imports':    'Updating image imports',
  'layout':           'Generating app/layout.tsx',
  'entrypoint':       'Creating entrypoint pages',
  'routes':           'Converting routes to pages',
  'cleanup':          'Removing Vite-specific files',
};

const ALL_STEPS = Object.keys(STEP_LABELS);

export function MigrationProgress({ steps, warnings }: MigrationProgressProps) {
  // Merge known steps with received data
  const stepMap = new Map(steps.map(s => [s.id, s]));

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Spinner />
          <h2 className="text-2xl font-bold text-[#f1f5f9]">Migrating your project…</h2>
        </div>
        <p className="text-[#94a3b8] text-sm">
          Running {ALL_STEPS.length} transformations. This usually takes a few seconds.
        </p>
      </div>

      <div className="space-y-1">
        {ALL_STEPS.map(id => {
          const step = stepMap.get(id);
          const status = step?.status || 'pending';

          return (
            <div key={id} className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-300
              ${status === 'running' ? 'bg-blue-500/5 border border-blue-500/20' : ''}
              ${status === 'done' ? 'bg-green-500/5' : ''}
              ${status === 'error' ? 'bg-red-500/5 border border-red-500/20' : ''}
            `}>
              <StatusIcon status={status} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  status === 'running' ? 'text-[#f1f5f9]' :
                  status === 'done' ? 'text-[#94a3b8]' :
                  status === 'error' ? 'text-red-400' :
                  'text-[#475569]'
                }`}>
                  {step?.label || STEP_LABELS[id] || id}
                </p>
                {status === 'done' && step?.filesAffected && step.filesAffected.length > 0 && (
                  <p className="text-xs text-[#475569] mt-0.5">
                    {step.filesAffected.length} file{step.filesAffected.length !== 1 ? 's' : ''} updated
                  </p>
                )}
              </div>
              {step?.durationMs && (
                <span className="text-xs text-[#475569]">{step.durationMs}ms</span>
              )}
            </div>
          );
        })}
      </div>

      {warnings.length > 0 && (
        <div className="mt-6 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-yellow-400 text-sm font-medium mb-2">
            {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-1">
            {warnings.slice(0, 5).map((w, i) => (
              <p key={i} className="text-yellow-400/70 text-xs font-mono">{w.message}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: MigrationStep['status'] | 'pending' }) {
  if (status === 'running') {
    return <Spinner size="sm" />;
  }
  if (status === 'done') {
    return (
      <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (status === 'error') {
    return (
      <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }
  return <div className="w-5 h-5 rounded-full border border-[#1e293b] flex-shrink-0" />;
}

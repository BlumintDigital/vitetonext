'use client';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { ProjectAnalysis } from '@/lib/migration/types';

interface AnalysisPanelProps {
  analysis: ProjectAnalysis;
  onMigrate: () => void;
  onReset: () => void;
}

export function AnalysisPanel({ analysis, onMigrate, onReset }: AnalysisPanelProps) {
  const clientComponents = analysis.components.filter(c => c.needsClientDirective).length;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#f1f5f9]">Project Analysis</h2>
          <p className="text-[#94a3b8] text-sm mt-1">
            Your project is ready to migrate. Review the details below.
          </p>
        </div>
        <button onClick={onReset} className="text-[#475569] hover:text-[#94a3b8] text-sm transition-colors">
          ← Upload different file
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Routes"
          value={analysis.routes.length}
          icon="🛣️"
          color="blue"
          empty={!analysis.hasReactRouter}
          emptyText="No router"
        />
        <StatCard
          label="Components"
          value={analysis.components.length}
          icon="🧩"
          color="purple"
        />
        <StatCard
          label="Client components"
          value={clientComponents}
          icon="⚡"
          color="yellow"
        />
        <StatCard
          label="Env vars"
          value={analysis.envVars.length}
          icon="🔑"
          color="green"
        />
      </div>

      {/* Tech stack */}
      {analysis.techStack.length > 0 && (
        <div className="bg-[#0f1629] rounded-xl border border-[#1e293b] p-5 mb-6">
          <p className="text-[#475569] text-xs font-medium uppercase tracking-wider mb-3">Detected tech stack</p>
          <div className="flex flex-wrap gap-2">
            {analysis.techStack.map(tech => (
              <Badge key={tech} variant="gray">{tech}</Badge>
            ))}
            {analysis.isTypeScript && <Badge variant="blue">TypeScript</Badge>}
            {analysis.hasReactRouter && (
              <Badge variant="cyan">React Router {analysis.reactRouterVersion}</Badge>
            )}
          </div>
        </div>
      )}

      {/* Routes list */}
      {analysis.routes.length > 0 && (
        <div className="bg-[#0f1629] rounded-xl border border-[#1e293b] p-5 mb-6">
          <p className="text-[#475569] text-xs font-medium uppercase tracking-wider mb-3">
            Routes to migrate ({analysis.routes.length})
          </p>
          <div className="space-y-2">
            {analysis.routes.slice(0, 8).map((route, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <code className="text-[#22d3ee] font-mono bg-cyan-500/5 px-2 py-0.5 rounded">
                  {route.path || '/'}
                </code>
                <span className="text-[#475569]">→</span>
                <code className="text-[#3b82f6] font-mono text-xs">
                  app/{routeToAppPath(route.path || '/')}/page.tsx
                </code>
                <div className="flex gap-1">
                  {route.isDynamic && <Badge variant="yellow">dynamic</Badge>}
                  {route.isIndex && <Badge variant="gray">index</Badge>}
                  {route.isCatchAll && <Badge variant="purple">catch-all</Badge>}
                </div>
              </div>
            ))}
            {analysis.routes.length > 8 && (
              <p className="text-[#475569] text-sm">
                +{analysis.routes.length - 8} more routes…
              </p>
            )}
          </div>
        </div>
      )}

      {/* Env vars */}
      {analysis.envVars.length > 0 && (
        <div className="bg-[#0f1629] rounded-xl border border-[#1e293b] p-5 mb-6">
          <p className="text-[#475569] text-xs font-medium uppercase tracking-wider mb-3">
            Environment variables ({analysis.envVars.length})
          </p>
          <div className="space-y-2">
            {analysis.envVars.slice(0, 6).map((ev, i) => (
              <div key={i} className="flex items-center gap-3 text-sm font-mono">
                <span className="text-yellow-400 line-through opacity-60 text-xs">{ev.original}</span>
                <span className="text-[#475569]">→</span>
                <span className="text-green-400 text-xs">{ev.migrated}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex justify-center pt-4">
        <Button size="lg" onClick={onMigrate} className="px-10">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Start Migration
        </Button>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, color, empty, emptyText
}: {
  label: string; value: number; icon: string;
  color: 'blue' | 'purple' | 'yellow' | 'green';
  empty?: boolean; emptyText?: string;
}) {
  const colorMap = {
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    green: 'text-green-400 bg-green-500/10',
  };
  return (
    <div className="bg-[#0f1629] rounded-xl border border-[#1e293b] p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg mb-3 ${colorMap[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-[#f1f5f9]">
        {empty ? <span className="text-sm text-[#475569]">{emptyText}</span> : value}
      </p>
      <p className="text-[#475569] text-sm mt-0.5">{label}</p>
    </div>
  );
}

function routeToAppPath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map(s => s.startsWith(':') ? `[${s.slice(1)}]` : s === '*' ? '[...rest]' : s)
    .join('/') || '';
}

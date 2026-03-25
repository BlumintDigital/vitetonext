// Core type: maps normalized file paths → file contents
// Binary files are stored as "__BINARY__:<base64>"
export type FileMap = Map<string, string>;

export interface ProjectAnalysis {
  isTypeScript: boolean;
  hasReactRouter: boolean;
  reactRouterVersion: 5 | 6 | null;
  routes: DetectedRoute[];
  components: DetectedComponent[];
  envVars: DetectedEnvVar[];
  entryFile: string | null;         // main.tsx / main.jsx
  indexHtml: string | null;         // path to index.html
  viteConfigPath: string | null;
  rootComponentFile: string | null; // App.tsx / App.jsx
  hasLayouts: boolean;
  techStack: string[];
}

export interface DetectedRoute {
  path: string;                  // e.g. "/dashboard/:id"
  componentFile: string;         // source file path in ZIP
  componentName: string;         // e.g. "Dashboard"
  isIndex: boolean;
  isDynamic: boolean;
  isCatchAll: boolean;
  parentPath?: string;
  layoutFile?: string;
}

export type ClientDirectiveReason =
  | 'useState'
  | 'useEffect'
  | 'useRef'
  | 'useCallback'
  | 'useMemo'
  | 'useContext'
  | 'useReducer'
  | 'useTransition'
  | 'useId'
  | 'useLayoutEffect'
  | 'useImperativeHandle'
  | 'eventHandler'
  | 'browserAPI'
  | 'reactLazy'
  | 'thirdPartyHook';

export interface DetectedComponent {
  file: string;
  name: string;
  needsClientDirective: boolean;
  reasons: ClientDirectiveReason[];
}

export interface DetectedEnvVar {
  original: string;   // import.meta.env.VITE_API_URL
  migrated: string;   // process.env.NEXT_PUBLIC_API_URL
  files: string[];
}

export interface MigrationResult {
  outputFiles: FileMap;
  analysis: ProjectAnalysis;
  steps: MigrationStep[];
  warnings: MigrationWarning[];
}

export interface MigrationStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  filesAffected: string[];
  durationMs?: number;
}

export interface MigrationWarning {
  severity: 'info' | 'warn' | 'error';
  message: string;
  file?: string;
  line?: number;
}

export type StepEmitter = (step: Partial<MigrationStep> & { id: string }) => void;

export type Transformer = (
  files: FileMap,
  analysis: ProjectAnalysis,
  emit: StepEmitter,
  warnings: MigrationWarning[]
) => Promise<FileMap>;

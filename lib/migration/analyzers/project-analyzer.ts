import type { FileMap, ProjectAnalysis } from '@/lib/migration/types';
import { analyzeRoutes } from './route-analyzer';
import { analyzeComponents } from './component-analyzer';
import { analyzeEnvVars } from './env-analyzer';

export async function analyzeProject(files: FileMap): Promise<ProjectAnalysis> {
  // Detect TypeScript
  const isTypeScript = [...files.keys()].some(p => p.endsWith('.ts') || p.endsWith('.tsx'));

  // Find key files
  const viteConfigPath =
    files.has('vite.config.ts') ? 'vite.config.ts' :
    files.has('vite.config.js') ? 'vite.config.js' :
    files.has('vite.config.mts') ? 'vite.config.mts' :
    null;

  const indexHtml =
    files.has('index.html') ? 'index.html' : null;

  const entryFile =
    files.has('src/main.tsx') ? 'src/main.tsx' :
    files.has('src/main.jsx') ? 'src/main.jsx' :
    files.has('src/main.ts') ? 'src/main.ts' :
    files.has('src/main.js') ? 'src/main.js' :
    files.has('main.tsx') ? 'main.tsx' :
    files.has('main.jsx') ? 'main.jsx' :
    null;

  const rootComponentFile =
    files.has('src/App.tsx') ? 'src/App.tsx' :
    files.has('src/App.jsx') ? 'src/App.jsx' :
    files.has('src/App.ts') ? 'src/App.ts' :
    files.has('src/App.js') ? 'src/App.js' :
    files.has('App.tsx') ? 'App.tsx' :
    files.has('App.jsx') ? 'App.jsx' :
    null;

  // Detect React Router
  const pkgJson = files.get('package.json');
  let hasReactRouter = false;
  let reactRouterVersion: 5 | 6 | null = null;

  if (pkgJson) {
    try {
      const pkg = JSON.parse(pkgJson);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const rrVersion = deps['react-router-dom'] || deps['react-router'];
      if (rrVersion) {
        hasReactRouter = true;
        const major = parseInt(rrVersion.replace(/[^0-9]/, ''), 10);
        reactRouterVersion = major >= 6 ? 6 : 5;
      }
    } catch {
      // ignore parse error
    }
  }

  // Detect tech stack
  const techStack = detectTechStack(files, pkgJson);

  // Run sub-analyzers
  const routes = hasReactRouter
    ? await analyzeRoutes(files, reactRouterVersion!)
    : [];

  const components = await analyzeComponents(files);
  const envVars = analyzeEnvVars(files);
  const hasLayouts = routes.some(r => !!r.layoutFile || !!r.parentPath);

  return {
    isTypeScript,
    hasReactRouter,
    reactRouterVersion,
    routes,
    components,
    envVars,
    entryFile,
    indexHtml,
    viteConfigPath,
    rootComponentFile,
    hasLayouts,
    techStack,
  };
}

function detectTechStack(files: FileMap, pkgJson: string | undefined): string[] {
  const stack: string[] = [];

  if (pkgJson) {
    try {
      const pkg = JSON.parse(pkgJson);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      // React version
      if (deps['react']) {
        const v = deps['react'].replace(/[^0-9.]/g, '').split('.')[0];
        stack.push(`React ${v}`);
      }

      // TypeScript
      if (deps['typescript']) stack.push('TypeScript');

      // Router
      if (deps['react-router-dom']) {
        const v = deps['react-router-dom'].replace(/[^0-9.]/g, '').split('.')[0];
        stack.push(`React Router ${v}`);
      }

      // Styling
      if (deps['tailwindcss']) stack.push('Tailwind CSS');
      if (deps['styled-components']) stack.push('Styled Components');
      if (deps['@emotion/react']) stack.push('Emotion');
      if (deps['sass'] || deps['node-sass']) stack.push('Sass');

      // State management
      if (deps['zustand']) stack.push('Zustand');
      if (deps['redux'] || deps['@reduxjs/toolkit']) stack.push('Redux');
      if (deps['jotai']) stack.push('Jotai');
      if (deps['recoil']) stack.push('Recoil');

      // Data fetching
      if (deps['@tanstack/react-query'] || deps['react-query']) stack.push('TanStack Query');
      if (deps['swr']) stack.push('SWR');
      if (deps['axios']) stack.push('Axios');

      // UI libs
      if (deps['@mui/material']) stack.push('MUI');
      if (deps['antd']) stack.push('Ant Design');
      if (deps['@chakra-ui/react']) stack.push('Chakra UI');
    } catch {
      // ignore
    }
  }

  return stack;
}

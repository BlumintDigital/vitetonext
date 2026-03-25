import type { FileMap, DetectedEnvVar } from '@/lib/migration/types';

const ENV_VAR_PATTERN = /import\.meta\.env\.(\w+)/g;

export function analyzeEnvVars(files: FileMap): DetectedEnvVar[] {
  const varMap = new Map<string, { migrated: string; files: Set<string> }>();

  for (const [filePath, content] of files) {
    if (content.startsWith('__BINARY__:')) continue;
    if (!filePath.match(/\.(ts|tsx|js|jsx|mjs|cjs)$/)) continue;

    let match: RegExpExecArray | null;
    const pattern = new RegExp(ENV_VAR_PATTERN.source, 'g');

    while ((match = pattern.exec(content)) !== null) {
      const original = match[0];
      const varName = match[1];

      let migrated: string;
      switch (varName) {
        case 'MODE':    migrated = 'process.env.NODE_ENV'; break;
        case 'PROD':    migrated = "(process.env.NODE_ENV === 'production')"; break;
        case 'DEV':     migrated = "(process.env.NODE_ENV === 'development')"; break;
        case 'SSR':     migrated = "(typeof window === 'undefined')"; break;
        case 'BASE_URL': migrated = 'process.env.NEXT_PUBLIC_BASE_PATH'; break;
        default:
          if (varName.startsWith('VITE_')) {
            migrated = `process.env.NEXT_PUBLIC_${varName.slice(5)}`;
          } else {
            migrated = `process.env.${varName}`;
          }
      }

      if (!varMap.has(original)) {
        varMap.set(original, { migrated, files: new Set() });
      }
      varMap.get(original)!.files.add(filePath);
    }
  }

  return Array.from(varMap.entries()).map(([original, { migrated, files }]) => ({
    original,
    migrated,
    files: Array.from(files),
  }));
}

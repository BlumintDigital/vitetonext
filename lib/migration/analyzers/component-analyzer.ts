import { parseCode, isComponentFile } from '@/lib/ast/parser';
import { checkNeedsClientDirective, getImportedPackages } from '@/lib/ast/traverser';
import type { FileMap, DetectedComponent } from '@/lib/migration/types';

export async function analyzeComponents(files: FileMap): Promise<DetectedComponent[]> {
  const components: DetectedComponent[] = [];

  for (const [filePath, content] of files) {
    if (!isComponentFile(filePath)) continue;
    if (content.startsWith('__BINARY__:')) continue;

    try {
      const ast = parseCode(content, filePath);
      const packages = getImportedPackages(ast);
      const { needs, reasons } = checkNeedsClientDirective(ast, packages);

      // Derive component name from filename
      const name = filePath
        .split('/')
        .pop()!
        .replace(/\.(tsx|jsx|ts|js)$/, '');

      components.push({
        file: filePath,
        name,
        needsClientDirective: needs,
        reasons,
      });
    } catch {
      // skip parse errors
    }
  }

  return components;
}

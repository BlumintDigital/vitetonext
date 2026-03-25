import { parseCode, isComponentFile } from '@/lib/ast/parser';
import { generateCode } from '@/lib/ast/generator';
import { checkNeedsClientDirective, addUseClientDirective, hasDirective, getImportedPackages } from '@/lib/ast/traverser';
import type { FileMap, ProjectAnalysis, MigrationWarning, StepEmitter } from '@/lib/migration/types';

export async function transformClientDirective(
  files: FileMap,
  analysis: ProjectAnalysis,
  emit: StepEmitter,
  warnings: MigrationWarning[]
): Promise<FileMap> {
  emit({ id: 'client-directive', label: "Adding 'use client' directives", status: 'running', filesAffected: [] });

  const result = new Map(files);
  const affected: string[] = [];

  for (const [filePath, content] of files) {
    if (!isComponentFile(filePath)) continue;
    if (content.startsWith('__BINARY__:')) continue;

    // Quick pre-check to skip obviously server-safe files
    const hasClientIndicators =
      content.includes('useState') ||
      content.includes('useEffect') ||
      content.includes('useRef') ||
      content.includes('useReducer') ||
      content.includes('useCallback') ||
      content.includes('useMemo') ||
      content.includes('useContext') ||
      content.includes('useTransition') ||
      content.includes('onClick') ||
      content.includes('onChange') ||
      content.includes('onSubmit') ||
      content.includes('window.') ||
      content.includes('document.') ||
      content.includes('localStorage') ||
      content.includes('sessionStorage') ||
      content.includes('React.lazy');

    if (!hasClientIndicators) continue;

    try {
      const ast = parseCode(content, filePath);

      // Skip if already has a directive
      if (hasDirective(ast, 'use client') || hasDirective(ast, 'use server')) continue;

      const packages = getImportedPackages(ast);
      const { needs, reasons } = checkNeedsClientDirective(ast, packages);

      if (needs) {
        addUseClientDirective(ast);
        result.set(filePath, generateCode(ast, content));
        affected.push(filePath);
      }
    } catch {
      // If we can't parse, add 'use client' as a raw string prepend for safety
      if (
        (content.includes('useState') || content.includes('useEffect')) &&
        !content.startsWith("'use client'") &&
        !content.startsWith('"use client"')
      ) {
        result.set(filePath, "'use client';\n\n" + content);
        affected.push(filePath);
      }
    }
  }

  emit({ id: 'client-directive', label: "Adding 'use client' directives", status: 'done', filesAffected: affected });
  return result;
}

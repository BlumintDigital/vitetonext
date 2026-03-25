import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { parseCode, isSourceFile } from '@/lib/ast/parser';
import { generateCode } from '@/lib/ast/generator';
import type { FileMap, ProjectAnalysis, MigrationWarning, StepEmitter } from '@/lib/migration/types';

const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|webp|avif|ico|bmp|tiff)$/i;

export async function transformImageImports(
  files: FileMap,
  analysis: ProjectAnalysis,
  emit: StepEmitter,
  warnings: MigrationWarning[]
): Promise<FileMap> {
  emit({ id: 'image-imports', label: 'Updating image imports', status: 'running', filesAffected: [] });

  const result = new Map(files);
  const affected: string[] = [];

  for (const [filePath, content] of files) {
    if (!isSourceFile(filePath)) continue;
    if (content.startsWith('__BINARY__:')) continue;
    if (!IMAGE_EXTS.test(content)) continue; // quick check

    try {
      const ast = parseCode(content, filePath);
      const imageLocalNames = new Set<string>();
      let modified = false;

      // Find all image imports
      traverse(ast, {
        ImportDeclaration(path) {
          if (IMAGE_EXTS.test(path.node.source.value)) {
            path.node.specifiers.forEach(s => {
              if (t.isImportDefaultSpecifier(s)) {
                imageLocalNames.add(s.local.name);
              }
            });
          }
        },
      });

      if (imageLocalNames.size === 0) continue;

      // Replace usages: logo → logo.src (in JSX src attributes and regular expressions)
      traverse(ast, {
        JSXAttribute(path) {
          const attrName = path.node.name;
          if (!t.isJSXIdentifier(attrName, { name: 'src' })) return;

          if (t.isJSXExpressionContainer(path.node.value)) {
            const expr = path.node.value.expression;
            if (t.isIdentifier(expr) && imageLocalNames.has(expr.name)) {
              // Replace with expr.src
              path.node.value = t.jsxExpressionContainer(
                t.memberExpression(
                  t.identifier(expr.name),
                  t.identifier('src')
                )
              );
              modified = true;
            }
          }
        },
      });

      if (modified) {
        result.set(filePath, generateCode(ast, content));
        affected.push(filePath);
      }
    } catch {
      // skip
    }
  }

  emit({ id: 'image-imports', label: 'Updating image imports', status: 'done', filesAffected: affected });
  return result;
}

import generate from '@babel/generator';
import type { File } from '@babel/types';

export function generateCode(ast: File, originalCode?: string): string {
  const result = generate(
    ast,
    {
      retainLines: false,
      compact: false,
      jsescOption: { minimal: true },
      comments: true,
    },
    originalCode
  );
  return result.code;
}

import JSZip from 'jszip';
import type { FileMap } from '@/lib/migration/types';
import { isBinaryPath } from '@/lib/ast/parser';

export async function readZip(buffer: ArrayBuffer): Promise<FileMap> {
  const zip = await JSZip.loadAsync(buffer);
  const files = new Map<string, string>();

  const paths = Object.keys(zip.files).filter(p => !zip.files[p].dir);

  // Detect and strip common root folder (e.g. "my-project/src/" → "src/")
  const commonPrefix = detectCommonPrefix(paths);

  await Promise.all(
    paths.map(async (path) => {
      const normalizedPath = path.slice(commonPrefix.length).replace(/\\/g, '/');
      if (!normalizedPath) return;

      const file = zip.files[path];
      if (isBinaryPath(normalizedPath)) {
        const data = await file.async('base64');
        files.set(normalizedPath, `__BINARY__:${data}`);
      } else {
        const content = await file.async('string');
        files.set(normalizedPath, content);
      }
    })
  );

  return files;
}

function detectCommonPrefix(paths: string[]): string {
  if (paths.length === 0) return '';
  const firstSlash = paths[0].indexOf('/');
  if (firstSlash === -1) return '';

  const candidate = paths[0].slice(0, firstSlash + 1);
  const allMatch = paths.every(p => p.startsWith(candidate));
  return allMatch ? candidate : '';
}

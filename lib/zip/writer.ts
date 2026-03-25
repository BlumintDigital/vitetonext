import JSZip from 'jszip';
import type { FileMap } from '@/lib/migration/types';

export async function writeZip(files: FileMap): Promise<Buffer> {
  const zip = new JSZip();

  for (const [path, content] of files) {
    if (content.startsWith('__BINARY__:')) {
      zip.file(path, content.slice(11), { base64: true });
    } else {
      zip.file(path, content);
    }
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return buffer;
}

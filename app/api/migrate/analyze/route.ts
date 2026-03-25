import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { v4 as uuidv4 } from 'uuid';
import { readZip } from '@/lib/zip/reader';
import { analyzeProject } from '@/lib/migration/index';
import { createSession } from '@/lib/session-store';

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded', code: 'NO_FILE' }, { status: 400 });
    }

    const blob = file as Blob;

    if (blob.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large (max 50MB)', code: 'TOO_LARGE' }, { status: 413 });
    }

    const blobFile = blob as File;
    if (blobFile.name && !blobFile.name.endsWith('.zip') && blob.type !== 'application/zip') {
      // Be lenient — just try to read it
    }

    const buffer = await blob.arrayBuffer();

    let files;
    try {
      files = await readZip(buffer);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid or corrupted ZIP file', code: 'INVALID_ZIP' }, { status: 400 });
    }

    if (files.size === 0) {
      return NextResponse.json({ error: 'ZIP file is empty', code: 'EMPTY_ZIP' }, { status: 400 });
    }

    // Check for Vite config (lenient — allow projects without it for partial migration)
    const hasViteConfig = files.has('vite.config.ts') || files.has('vite.config.js') ||
      files.has('vite.config.mts') || files.has('vite.config.mjs');

    let analysis;
    try {
      analysis = await analyzeProject(files);
    } catch (err) {
      return NextResponse.json(
        { error: 'Failed to analyze project', code: 'PARSE_ERROR', detail: String(err) },
        { status: 422 }
      );
    }

    const sessionId = uuidv4();
    createSession(sessionId, files, analysis);

    return NextResponse.json({ sessionId, analysis });
  } catch (err) {
    console.error('Analyze error:', err);
    return NextResponse.json({ error: 'Internal server error', code: 'SERVER_ERROR' }, { status: 500 });
  }
}

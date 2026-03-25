import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getSessionByToken } from '@/lib/session-store';
import { writeZip } from '@/lib/zip/writer';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const session = getSessionByToken(token);
  if (!session || !session.outputFiles) {
    return NextResponse.json({ error: 'Token invalid or expired' }, { status: 404 });
  }

  try {
    const zipBuffer = await writeZip(session.outputFiles);

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="nextjs-project.zip"',
        'Content-Length': String(zipBuffer.length),
      },
    });
  } catch (err) {
    console.error('Download error:', err);
    return NextResponse.json({ error: 'Failed to generate ZIP' }, { status: 500 });
  }
}

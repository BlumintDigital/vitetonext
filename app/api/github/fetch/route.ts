import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Validates "owner/repo" format (letters, digits, hyphens, underscores, dots)
const REPO_RE = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

export async function GET(req: NextRequest) {
  const repo = req.nextUrl.searchParams.get('repo')?.trim();
  const branch = req.nextUrl.searchParams.get('branch')?.trim() || 'HEAD';

  if (!repo || !REPO_RE.test(repo)) {
    return NextResponse.json({ error: 'Invalid repo — use "owner/repo" format' }, { status: 400 });
  }

  // GitHub archive URL: HEAD resolves to default branch automatically
  const archiveUrl = `https://github.com/${repo}/archive/${branch}.zip`;

  let res: Response;
  try {
    res = await fetch(archiveUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'ViteToNext.AI/1.0',
        Accept: 'application/zip',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to reach GitHub' }, { status: 502 });
  }

  if (res.status === 404) {
    return NextResponse.json(
      { error: `Repository "${repo}" not found or is private` },
      { status: 404 }
    );
  }

  if (!res.ok || !res.body) {
    return NextResponse.json(
      { error: `GitHub returned ${res.status}` },
      { status: 502 }
    );
  }

  const safeName = repo.replace('/', '-');

  return new Response(res.body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeName}.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}

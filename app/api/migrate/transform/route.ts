import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
import { v4 as uuidv4 } from 'uuid';
import { migrateProject } from '@/lib/migration/index';
import { getSession, setSessionOutput } from '@/lib/session-store';

export async function POST(req: NextRequest) {
  let sessionId: string;
  try {
    const body = await req.json();
    sessionId = body.sessionId;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session) {
    return new Response('Session not found or expired', { status: 404 });
  }

  // Set up Server-Sent Events stream
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const result = await migrateProject(session.files, (step) => {
          send({ type: 'step', ...step });
        }, session.analysis);

        const downloadToken = uuidv4();
        setSessionOutput(sessionId, result.outputFiles, downloadToken);

        // Send warnings
        for (const warning of result.warnings) {
          send({ type: 'warning', ...warning });
        }

        send({ type: 'complete', downloadToken, stepCount: result.steps.length });
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

import { NextResponse } from 'next/server';

function apiBase(): string | null {
  const raw = process.env.SERVER_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

export async function PUT(request: Request, context: { params: Promise<{ messageId: string }> }) {
  const base = apiBase();
  if (!base) {
    return NextResponse.json({ message: 'SERVER_URL is not configured', statusCode: 500 }, { status: 500 });
  }

  const { messageId } = await context.params;
  const bearer = request.headers.get('authorization');
  const body = await request.text();

  const res = await fetch(`${base}/api/user/chats/messages/${encodeURIComponent(messageId)}`, {
    method: 'PUT',
    headers: {
      ...(bearer ? { Authorization: bearer } : {}),
      Accept: 'application/json',
      'Content-Type': request.headers.get('content-type') ?? 'application/json',
    },
    body: body || '{}',
    cache: 'no-store',
  });

  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || 'Upstream error', statusCode: res.status };
  }
  return NextResponse.json(data, { status: res.status });
}


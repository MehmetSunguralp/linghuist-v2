import { NextResponse } from 'next/server';

function apiBase(): string | null {
  const raw = process.env.SERVER_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

export async function POST(request: Request) {
  const base = apiBase();
  if (!base) {
    return NextResponse.json({ message: 'SERVER_URL is not configured', statusCode: 500 }, { status: 500 });
  }

  const bearer = request.headers.get('authorization');
  const contentType = request.headers.get('content-type');

  const res = await fetch(`${base}/api/user/me/avatar`, {
    method: 'POST',
    headers: {
      ...(bearer ? { Authorization: bearer } : {}),
      ...(contentType ? { 'Content-Type': contentType } : {}),
      Accept: 'application/json',
    },
    duplex: 'half',
    body: request.body,
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

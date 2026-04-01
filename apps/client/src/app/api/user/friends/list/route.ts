import { NextResponse } from 'next/server';

function apiBase(): string | null {
  const raw = process.env.SERVER_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

export async function GET(request: Request) {
  const base = apiBase();
  if (!base) {
    return NextResponse.json({ message: 'SERVER_URL is not configured', statusCode: 500 }, { status: 500 });
  }

  const bearer = request.headers.get('authorization');
  const res = await fetch(`${base}/api/user/friends/list`, {
    method: 'GET',
    headers: {
      ...(bearer ? { Authorization: bearer } : {}),
      Accept: 'application/json',
    },
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

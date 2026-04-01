import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function envOrNull(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function parseStoragePath(rawPath: string): { bucket: string; objectPath: string } | null {
  const normalized = rawPath.replace(/^\/+/, '');
  const slashIndex = normalized.indexOf('/');
  if (slashIndex <= 0) return null;
  const bucket = normalized.slice(0, slashIndex);
  const objectPath = normalized.slice(slashIndex + 1);
  if (!bucket || !objectPath) return null;
  return { bucket, objectPath };
}

export async function GET(request: Request) {
  const supabaseUrl = envOrNull('SUPABASE_URL');
  const serviceRoleKey = envOrNull('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ message: 'Supabase environment is not configured' }, { status: 500 });
  }

  const requestUrl = new URL(request.url);
  const path = requestUrl.searchParams.get('path')?.trim() ?? '';
  if (!path) {
    return NextResponse.json({ message: 'path is required' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const authCheck = await supabase.auth.getUser(token);
  if (authCheck.error || !authCheck.data.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (/^https?:\/\//i.test(path)) {
    return NextResponse.json({ data: { signedUrl: path } }, { status: 200 });
  }

  const parsed = parseStoragePath(path);
  if (!parsed) {
    return NextResponse.json({ message: 'Invalid storage path' }, { status: 400 });
  }

  const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.objectPath, 60 * 60);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ message: error?.message || 'Failed to sign URL' }, { status: 500 });
  }

  return NextResponse.json({ data: { signedUrl: data.signedUrl } }, { status: 200 });
}

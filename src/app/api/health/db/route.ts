import { NextResponse } from 'next/server';
import { isPostgres } from '@/lib/pg';

/**
 * Phase 1 / Phase 2 diagnostics - GET /api/health/db
 *
 * Public endpoint. Reports Postgres runtime status with
 * enough detail for the operator to fix Vercel env config
 * without server logs.
 */
export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json({
      ok: false,
      reason: 'DATABASE_URL is not set',
      hint: 'Set DATABASE_URL on Vercel to the session-pooler conn string.',
    }, { status: 503 });
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({
      ok: false,
      reason: 'DATABASE_URL is not a parseable URL',
      value: url.slice(0, 80),
    }, { status: 503 });
  }
  const host = parsed.hostname;
  const port = parsed.port || '5432';
  if (!host) {
    return NextResponse.json({
      ok: false,
      reason: 'DATABASE_URL has no host (defaults to 127.0.0.1)',
      value: url,
      hint: 'Use the session-pooler URL: postgres://user:pass@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
    }, { status: 503 });
  }
  return NextResponse.json({
    ok: isPostgres(),
    host,
    port,
    scheme: parsed.protocol.replace(':', ''),
    db: parsed.pathname.replace(/^\//, '') || 'postgres',
  });
}

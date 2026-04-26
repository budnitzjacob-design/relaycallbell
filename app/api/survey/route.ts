import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const d = await db();
    const row = await d.get<{ version: number; schema_json: string; pushed_at: string }>(
      'SELECT version, schema_json, pushed_at FROM survey_schema ORDER BY version DESC LIMIT 1'
    );
    if (!row) return NextResponse.json({ version: 0, schema: null });
    return NextResponse.json({
      version: row.version,
      pushed_at: row.pushed_at,
      schema: JSON.parse(row.schema_json),
    });
  } catch (e: any) {
    return NextResponse.json({
      error: e?.message || String(e),
      stack: e?.stack?.split('\n').slice(0, 6),
      hasDbUrl: !!(process.env.POSTGRES_URL || process.env.DATABASE_URL),
    }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body || !body.schema) {
      return NextResponse.json({ error: 'missing schema' }, { status: 400 });
    }
    const d = await db();
    const last = await d.get<{ version: number }>(
      'SELECT version FROM survey_schema ORDER BY version DESC LIMIT 1'
    );
    const next = (last?.version || 0) + 1;
    await d.run(
      'INSERT INTO survey_schema (version, schema_json) VALUES (?, ?)',
      [next, JSON.stringify(body.schema)]
    );
    return NextResponse.json({ ok: true, version: next });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db, newId } from '@/lib/db';
import { getRequestMeta } from '@/lib/request-meta';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body || typeof body.answers !== 'object') {
    return NextResponse.json({ error: 'missing answers' }, { status: 400 });
  }
  const meta = await getRequestMeta(req);
  const d = await db();
  const last = await d.get<{ version: number }>(
    'SELECT version FROM survey_schema ORDER BY version DESC LIMIT 1'
  );
  const id = newId();
  await d.run(
    `INSERT INTO responses (id, schema_version, answers_json, ip, country, region, city, ua, device, os, browser, session_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, last?.version || 0, JSON.stringify(body.answers),
      meta.ip, meta.country, meta.region, meta.city,
      meta.ua, meta.device, meta.os, meta.browser,
      body.session_id || null,
    ]
  );
  return NextResponse.json({ ok: true, id });
}

export async function GET() {
  const d = await db();
  const rows = await d.all(
    `SELECT id, submitted_at, schema_version, answers_json, ip, country, region, city, ua, device, os, browser, session_id
     FROM responses ORDER BY submitted_at DESC LIMIT 1000`
  );
  const out = rows.map((r: any) => ({ ...r, answers: JSON.parse(r.answers_json) }));
  return NextResponse.json({ responses: out });
}

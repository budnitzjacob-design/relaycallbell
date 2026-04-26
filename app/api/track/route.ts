import { NextResponse } from 'next/server';
import { db, newId } from '@/lib/db';
import { getRequestMeta } from '@/lib/request-meta';

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const meta = await getRequestMeta(req);
  const d = await db();
  await d.run(
    `INSERT INTO events (id, event_type, path, payload_json, session_id, ip, country, region, city, ua, device, os, browser, referrer)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      newId(),
      body.event_type || 'unknown',
      body.path || null,
      body.payload ? JSON.stringify(body.payload) : null,
      body.session_id || null,
      meta.ip, meta.country, meta.region, meta.city,
      meta.ua, meta.device, meta.os, meta.browser, meta.referrer,
    ]
  );
  return NextResponse.json({ ok: true });
}

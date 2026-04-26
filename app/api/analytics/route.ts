import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '500', 10), 5000);
  const d = await db();

  const totals: any = await d.get(`SELECT COUNT(*) as c FROM events WHERE event_type = 'page_view'`);
  const uniques: any = await d.get(`SELECT COUNT(DISTINCT session_id) as c FROM events`);
  const submits: any = await d.get(`SELECT COUNT(*) as c FROM responses`);
  const clicks: any = await d.get(`SELECT COUNT(*) as c FROM events WHERE event_type LIKE 'click%'`);

  const totalViews = Number(totals?.c || 0);
  const totalSubmits = Number(submits?.c || 0);

  const events = await d.all(
    `SELECT id, ts, event_type, path, payload_json, session_id, ip, country, region, city, device, os, browser, referrer
     FROM events ORDER BY ts DESC LIMIT ?`, [limit]
  );

  // Last 30 days timeseries (page views per day)
  const series = await d.all(
    (process.env.POSTGRES_URL || process.env.DATABASE_URL)
      ? `SELECT to_char(ts::date, 'YYYY-MM-DD') as day, COUNT(*)::int as c
         FROM events WHERE event_type = 'page_view' AND ts >= NOW() - INTERVAL '30 days'
         GROUP BY ts::date ORDER BY ts::date`
      : `SELECT substr(ts, 1, 10) as day, COUNT(*) as c
         FROM events WHERE event_type = 'page_view' AND ts >= datetime('now', '-30 days')
         GROUP BY substr(ts, 1, 10) ORDER BY day`
  );

  return NextResponse.json({
    metrics: {
      total_views: totalViews,
      unique_visitors: Number(uniques?.c || 0),
      submits: totalSubmits,
      clicks: Number(clicks?.c || 0),
      conversion: totalViews > 0 ? totalSubmits / totalViews : 0,
    },
    series,
    events: events.map((e: any) => ({ ...e, payload: e.payload_json ? safeParse(e.payload_json) : null })),
  });
}

function safeParse(s: string) { try { return JSON.parse(s); } catch { return s; } }

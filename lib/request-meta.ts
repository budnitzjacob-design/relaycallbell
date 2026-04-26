import 'server-only';
import { UAParser } from 'ua-parser-js';
import { db } from './db';

export type RequestMeta = {
  ip: string | null;
  ua: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  referrer: string | null;
};

function pickIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || null;
}

async function geoLookup(ip: string | null): Promise<{ country: string | null; region: string | null; city: string | null }> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { country: 'Local', region: null, city: null };
  }
  const d = await db();
  const cached = await d.get<{ country: string; region: string; city: string }>(
    'SELECT country, region, city FROM ip_geo WHERE ip = ?', [ip]
  );
  if (cached) return cached;
  try {
    const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!r.ok) return { country: null, region: null, city: null };
    const j = await r.json();
    if (j.status !== 'success') return { country: null, region: null, city: null };
    const out = { country: j.country || null, region: j.regionName || null, city: j.city || null };
    await d.run('INSERT OR REPLACE INTO ip_geo (ip, country, region, city) VALUES (?, ?, ?, ?)',
      [ip, out.country, out.region, out.city]).catch(() => {});
    return out;
  } catch {
    return { country: null, region: null, city: null };
  }
}

export async function getRequestMeta(req: Request): Promise<RequestMeta> {
  const ip = pickIp(req);
  const ua = req.headers.get('user-agent');
  const referrer = req.headers.get('referer');
  let device: string | null = null, os: string | null = null, browser: string | null = null;
  if (ua) {
    const r = new UAParser(ua).getResult();
    device = r.device.type || 'desktop';
    os = [r.os.name, r.os.version].filter(Boolean).join(' ') || null;
    browser = [r.browser.name, r.browser.version].filter(Boolean).join(' ') || null;
  }
  const geo = await geoLookup(ip);
  return { ip, ua, device, os, browser, ...geo, referrer };
}

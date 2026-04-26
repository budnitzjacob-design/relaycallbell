'use client';
import { useEffect, useMemo, useState } from 'react';

type Resp = {
  id: string; submitted_at: string; schema_version: number;
  answers: Record<string, any>; answers_json?: string;
  ip: string | null; country: string | null; region: string | null; city: string | null;
  ua: string | null; device: string | null; os: string | null; browser: string | null;
  session_id: string | null;
};

type SortKey = 'submitted_at' | 'org' | 'email' | 'ip' | 'country' | 'completed';

export default function Signals() {
  const [rows, setRows] = useState<Resp[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('submitted_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [detail, setDetail] = useState<Resp | null>(null);

  const refresh = async () => {
    const r = await fetch('/api/responses', { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      setRows(j.responses);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  const enriched = useMemo(() => rows.map(r => {
    const a = r.answers || {};
    const org = pick(a, ['q_org', 'organization', 'org_name', 'organization_name']);
    const email = pick(a, ['q_email', 'email', 'work_email']);
    const completed = Object.values(a).filter(v => v !== '' && v != null && !(Array.isArray(v) && v.length === 0)).length;
    return { ...r, _org: org, _email: email, _completed: completed };
  }), [rows]);

  const sorted = useMemo(() => {
    const arr = [...enriched];
    arr.sort((a: any, b: any) => {
      const map: any = { submitted_at: 'submitted_at', ip: 'ip', country: 'country',
        org: '_org', email: '_email', completed: '_completed' };
      const k = map[sortKey];
      const x = (a[k] || '').toString().toLowerCase();
      const y = (b[k] || '').toString().toLowerCase();
      if (x < y) return sortDir === 'asc' ? -1 : 1;
      if (x > y) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [enriched, sortKey, sortDir]);

  const flip = (k: SortKey) => {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };
  const arrow = (k: SortKey) => sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '·';

  const exportCsv = () => {
    if (rows.length === 0) return;
    const allKeys = Array.from(new Set(rows.flatMap(r => Object.keys(r.answers || {}))));
    const head = ['id', 'submitted_at', 'ip', 'country', 'region', 'city', 'device', 'os', 'browser', ...allKeys];
    const csv = [head.join(',')];
    for (const r of rows) {
      const row = [r.id, r.submitted_at, r.ip, r.country, r.region, r.city, r.device, r.os, r.browser,
        ...allKeys.map(k => csvEscape(r.answers?.[k]))];
      csv.push(row.map(v => csvEscape(v)).join(','));
    }
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `relay-responses-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <section>
      <div className="head">
        <h1>SIGNALS</h1>
        <div className="meta">{rows.length} submitted application{rows.length === 1 ? '' : 's'}</div>
        <button className="export" onClick={exportCsv} disabled={rows.length === 0}>EXPORT · CSV</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th onClick={() => flip('submitted_at')}>SUBMITTED {arrow('submitted_at')}</th>
              <th onClick={() => flip('org')}>ORGANIZATION {arrow('org')}</th>
              <th onClick={() => flip('email')}>EMAIL {arrow('email')}</th>
              <th onClick={() => flip('completed')}>FIELDS {arrow('completed')}</th>
              <th onClick={() => flip('ip')}>IP {arrow('ip')}</th>
              <th onClick={() => flip('country')}>GEO {arrow('country')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r: any) => (
              <tr key={r.id} onClick={() => setDetail(r)}>
                <td>{fmtTs(r.submitted_at)}</td>
                <td>{r._org || '—'}</td>
                <td>{r._email || '—'}</td>
                <td>{r._completed}</td>
                <td>{r.ip || '—'}</td>
                <td>{[r.city, r.region, r.country].filter(Boolean).join(', ') || '—'}</td>
              </tr>
            ))}
            {sorted.length === 0 && <tr><td colSpan={6} className="empty-row">no responses yet</td></tr>}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="drawer" onClick={() => setDetail(null)}>
          <div className="drawer-card" onClick={e => e.stopPropagation()}>
            <div className="dh">
              <span>RESPONSE · {detail.id.slice(0, 8)}</span>
              <button onClick={() => setDetail(null)}>×</button>
            </div>
            <div className="dbody">
              <h3>METADATA</h3>
              <dl>
                <dt>submitted</dt><dd>{fmtTs(detail.submitted_at)}</dd>
                <dt>schema version</dt><dd>{detail.schema_version}</dd>
                <dt>ip</dt><dd>{detail.ip || '—'}</dd>
                <dt>geo</dt><dd>{[detail.city, detail.region, detail.country].filter(Boolean).join(', ') || '—'}</dd>
                <dt>device</dt><dd>{detail.device || '—'}</dd>
                <dt>os / browser</dt><dd>{[detail.os, detail.browser].filter(Boolean).join(' · ') || '—'}</dd>
                <dt>session</dt><dd>{detail.session_id || '—'}</dd>
              </dl>
              <h3>ANSWERS</h3>
              <dl>
                {Object.entries(detail.answers || {}).map(([k, v]) => (
                  <div key={k} className="qa">
                    <dt>{k}</dt>
                    <dd>{Array.isArray(v) ? v.join(', ') : String(v ?? '—')}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .head { display: flex; align-items: baseline; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
        h1 {
          font-family: var(--font-garamond), serif;
          font-size: clamp(64px, 10vw, 128px);
          margin: 0;
          line-height: 0.85;
          font-weight: 500;
          letter-spacing: -0.04em;
          color: #fff;
        }
        .meta { font-size: 11px; letter-spacing: 0.3em; opacity: 0.7; }
        .export {
          margin-left: auto;
          background: transparent;
          color: #f5f0e6;
          border: 1px solid #ff5a1f;
          padding: 10px 18px;
          font: inherit;
          letter-spacing: 0.3em;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 200ms ease, color 200ms ease;
        }
        .export:hover:not([disabled]) { background: #ff5a1f; color: #000; }
        .export[disabled] { opacity: 0.4; }

        .table-wrap { overflow-x: auto; border-top: 1px solid rgba(245,240,230,0.12); }
        table { width: 100%; border-collapse: collapse; font-size: 12px; font-family: var(--font-mono), monospace; }
        th, td { text-align: left; padding: 12px 14px; border-bottom: 1px solid rgba(245,240,230,0.06); }
        th { cursor: pointer; user-select: none; letter-spacing: 0.2em; font-size: 10px; opacity: 0.75; font-weight: 700; }
        th:hover { color: #ff5a1f; }
        tbody tr:hover { background: rgba(255,90,31,0.05); cursor: pointer; }
        .empty-row { text-align: center; padding: 60px !important; opacity: 0.4; letter-spacing: 0.3em; }

        .drawer { position: fixed; inset: 0; background: rgba(0,0,0,0.78); display: grid; place-items: center; z-index: 100; padding: 24px; }
        .drawer-card { width: min(800px, 100%); max-height: 86vh; overflow: auto; background: #0a0a0a; border: 1px solid rgba(245,240,230,0.18); }
        .dh { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid rgba(245,240,230,0.12); letter-spacing: 0.2em; font-size: 12px; position: sticky; top: 0; background: #0a0a0a; }
        .dh button { background: transparent; color: #f5f0e6; border: none; font-size: 24px; cursor: pointer; line-height: 1; }
        .dbody { padding: 24px; font-size: 13px; }
        h3 { font-family: var(--font-mono), monospace; font-size: 10px; letter-spacing: 0.32em; opacity: 0.6; margin: 32px 0 12px; font-weight: 700; }
        h3:first-of-type { margin-top: 0; }
        dl { margin: 0; }
        dt { font-size: 10px; letter-spacing: 0.18em; opacity: 0.55; margin-top: 12px; font-family: var(--font-mono), monospace; }
        dd { margin: 4px 0 0; font-family: var(--font-garamond), serif; font-size: 1.05rem; line-height: 1.4; color: #fff; }
        .qa { padding: 10px 0; border-bottom: 1px solid rgba(245,240,230,0.06); }
      `}</style>
    </section>
  );
}

function pick(obj: Record<string, any>, keys: string[]) {
  for (const k of keys) {
    if (obj?.[k]) return String(obj[k]);
  }
  return '';
}

function csvEscape(v: any) {
  if (v == null) return '';
  const s = Array.isArray(v) ? v.join('; ') : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmtTs(s: string) {
  try {
    const d = new Date(s.includes('T') || s.includes('Z') ? s : s.replace(' ', 'T') + 'Z');
    return d.toISOString().replace('T', ' ').slice(0, 19);
  } catch { return s; }
}

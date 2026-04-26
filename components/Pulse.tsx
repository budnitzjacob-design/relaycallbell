'use client';
import { useEffect, useMemo, useState } from 'react';

type Metrics = { total_views: number; unique_visitors: number; submits: number; clicks: number; conversion: number };
type Event = {
  id: string; ts: string; event_type: string; path: string | null;
  payload: any; session_id: string | null;
  ip: string | null; country: string | null; region: string | null; city: string | null;
  device: string | null; os: string | null; browser: string | null; referrer: string | null;
};

type SortKey = 'ts' | 'event_type' | 'path' | 'ip' | 'country' | 'device' | 'os' | 'browser';

export default function Pulse() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [series, setSeries] = useState<{ day: string; c: number }[]>([]);
  const [filter, setFilter] = useState({ path: '', event: '', country: '' });
  const [sortKey, setSortKey] = useState<SortKey>('ts');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [detail, setDetail] = useState<Event | null>(null);

  const refresh = async () => {
    const r = await fetch('/api/analytics?limit=1000', { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      setMetrics(j.metrics);
      setEvents(j.events);
      setSeries(j.series.map((s: any) => ({ day: s.day, c: Number(s.c) })));
    }
  };
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (filter.path && !(e.path || '').includes(filter.path)) return false;
      if (filter.event && !(e.event_type || '').includes(filter.event)) return false;
      if (filter.country && !(e.country || '').toLowerCase().includes(filter.country.toLowerCase())) return false;
      return true;
    });
  }, [events, filter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a: any, b: any) => {
      const x = (a[sortKey] || '').toString().toLowerCase();
      const y = (b[sortKey] || '').toString().toLowerCase();
      if (x < y) return sortDir === 'asc' ? -1 : 1;
      if (x > y) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const flip = (k: SortKey) => {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };
  const arrow = (k: SortKey) => sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '·';

  const max = Math.max(1, ...series.map(s => s.c));

  return (
    <section>
      <div className="hero">
        <Tile label="VIEWS" v={metrics?.total_views ?? 0} />
        <Tile label="UNIQUES" v={metrics?.unique_visitors ?? 0} />
        <Tile label="SUBMITS" v={metrics?.submits ?? 0} />
        <Tile label="CLICKS" v={metrics?.clicks ?? 0} />
      </div>

      <div className="series">
        <div className="series-head">
          <span>VIEWS / DAY · LAST 30</span>
          <span className="rule" />
        </div>
        <div className="bars">
          {series.length === 0 && <span className="empty">no signal yet</span>}
          {series.map(s => (
            <div key={s.day} className="bar-wrap" title={`${s.day} · ${s.c}`}>
              <div className="bar" style={{ height: `${(s.c / max) * 100}%` }} />
              <span className="day">{s.day.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="filter">
        <input placeholder="path contains…"   value={filter.path}    onChange={e => setFilter(f => ({ ...f, path: e.target.value }))} />
        <input placeholder="event contains…"  value={filter.event}   onChange={e => setFilter(f => ({ ...f, event: e.target.value }))} />
        <input placeholder="country contains…" value={filter.country} onChange={e => setFilter(f => ({ ...f, country: e.target.value }))} />
        <span className="count">{sorted.length} / {events.length}</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th onClick={() => flip('ts')}>TIMESTAMP {arrow('ts')}</th>
              <th onClick={() => flip('event_type')}>EVENT {arrow('event_type')}</th>
              <th onClick={() => flip('path')}>PATH {arrow('path')}</th>
              <th onClick={() => flip('ip')}>IP {arrow('ip')}</th>
              <th onClick={() => flip('country')}>GEO {arrow('country')}</th>
              <th onClick={() => flip('device')}>DEVICE {arrow('device')}</th>
              <th onClick={() => flip('os')}>OS {arrow('os')}</th>
              <th onClick={() => flip('browser')}>BROWSER {arrow('browser')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(e => (
              <tr key={e.id} onClick={() => setDetail(e)}>
                <td>{fmtTs(e.ts)}</td>
                <td className="t">{e.event_type}</td>
                <td>{e.path || '—'}</td>
                <td>{e.ip || '—'}</td>
                <td>{[e.city, e.region, e.country].filter(Boolean).join(', ') || '—'}</td>
                <td>{e.device || '—'}</td>
                <td>{e.os || '—'}</td>
                <td>{e.browser || '—'}</td>
              </tr>
            ))}
            {sorted.length === 0 && <tr><td colSpan={8} className="empty-row">no events match</td></tr>}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="drawer" onClick={() => setDetail(null)}>
          <div className="drawer-card" onClick={e => e.stopPropagation()}>
            <div className="dh">
              <span>EVENT · {detail.event_type.toUpperCase()}</span>
              <button onClick={() => setDetail(null)}>×</button>
            </div>
            <pre>{JSON.stringify(detail, null, 2)}</pre>
          </div>
        </div>
      )}

      <style jsx>{`
        .hero { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-top: 1px solid rgba(245,240,230,0.12); border-bottom: 1px solid rgba(245,240,230,0.12); }
        @media (max-width: 800px) { .hero { grid-template-columns: repeat(2, 1fr); } }

        .series { margin: 64px 0 24px; }
        .series-head { display: flex; align-items: center; gap: 18px; font-size: 11px; letter-spacing: 0.3em; opacity: 0.7; }
        .rule { flex: 1; height: 1px; background: rgba(245,240,230,0.18); }
        .bars { display: flex; gap: 4px; align-items: flex-end; height: 160px; margin-top: 14px; padding: 0 4px; }
        .bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; }
        .bar { width: 100%; background: #ff5a1f; min-height: 1px; }
        .day { font-size: 9px; opacity: 0.5; letter-spacing: 0.1em; }
        .empty { opacity: 0.5; font-size: 12px; letter-spacing: 0.3em; }

        .filter { display: flex; gap: 8px; align-items: center; margin: 36px 0 14px; flex-wrap: wrap; }
        .filter input {
          background: transparent;
          color: #f5f0e6;
          border: 1px solid rgba(245,240,230,0.2);
          padding: 8px 12px;
          font: inherit;
          font-size: 16px; /* prevent iOS zoom on focus */
          letter-spacing: 0.06em;
          min-width: 200px;
          flex: 1 1 200px;
        }
        @media (max-width: 640px) {
          .filter { gap: 6px; }
          .filter input { min-width: 0; flex-basis: 140px; padding: 8px 10px; }
          .count { width: 100%; margin-left: 0; }
          .bars { height: 110px; gap: 2px; }
          .day { display: none; }
          th, td { padding: 8px 10px; font-size: 11px; }
        }
        .filter input:focus { outline: none; border-color: #ff5a1f; }
        .count { margin-left: auto; font-size: 11px; opacity: 0.6; letter-spacing: 0.2em; }

        .table-wrap { overflow-x: auto; border-top: 1px solid rgba(245,240,230,0.12); }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid rgba(245,240,230,0.06); white-space: nowrap; }
        th { user-select: none; cursor: pointer; font-weight: 700; letter-spacing: 0.18em; font-size: 10px; opacity: 0.75; }
        th:hover { color: #ff5a1f; }
        td.t { color: #ff5a1f; letter-spacing: 0.05em; }
        tbody tr:hover { background: rgba(255,90,31,0.05); cursor: pointer; }
        .empty-row { text-align: center; padding: 40px !important; opacity: 0.4; letter-spacing: 0.3em; }

        .drawer { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: grid; place-items: center; z-index: 100; padding: 24px; }
        .drawer-card { width: min(720px, 100%); max-height: 80vh; overflow: auto; background: #0a0a0a; border: 1px solid rgba(245,240,230,0.18); }
        .dh { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid rgba(245,240,230,0.12); letter-spacing: 0.2em; font-size: 12px; }
        .dh button { background: transparent; color: #f5f0e6; border: none; font-size: 24px; cursor: pointer; line-height: 1; }
        .drawer-card pre { padding: 24px; margin: 0; font-size: 12px; line-height: 1.6; color: #f5f0e6; white-space: pre-wrap; word-break: break-word; }
      `}</style>
    </section>
  );
}

function Tile({ label, v }: { label: string; v: number }) {
  return (
    <div className="tile">
      <span className="t-label">{label}</span>
      <span className="t-val">{v.toLocaleString()}</span>
      <style jsx>{`
        .tile {
          display: flex; flex-direction: column;
          padding: 32px 24px;
          border-right: 1px solid rgba(245,240,230,0.12);
          min-width: 0;
        }
        .tile:last-child { border-right: none; }
        .t-label { font-size: 10px; letter-spacing: 0.32em; opacity: 0.6; margin-bottom: 12px; }
        .t-val {
          font-family: var(--font-garamond), serif;
          font-size: clamp(36px, 6vw, 96px);
          line-height: 0.9;
          font-weight: 500;
          color: #fff;
          letter-spacing: -0.04em;
          word-break: break-all;
        }
        @media (max-width: 640px) {
          .tile { padding: 22px 14px; }
          .t-label { font-size: 9px; letter-spacing: 0.24em; margin-bottom: 8px; }
          .t-val { font-size: clamp(28px, 9vw, 44px); }
          .tile:nth-child(2) { border-right: none; }
        }
      `}</style>
    </div>
  );
}

function fmtTs(s: string) {
  try {
    const d = new Date(s.includes('T') || s.includes('Z') ? s : s.replace(' ', 'T') + 'Z');
    return d.toISOString().replace('T', ' ').slice(0, 19);
  } catch { return s; }
}

'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/admin';
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    if (r.ok) { router.replace(next); }
    else { setErr('WRONG.'); setBusy(false); }
  }

  return (
    <main className="root theme-admin">
      <div className="ascii top" aria-hidden>{'/////////////////////////////////////////////////////'}</div>
      <div className="card">
        <div className="meta">RELAY · ADMIN · v0</div>
        <h1>ENTER</h1>
        <form onSubmit={submit}>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="password"
            autoFocus
            autoComplete="current-password"
          />
          <button type="submit" disabled={busy}>{busy ? '…' : 'OPEN'}</button>
        </form>
        {err && <p className="err">{err}</p>}
      </div>
      <div className="ascii bot" aria-hidden>{'/////////////////////////////////////////////////////'}</div>

      <style jsx>{`
        .root {
          min-height: 100dvh;
          background: #0a0a0a;
          color: #f5f0e6;
          display: grid;
          place-items: center;
          font-family: var(--font-mono), ui-monospace, monospace;
          padding: 24px;
        }
        .ascii { color: #ff5a1f; opacity: 0.4; font-size: 12px; letter-spacing: 0.3em; user-select: none; }
        .top { position: fixed; top: 24px; left: 0; right: 0; text-align: center; }
        .bot { position: fixed; bottom: 24px; left: 0; right: 0; text-align: center; }
        .card {
          width: min(440px, 92vw);
          padding: 0;
        }
        .meta {
          font-size: 11px;
          letter-spacing: 0.3em;
          opacity: 0.55;
          margin-bottom: 24px;
        }
        h1 {
          font-family: var(--font-garamond), serif;
          font-size: clamp(72px, 12vw, 144px);
          font-weight: 500;
          margin: 0 0 32px;
          line-height: 0.85;
          letter-spacing: -0.04em;
          color: #fff;
        }
        form { display: flex; flex-direction: column; gap: 16px; }
        input {
          background: transparent;
          color: #fff;
          border: none;
          border-bottom: 1px solid #f5f0e6;
          padding: 14px 0;
          font: inherit;
          font-size: 1.1rem;
          letter-spacing: 0.1em;
        }
        input:focus { outline: none; border-bottom-color: #ff5a1f; }
        button {
          background: #ff5a1f;
          color: #000;
          border: none;
          padding: 14px;
          font: inherit;
          font-weight: 700;
          letter-spacing: 0.3em;
          cursor: pointer;
          transition: background-color 200ms ease;
        }
        button:hover { background: #fff; }
        button[disabled] { opacity: 0.5; }
        .err {
          margin-top: 14px;
          color: #ff5a1f;
          letter-spacing: 0.3em;
          font-size: 0.85rem;
        }
      `}</style>
    </main>
  );
}

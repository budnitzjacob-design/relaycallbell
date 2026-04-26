'use client';

import { useState } from 'react';
import { track } from '@/lib/tracker';

export type Question = {
  id: string;
  type: 'short_text' | 'long_text' | 'email' | 'phone' | 'number' | 'single_choice' | 'multi_choice' | 'dropdown' | 'date' | 'section';
  label: string;
  help?: string;
  required?: boolean;
  choices?: string[];
};

export type Schema = { title: string; intro?: string; questions: Question[]; };

export default function AppForm({ schema, version }: { schema: Schema; version: number }) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setVal = (id: string, v: any) => setAnswers(prev => ({ ...prev, [id]: v }));

  async function submit() {
    setError(null);
    for (const q of schema.questions) {
      if (q.required && q.type !== 'section') {
        const v = answers[q.id];
        const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
        if (empty) { setError(`required: ${q.label}`); return; }
      }
    }
    setSubmitting(true);
    track('form_submit', { schema_version: version });
    try {
      const r = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers, schema_version: version }),
      });
      if (!r.ok) throw new Error('submit failed');
      setDone(true);
    } catch (e: any) {
      setError(e?.message || 'submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="root">
      <div className="bar">
        <div className="brand">
          <span className="bdot" />
          <span>RELAY · CLINICAL PILOT</span>
        </div>
        <a href="/" className="back">BACK · HOME</a>
      </div>

      <div className={`wrap ${done ? 'fade-out' : ''}`}>
        <div className="meta">APPLICATION · v{version}</div>
        <h1>{schema.title || 'Clinical Pilot'}</h1>
        {schema.intro && <p className="intro">{schema.intro}</p>}

        <div className="rule" />

        <SubmitButton onClick={submit} busy={submitting} />

        <div className="questions">
          {schema.questions.map((q, i) => (
            <Field key={q.id} q={q} index={i} value={answers[q.id]} onChange={(v) => setVal(q.id, v)} />
          ))}
        </div>

        {error && <div className="err">{error}</div>}

        <SubmitButton onClick={submit} busy={submitting} />

        <div className="meta footer">END · {schema.questions.length} FIELD{schema.questions.length === 1 ? '' : 'S'}</div>
      </div>

      {done && (
        <div className="thanks">
          <div className="thanks-bar"><span className="bdot" /><span>RELAY · TRANSMISSION RECEIVED</span></div>
          <div className="thanks-inner">
            <div className="thanks-meta">CONFIRMED</div>
            <p>Thank you for your interest. We will be in touch shortly.</p>
            <div className="rule wide" />
          </div>
        </div>
      )}

      <style jsx>{`
        .root {
          min-height: 100dvh;
          color: #e8eef7;
          font-family: var(--font-mono), ui-monospace, monospace;
          background: #000;
          position: relative;
          overflow-x: hidden;
        }
        .bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 28px;
          border-bottom: 1px solid rgba(160,180,220,0.12);
          position: sticky; top: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          z-index: 50;
        }
        .brand { display: flex; align-items: center; gap: 12px; font-size: 11px; letter-spacing: 0.32em; color: #cbd6ec; }
        .bdot {
          width: 11px; height: 11px; border-radius: 50%;
          background:
            radial-gradient(circle at 35% 28%, #6a8cff 0%, #2a4cb0 38%, #0a1838 78%, #050a1f 100%);
          box-shadow:
            inset 0 1px 1px rgba(255,255,255,0.35),
            inset 0 -1px 1px rgba(0,0,0,0.5),
            0 0 14px rgba(60, 100, 220, 0.45);
        }
        .back {
          text-decoration: none; color: #e8eef7;
          border: 1px solid rgba(160,180,220,0.28);
          padding: 8px 18px; border-radius: 4px;
          font: inherit; font-size: 11px; letter-spacing: 0.32em; font-weight: 700;
          background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.18));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.12),
            inset 0 -1px 0 rgba(0,0,0,0.3),
            0 4px 10px rgba(0,0,0,0.35);
          transition: all 220ms ease;
        }
        .back:hover {
          color: #fff;
          border-color: #6a8cff;
          background: linear-gradient(180deg, rgba(106, 140, 255, 0.18), rgba(15, 29, 61, 0.4));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.18),
            0 6px 14px rgba(15, 29, 61, 0.6);
        }

        .wrap {
          position: relative; z-index: 1;
          max-width: 760px;
          margin: 0 auto;
          padding: 72px 28px 120px;
          transition: opacity 700ms ease;
        }
        .wrap.fade-out { opacity: 0; pointer-events: none; }

        .meta { font-size: 10px; letter-spacing: 0.32em; color: #6a8cff; opacity: 0.85; margin-bottom: 24px; font-weight: 700; }
        .meta.footer { margin-top: 56px; margin-bottom: 0; opacity: 0.55; }

        h1 {
          font-family: var(--font-inter), 'Inter', -apple-system, system-ui, sans-serif;
          font-size: clamp(48px, 7.5vw, 96px);
          font-weight: 600;
          margin: 0 0 32px;
          line-height: 0.96;
          letter-spacing: -0.035em;
          color: #fff;
        }
        .intro {
          font-family: var(--font-mono), ui-monospace, monospace;
          font-size: clamp(14px, 1.1vw, 15px);
          line-height: 1.65;
          letter-spacing: 0.01em;
          margin: 0 0 48px;
          color: #b6c4dd;
          max-width: 60ch;
        }
        .rule { height: 1px; background: linear-gradient(90deg, rgba(106,140,255,0), rgba(106,140,255,0.45) 35%, rgba(106,140,255,0.45) 65%, rgba(106,140,255,0)); margin: 0 0 56px; }

        .questions { display: flex; flex-direction: column; gap: 64px; padding: 16px 0; }

        .err {
          margin-top: 24px;
          padding: 14px 18px;
          background: linear-gradient(180deg, rgba(106,140,255,0.10), rgba(15,29,61,0.30));
          border-left: 2px solid #6a8cff;
          color: #e8eef7;
          font-size: 11px;
          letter-spacing: 0.28em;
          font-weight: 700;
        }

        .thanks {
          position: fixed; inset: 0;
          z-index: 100;
          display: flex; flex-direction: column;
          opacity: 0;
          background: #000;
          animation: fade-in 1100ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .thanks-bar {
          display: flex; align-items: center; gap: 12px;
          padding: 18px 28px;
          border-bottom: 1px solid rgba(160,180,220,0.12);
          font-size: 11px; letter-spacing: 0.32em;
          color: #cbd6ec;
        }
        .thanks-inner {
          flex: 1;
          display: flex; flex-direction: column; justify-content: center;
          padding: 0 max(28px, 6vw);
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
        }
        .thanks-meta { font-size: 10px; letter-spacing: 0.32em; color: #6a8cff; margin-bottom: 24px; font-weight: 700; }
        .thanks-inner p {
          font-family: var(--font-inter), 'Inter', -apple-system, system-ui, sans-serif;
          font-size: clamp(32px, 5.6vw, 72px);
          font-weight: 600;
          color: #fff;
          line-height: 1.05;
          letter-spacing: -0.025em;
          margin: 0 0 48px;
          max-width: 18ch;
        }
        .rule.wide { height: 1px; background: linear-gradient(90deg, rgba(106,140,255,0), rgba(106,140,255,0.6) 50%, rgba(106,140,255,0)); }
        @keyframes fade-in { to { opacity: 1; } }

        @media (max-width: 520px) {
          .wrap { padding: 56px 22px 96px; }
          .questions { gap: 52px; }
          .intro { font-size: 14px; line-height: 1.6; }
        }
      `}</style>
    </main>
  );
}

/** Submit button: black/white outline → white on hover → green on click. */
function SubmitButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button className="submit" onClick={onClick} disabled={busy} type="button">
      {busy ? 'SENDING…' : 'SUBMIT'}
      <style jsx>{`
        .submit {
          display: block;
          width: 100%;
          height: 56px;
          margin: 40px 0;
          padding: 0;
          font: inherit;
          font-family: var(--font-mono), ui-monospace, monospace;
          font-weight: 700;
          letter-spacing: 0.36em;
          font-size: 13px;
          color: #fff;
          background: #000;
          border: 1px solid #fff;
          border-radius: 0;
          cursor: pointer;
          transition: background-color 180ms ease, color 180ms ease, border-color 180ms ease;
        }
        .submit:hover:not([disabled]) {
          background: #fff;
          color: #000;
        }
        .submit:active:not([disabled]) {
          background: #16a34a;
          color: #fff;
          border-color: #16a34a;
        }
        .submit[disabled] { opacity: 0.55; cursor: wait; }
      `}</style>
    </button>
  );
}

function Field({ q, index, value, onChange }: { q: Question; index: number; value: any; onChange: (v: any) => void }) {
  const onFocus = () => track('form_focus', { id: q.id });
  if (q.type === 'section') {
    return (
      <div className="section">
        <div className="rule" />
        <h2>{q.label}</h2>
        {q.help && <p>{q.help}</p>}
        <style jsx>{`
          .section { margin-top: 14px; }
          .rule { height: 1px; background: linear-gradient(90deg, rgba(106,140,255,0), rgba(106,140,255,0.45) 50%, rgba(106,140,255,0)); margin-bottom: 22px; }
          h2 {
            font-family: var(--font-inter), 'Inter', -apple-system, system-ui, sans-serif;
            font-size: clamp(24px, 2.8vw, 32px);
            font-weight: 600;
            margin: 0 0 8px;
            letter-spacing: -0.02em;
            color: #fff;
          }
          p {
            margin: 0; color: #b6c4dd;
            font-family: var(--font-mono), monospace;
            font-size: 0.85rem; line-height: 1.6; letter-spacing: 0.04em;
          }
        `}</style>
      </div>
    );
  }
  const ix = String(index + 1).padStart(2, '0');
  return (
    <div className="field">
      <div className="head">
        <span className="ix">{ix}</span>
        <span className="ty">{q.type.replace('_', ' ').toUpperCase()}{q.required && ' · REQUIRED'}</span>
      </div>
      <div className="ql">{q.label}</div>
      {q.help && <div className="qh">{q.help}</div>}
      <div className="input-wrap">
        <Input q={q} value={value} onChange={onChange} onFocus={onFocus} />
      </div>
      <style jsx>{`
        .field { display: flex; flex-direction: column; gap: 14px; }
        .head { display: flex; align-items: center; gap: 14px; font-size: 10px; letter-spacing: 0.28em; margin-bottom: 2px; }
        .ix { color: #6a8cff; font-weight: 700; }
        .ty { color: #8a9bbf; font-weight: 700; }
        .ql {
          font-family: var(--font-mono), ui-monospace, monospace;
          font-size: clamp(15px, 1.4vw, 17px);
          font-weight: 500;
          letter-spacing: 0.01em;
          color: #fff;
          line-height: 1.4;
        }
        .qh {
          font-family: var(--font-mono), monospace;
          font-size: 0.82rem;
          line-height: 1.55;
          color: #97a4c2;
          letter-spacing: 0.02em;
          margin-top: -4px;
        }
        .input-wrap { margin-top: 8px; }
      `}</style>
    </div>
  );
}

function Input({ q, value, onChange, onFocus }: { q: Question; value: any; onChange: (v: any) => void; onFocus: () => void }) {
  const cls = 'fld';
  const styleTag = (
    <style jsx>{`
      .fld {
        width: 100%;
        background: linear-gradient(180deg, rgba(15,29,61,0.32), rgba(5,10,31,0.45));
        color: #fff;
        border: 1px solid rgba(140,170,230,0.18);
        border-radius: 4px;
        padding: 14px 14px;
        font: inherit;
        font-family: var(--font-mono), ui-monospace, monospace;
        font-size: 16px; /* prevent iOS zoom on focus */
        letter-spacing: 0.01em;
        box-shadow:
          inset 0 1px 0 rgba(0,0,0,0.45),
          inset 0 0 0 1px rgba(120,160,255,0.05),
          0 1px 0 rgba(255,255,255,0.04);
        transition: border-color 200ms ease, background 200ms ease, box-shadow 200ms ease;
      }
      .fld:focus {
        outline: none;
        border-color: #6a8cff;
        background: linear-gradient(180deg, rgba(15,29,61,0.45), rgba(5,10,31,0.55));
        box-shadow:
          inset 0 1px 0 rgba(0,0,0,0.5),
          inset 0 0 0 1px rgba(106,140,255,0.35),
          0 0 0 3px rgba(106,140,255,0.12),
          0 8px 22px rgba(10,22,50,0.45);
      }
      textarea.fld { min-height: 120px; resize: vertical; line-height: 1.55; }
      select.fld {
        appearance: none; -webkit-appearance: none;
        background-image:
          linear-gradient(180deg, rgba(15,29,61,0.32), rgba(5,10,31,0.45)),
          linear-gradient(45deg, transparent 50%, #cbd6ec 50%),
          linear-gradient(135deg, #cbd6ec 50%, transparent 50%);
        background-position: 0 0, calc(100% - 14px) center, calc(100% - 8px) center;
        background-size: auto, 6px 6px, 6px 6px;
        background-repeat: no-repeat;
        padding-right: 28px;
      }
      .choices { display: flex; flex-direction: column; gap: 4px; padding-top: 6px; }
      .choices label {
        display: flex; align-items: center; gap: 18px; cursor: pointer;
        padding: 18px 0;
        border-bottom: 1px solid rgba(160,180,220,0.10);
        font-family: var(--font-mono), ui-monospace, monospace;
        font-size: 0.95rem;
        color: #cbd6ec;
        letter-spacing: 0.02em;
        transition: padding 180ms ease, color 180ms ease;
      }
      .choices label:hover { padding-left: 8px; color: #fff; }
      .choices label:hover .marker { border-color: #6a8cff; }
      .choices input { display: none; }
      .marker {
        width: 16px; height: 16px;
        border: 1px solid rgba(140,170,230,0.55);
        flex-shrink: 0;
        background: linear-gradient(180deg, rgba(15,29,61,0.4), rgba(5,10,31,0.5));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
        transition: all 180ms ease;
      }
      .marker.radio { border-radius: 50%; }
      .marker.on {
        background:
          radial-gradient(circle at 35% 28%, #8aaaff 0%, #2a4cb0 45%, #0f1d3d 100%);
        border-color: #6a8cff;
        box-shadow:
          inset 0 1px 1px rgba(255,255,255,0.4),
          0 0 10px rgba(106,140,255,0.45);
      }
    `}</style>
  );
  switch (q.type) {
    case 'short_text':
      return (<><input className={cls} type="text" value={value || ''} onChange={e => onChange(e.target.value)} onFocus={onFocus} />{styleTag}</>);
    case 'long_text':
      return (<><textarea className={cls} value={value || ''} onChange={e => onChange(e.target.value)} onFocus={onFocus} />{styleTag}</>);
    case 'email':
      return (<><input className={cls} type="email" value={value || ''} onChange={e => onChange(e.target.value)} onFocus={onFocus} />{styleTag}</>);
    case 'phone':
      return (<><input className={cls} type="tel" value={value || ''} onChange={e => onChange(e.target.value)} onFocus={onFocus} />{styleTag}</>);
    case 'number':
      return (<><input className={cls} type="number" value={value ?? ''} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} onFocus={onFocus} />{styleTag}</>);
    case 'date':
      return (<><input className={cls} type="date" value={value || ''} onChange={e => onChange(e.target.value)} onFocus={onFocus} />{styleTag}</>);
    case 'dropdown':
      return (
        <>
          <select className={cls} value={value || ''} onChange={e => onChange(e.target.value)} onFocus={onFocus}>
            <option value="">— select —</option>
            {(q.choices || []).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {styleTag}
        </>
      );
    case 'single_choice':
      return (
        <>
          <div className="choices" onFocus={onFocus}>
            {(q.choices || []).map(c => (
              <label key={c}>
                <input type="radio" name={q.id} checked={value === c} onChange={() => onChange(c)} />
                <span className={`marker radio ${value === c ? 'on' : ''}`} />
                <span>{c}</span>
              </label>
            ))}
          </div>
          {styleTag}
        </>
      );
    case 'multi_choice':
      return (
        <>
          <div className="choices" onFocus={onFocus}>
            {(q.choices || []).map(c => {
              const arr: string[] = Array.isArray(value) ? value : [];
              const checked = arr.includes(c);
              return (
                <label key={c}>
                  <input type="checkbox" checked={checked} onChange={() => {
                    const next = checked ? arr.filter(x => x !== c) : [...arr, c];
                    onChange(next);
                  }} />
                  <span className={`marker ${checked ? 'on' : ''}`} />
                  <span>{c}</span>
                </label>
              );
            })}
          </div>
          {styleTag}
        </>
      );
    default: return null;
  }
}

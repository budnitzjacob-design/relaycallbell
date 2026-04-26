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
          <span className="brand-full">RELAY · CLINICAL PILOT</span>
          <span className="brand-short">RELAY</span>
        </div>
        <a href="/" className="back">
          <span className="back-full">BACK · HOME</span>
          <span className="back-short">BACK</span>
        </a>
      </div>

      <div className={`wrap ${done ? 'fade-out' : ''}`}>
        <h1><TitleWithLogo title={schema.title || 'Clinical Pilot'} /></h1>
        {schema.intro && <p className="intro">{schema.intro}</p>}

        <div className="rule" />

        <div className="questions">
          {schema.questions.map((q, i) => (
            <Field
              key={q.id}
              q={q}
              index={i}
              value={answers[q.id]}
              otherValue={answers[`${q.id}_other`] || ''}
              onChange={(v) => setVal(q.id, v)}
              onOtherChange={(v) => setVal(`${q.id}_other`, v)}
            />
          ))}
        </div>

        {error && <div className="err">{error}</div>}

        <SubmitButton onClick={submit} busy={submitting} />
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
        .brand { display: flex; align-items: center; gap: 12px; font-size: 11px; letter-spacing: 0.32em; color: #cbd6ec; min-width: 0; }
        .brand-short { display: none; }
        .bdot {
          width: 11px; height: 11px; border-radius: 50%;
          background:
            radial-gradient(circle at 35% 28%, #ff5a5a 0%, #dc2626 45%, #7f1d1d 100%);
          box-shadow:
            inset 0 1px 1px rgba(255,255,255,0.35),
            inset 0 -1px 1px rgba(0,0,0,0.5),
            0 0 14px rgba(220, 38, 38, 0.45);
        }
        .back {
          text-decoration: none; color: #e8eef7;
          border: 1px solid rgba(255,255,255,0.95);
          padding: 8px 18px;
          font: inherit; font-size: 11px; letter-spacing: 0.32em; font-weight: 700;
          background: transparent;
          flex-shrink: 0;
          transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease;
        }
        .back:hover { background: #fff; color: #000; border-color: #fff; }
        .back-short { display: none; }

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
          font-size: clamp(36px, 7.5vw, 96px);
          font-weight: 600;
          margin: 0 0 28px;
          line-height: 1.0;
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

        @media (max-width: 640px) {
          .bar { padding: 14px 18px; }
          .brand-full { display: none; }
          .brand-short { display: inline; }
          .back { padding: 7px 14px; }
          .back-full { display: none; }
          .back-short { display: inline; }
          .wrap { padding: 48px 20px 96px; }
          .questions { gap: 48px; }
          .intro { font-size: 14px; line-height: 1.6; margin: 0 0 36px; }
          .rule { margin: 0 0 36px; }
          .meta { margin-bottom: 20px; }
          .thanks-bar { padding: 14px 18px; }
        }
      `}</style>
    </main>
  );
}

/** Renders the form title, replacing a leading "RELAY" with the logo PNG. */
function TitleWithLogo({ title }: { title: string }) {
  const m = title.match(/^RELAY\s*(.*)$/i);
  if (!m) return <>{title}</>;
  const rest = m[1];
  return (
    <span className="tlw">
      <img src="/relay-logo.png" alt="RELAY" />
      {rest && <span className="tlw-rest">{rest}</span>}
      <style jsx>{`
        .tlw { display: inline-flex; align-items: baseline; flex-wrap: wrap; gap: 0.35em; }
        .tlw img {
          height: 0.78em;
          width: auto;
          display: inline-block;
          vertical-align: -0.06em;
        }
        .tlw-rest { display: inline; }
      `}</style>
    </span>
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

function Field({ q, index, value, otherValue, onChange, onOtherChange }: {
  q: Question; index: number; value: any;
  otherValue?: string;
  onChange: (v: any) => void;
  onOtherChange?: (v: string) => void;
}) {
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
      <div className="ql">
        <span className="ix">{ix}</span>
        <span>{q.label}{q.required && <em className="req">*</em>}</span>
      </div>
      {q.help && <div className="qh">{q.help}</div>}
      <div className="input-wrap">
        <Input
          q={q}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          otherValue={otherValue}
          onOtherChange={onOtherChange}
        />
      </div>
      <style jsx>{`
        .field { display: flex; flex-direction: column; gap: 14px; }
        .ql {
          display: flex; align-items: baseline; gap: 14px;
          font-family: var(--font-mono), ui-monospace, monospace;
          font-size: clamp(15px, 1.4vw, 17px);
          font-weight: 500;
          letter-spacing: 0.01em;
          color: #fff;
          line-height: 1.4;
        }
        .ix {
          color: #6a8cff;
          font-weight: 700;
          flex-shrink: 0;
          font-variant-numeric: tabular-nums;
        }
        .req {
          font-style: normal;
          color: #6a8cff;
          margin-left: 4px;
        }
        .qh {
          font-family: var(--font-mono), monospace;
          font-size: 0.82rem;
          line-height: 1.55;
          color: #97a4c2;
          letter-spacing: 0.02em;
          padding-left: 36px;
        }
        .input-wrap { margin-top: 8px; padding-left: 36px; }
        @media (max-width: 520px) {
          .qh, .input-wrap { padding-left: 32px; }
        }
      `}</style>
    </div>
  );
}

function Input({ q, value, onChange, onFocus, otherValue, onOtherChange }: {
  q: Question; value: any; onChange: (v: any) => void; onFocus: () => void;
  otherValue?: string; onOtherChange?: (v: string) => void;
}) {
  const isOtherChoice = (c: string) => c.toLowerCase() === 'other';
  const cls = 'fld';
  const styleTag = (
    <style jsx>{`
      .fld {
        width: 100%;
        background: #000;
        color: #fff;
        border: 1px solid #fff;
        border-radius: 0;
        padding: 20px 18px;
        font: inherit;
        font-family: var(--font-mono), ui-monospace, monospace;
        font-size: 17px; /* prevent iOS zoom + larger / readable */
        letter-spacing: 0.01em;
        line-height: 1.4;
        transition: border-color 200ms ease, box-shadow 200ms ease;
      }
      .fld::placeholder { color: rgba(255,255,255,0.35); }
      .fld:focus {
        outline: none;
        border-color: #fff;
        box-shadow: 0 0 0 3px rgba(255,255,255,0.18);
      }
      textarea.fld { min-height: 168px; resize: vertical; line-height: 1.6; }
      select.fld {
        appearance: none; -webkit-appearance: none;
        background-color: #000;
        background-image:
          linear-gradient(45deg, transparent 50%, #fff 50%),
          linear-gradient(135deg, #fff 50%, transparent 50%);
        background-position: calc(100% - 18px) center, calc(100% - 12px) center;
        background-size: 7px 7px, 7px 7px;
        background-repeat: no-repeat;
        padding-right: 36px;
      }
      .choices {
        display: flex; flex-direction: column; gap: 0;
        border: 1px solid #fff;
        background: #000;
      }
      .choices label {
        display: flex; align-items: center; gap: 18px; cursor: pointer;
        padding: 18px 18px;
        border-bottom: 1px solid rgba(255,255,255,0.18);
        font-family: var(--font-mono), ui-monospace, monospace;
        font-size: 16px;
        color: #fff;
        letter-spacing: 0.02em;
        transition: background-color 180ms ease;
      }
      .choices label:last-child { border-bottom: none; }
      .choices label:hover { background: rgba(255,255,255,0.06); }
      .choices input { display: none; }
      .marker {
        width: 16px; height: 16px;
        border: 1px solid #fff;
        flex-shrink: 0;
        background: transparent;
        transition: background-color 180ms ease;
      }
      .marker.radio { border-radius: 50%; }
      .marker.on { background: #fff; }
      .ctxt { flex-shrink: 0; }
      .other-input {
        flex: 1;
        margin-left: auto;
        background: #000;
        color: #fff;
        border: none;
        border-bottom: 1px solid rgba(255,255,255,0.45);
        padding: 6px 4px;
        font: inherit;
        font-family: var(--font-mono), ui-monospace, monospace;
        font-size: 16px;
        letter-spacing: 0.01em;
        min-width: 120px;
      }
      .other-input::placeholder { color: rgba(255,255,255,0.35); }
      .other-input:focus { outline: none; border-bottom-color: #fff; }
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
            {(q.choices || []).map(c => {
              const checked = value === c;
              const other = isOtherChoice(c);
              return (
                <label key={c}>
                  <input type="radio" name={q.id} checked={checked} onChange={() => onChange(c)} />
                  <span className={`marker radio ${checked ? 'on' : ''}`} />
                  <span className="ctxt">{c}</span>
                  {other && checked && (
                    <input
                      type="text"
                      className="other-input"
                      placeholder="please specify"
                      value={otherValue || ''}
                      onChange={e => onOtherChange?.(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      onFocus={onFocus}
                    />
                  )}
                </label>
              );
            })}
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
              const other = isOtherChoice(c);
              return (
                <label key={c}>
                  <input type="checkbox" checked={checked} onChange={() => {
                    const next = checked ? arr.filter(x => x !== c) : [...arr, c];
                    onChange(next);
                  }} />
                  <span className={`marker ${checked ? 'on' : ''}`} />
                  <span className="ctxt">{c}</span>
                  {other && checked && (
                    <input
                      type="text"
                      className="other-input"
                      placeholder="please specify"
                      value={otherValue || ''}
                      onChange={e => onOtherChange?.(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      onFocus={onFocus}
                    />
                  )}
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

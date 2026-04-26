'use client';
import { useEffect, useState } from 'react';

type QType = 'short_text' | 'long_text' | 'email' | 'phone' | 'number' | 'single_choice' | 'multi_choice' | 'dropdown' | 'date' | 'section';

type Q = { id: string; type: QType; label: string; help?: string; required?: boolean; choices?: string[] };
type S = { title: string; intro?: string; questions: Q[] };

const TYPES: { value: QType; label: string }[] = [
  { value: 'short_text', label: 'SHORT TEXT' },
  { value: 'long_text',  label: 'LONG TEXT' },
  { value: 'email',      label: 'EMAIL' },
  { value: 'phone',      label: 'PHONE' },
  { value: 'number',     label: 'NUMBER' },
  { value: 'single_choice', label: 'SINGLE CHOICE' },
  { value: 'multi_choice',  label: 'MULTI CHOICE' },
  { value: 'dropdown',   label: 'DROPDOWN' },
  { value: 'date',       label: 'DATE' },
  { value: 'section',    label: 'SECTION' },
];

const STORAGE = 'relay_forge_draft_v1';

export default function Forge() {
  const [schema, setSchema] = useState<S | null>(null);
  const [version, setVersion] = useState(0);
  const [pushing, setPushing] = useState(false);
  const [pushedFlash, setPushedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load: prefer localStorage draft, fall back to live
  useEffect(() => {
    (async () => {
      const draft = typeof window !== 'undefined' ? localStorage.getItem(STORAGE) : null;
      if (draft) {
        try { setSchema(JSON.parse(draft)); }
        catch { /* ignore */ }
      }
      const r = await fetch('/api/survey', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        setVersion(j.version);
        if (!draft && j.schema) setSchema(j.schema);
      }
    })();
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (schema) localStorage.setItem(STORAGE, JSON.stringify(schema));
  }, [schema]);

  if (!schema) return <div className="loading">LOADING…<style jsx>{`.loading{letter-spacing:.3em;font-size:12px;opacity:.6;}`}</style></div>;

  const setField = (id: string, patch: Partial<Q>) => {
    setSchema({ ...schema, questions: schema.questions.map(q => q.id === id ? { ...q, ...patch } : q) });
  };
  const remove = (id: string) => {
    setSchema({ ...schema, questions: schema.questions.filter(q => q.id !== id) });
  };
  const move = (id: string, dir: -1 | 1) => {
    const i = schema.questions.findIndex(q => q.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= schema.questions.length) return;
    const arr = [...schema.questions];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setSchema({ ...schema, questions: arr });
  };
  const add = (type: QType) => {
    const id = 'q_' + Math.random().toString(36).slice(2, 8);
    const q: Q = { id, type, label: 'Untitled question', required: false };
    if (type === 'single_choice' || type === 'multi_choice' || type === 'dropdown') q.choices = ['Option A', 'Option B'];
    if (type === 'section') q.label = 'Section heading';
    setSchema({ ...schema, questions: [...schema.questions, q] });
  };

  const pushLive = async () => {
    setError(null);
    setPushing(true);
    const r = await fetch('/api/survey', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ schema }),
    });
    setPushing(false);
    if (!r.ok) { setError('PUSH FAILED'); return; }
    const j = await r.json();
    setVersion(j.version);
    setPushedFlash(true);
    setTimeout(() => setPushedFlash(false), 2200);
  };

  return (
    <section>
      <div className="head">
        <h1>FORGE</h1>
        <div className="head-meta">
          <span>LIVE · v{version}</span>
          <button className={`push ${pushedFlash ? 'flash' : ''}`} onClick={pushLive} disabled={pushing}>
            {pushing ? 'PUSHING…' : pushedFlash ? 'LIVE' : 'PUSH LIVE'}
          </button>
        </div>
      </div>
      {error && <div className="err">{error}</div>}

      <div className="grid">
        <aside className="sidebar">
          <h3>ADD ELEMENT</h3>
          {TYPES.map(t => (
            <button key={t.value} onClick={() => add(t.value)}>{t.label}</button>
          ))}
        </aside>

        <div className="main">
          <div className="meta-block">
            <label>
              <span>FORM TITLE</span>
              <input value={schema.title} onChange={e => setSchema({ ...schema, title: e.target.value })} />
            </label>
            <label>
              <span>INTRO TEXT</span>
              <textarea value={schema.intro || ''} onChange={e => setSchema({ ...schema, intro: e.target.value })} rows={2} />
            </label>
          </div>

          <ol className="qs">
            {schema.questions.map((q, i) => (
              <li key={q.id} className={`qcard ${q.type}`}>
                <div className="qhead">
                  <span className="ix">{String(i + 1).padStart(2, '0')}</span>
                  <span className="ty">{q.type.replace('_', ' ').toUpperCase()}</span>
                  <span className="id">[{q.id}]</span>
                  <div className="qctl">
                    <button onClick={() => move(q.id, -1)} aria-label="up">↑</button>
                    <button onClick={() => move(q.id,  1)} aria-label="down">↓</button>
                    <button className="del" onClick={() => remove(q.id)} aria-label="delete">×</button>
                  </div>
                </div>
                <input className="ql" value={q.label} onChange={e => setField(q.id, { label: e.target.value })} placeholder="Label" />
                {q.type !== 'section' && (
                  <input className="qh" value={q.help || ''} onChange={e => setField(q.id, { help: e.target.value })} placeholder="Help text (optional)" />
                )}
                {(q.type === 'single_choice' || q.type === 'multi_choice' || q.type === 'dropdown') && (
                  <div className="choices">
                    {(q.choices || []).map((c, ci) => (
                      <div key={ci} className="choice">
                        <input value={c} onChange={e => {
                          const arr = [...(q.choices || [])]; arr[ci] = e.target.value;
                          setField(q.id, { choices: arr });
                        }} />
                        <button onClick={() => {
                          const arr = (q.choices || []).filter((_, idx) => idx !== ci);
                          setField(q.id, { choices: arr });
                        }}>×</button>
                      </div>
                    ))}
                    <button className="addch" onClick={() => setField(q.id, { choices: [...(q.choices || []), 'New option'] })}>+ ADD OPTION</button>
                  </div>
                )}
                {q.type !== 'section' && (
                  <label className="req">
                    <input type="checkbox" checked={!!q.required} onChange={e => setField(q.id, { required: e.target.checked })} />
                    REQUIRED
                  </label>
                )}
              </li>
            ))}
          </ol>
          {schema.questions.length === 0 && (
            <div className="empty">add your first question from the left</div>
          )}
        </div>
      </div>

      <style jsx>{`
        .head { display: flex; align-items: baseline; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
        h1 {
          font-family: var(--font-garamond), serif;
          font-size: clamp(64px, 10vw, 128px);
          margin: 0; line-height: 0.85; font-weight: 500;
          letter-spacing: -0.04em; color: #fff;
        }
        .head-meta { margin-left: auto; display: flex; align-items: center; gap: 16px; font-size: 11px; letter-spacing: 0.3em; }
        .push {
          background: #ff5a1f; color: #000; border: none;
          padding: 14px 24px; font: inherit; font-weight: 700; letter-spacing: 0.32em;
          font-size: 12px; cursor: pointer; transition: all 200ms ease;
        }
        .push:hover { background: #fff; }
        .push.flash { background: #fff; color: #000; }
        .push[disabled] { opacity: 0.5; cursor: wait; }
        .err { color: #ff5a1f; letter-spacing: 0.3em; font-size: 12px; margin-bottom: 12px; }

        .grid { display: grid; grid-template-columns: 220px 1fr; gap: 32px; align-items: flex-start; }
        @media (max-width: 800px) {
          .grid { grid-template-columns: 1fr; gap: 20px; }
          .sidebar { position: static !important; }
        }

        .sidebar { display: flex; flex-direction: column; gap: 6px; position: sticky; top: 100px; }
        .sidebar h3 { font-size: 10px; letter-spacing: 0.32em; opacity: 0.6; margin: 0 0 12px; font-weight: 700; }
        .sidebar button {
          text-align: left; padding: 10px 14px;
          background: transparent; color: #f5f0e6;
          border: 1px solid rgba(245,240,230,0.18);
          font: inherit; font-size: 11px; letter-spacing: 0.18em; font-weight: 500;
          cursor: pointer; transition: all 180ms ease;
        }
        .sidebar button:hover { border-color: #ff5a1f; color: #ff5a1f; }

        .meta-block { display: flex; flex-direction: column; gap: 12px; margin-bottom: 28px; padding-bottom: 28px; border-bottom: 1px solid rgba(245,240,230,0.12); }
        .meta-block label { display: flex; flex-direction: column; gap: 6px; }
        .meta-block span { font-size: 10px; letter-spacing: 0.32em; opacity: 0.6; font-weight: 700; }
        .meta-block input, .meta-block textarea {
          background: transparent; color: #fff; border: 1px solid rgba(245,240,230,0.18);
          padding: 10px 14px; font: inherit; font-size: 1rem; font-family: var(--font-garamond), serif;
        }
        .meta-block input:focus, .meta-block textarea:focus { outline: none; border-color: #ff5a1f; }

        .qs { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
        .qcard { border: 1px solid rgba(245,240,230,0.18); padding: 18px; background: rgba(255,255,255,0.015); }
        .qcard.section { border-color: #ff5a1f; }
        .qhead { display: flex; align-items: center; gap: 12px; font-size: 10px; letter-spacing: 0.2em; opacity: 0.85; margin-bottom: 12px; }
        .ix { color: #ff5a1f; font-weight: 700; }
        .ty { font-weight: 700; }
        .id { opacity: 0.45; font-size: 9px; }
        .qctl { margin-left: auto; display: flex; gap: 4px; }
        .qctl button { background: transparent; color: #f5f0e6; border: 1px solid rgba(245,240,230,0.2); width: 28px; height: 28px; cursor: pointer; font: inherit; font-size: 14px; line-height: 1; transition: all 180ms ease; }
        .qctl button:hover { border-color: #ff5a1f; color: #ff5a1f; }
        .qctl button.del:hover { background: #ff5a1f; color: #000; }

        .ql, .qh {
          width: 100%; background: transparent; color: #fff;
          border: none; border-bottom: 1px solid rgba(245,240,230,0.18);
          padding: 8px 0; margin-bottom: 10px;
          font: inherit; font-family: var(--font-garamond), serif;
        }
        .ql { font-size: 1.1rem; }
        .qh { font-size: 0.95rem; opacity: 0.85; }
        .ql:focus, .qh:focus { outline: none; border-bottom-color: #ff5a1f; }

        .choices { display: flex; flex-direction: column; gap: 6px; margin: 10px 0; }
        .choice { display: flex; gap: 8px; }
        .choice input {
          flex: 1; background: transparent; color: #fff; border: 1px solid rgba(245,240,230,0.18);
          padding: 6px 10px; font: inherit; font-size: 0.9rem; font-family: var(--font-garamond), serif;
        }
        .choice button {
          width: 28px; background: transparent; color: #f5f0e6;
          border: 1px solid rgba(245,240,230,0.2); cursor: pointer; font-size: 14px;
        }
        .addch {
          align-self: flex-start; background: transparent; color: #ff5a1f;
          border: 1px dashed rgba(255,90,31,0.5); padding: 6px 12px;
          font: inherit; font-size: 10px; letter-spacing: 0.24em; cursor: pointer; font-weight: 700;
        }
        .addch:hover { border-style: solid; }

        .req { display: flex; gap: 8px; align-items: center; font-size: 10px; letter-spacing: 0.3em; opacity: 0.7; cursor: pointer; margin-top: 8px; }
        .req input { accent-color: #ff5a1f; }

        .empty { padding: 60px; text-align: center; opacity: 0.4; letter-spacing: 0.3em; font-size: 11px; border: 1px dashed rgba(245,240,230,0.2); }
      `}</style>
    </section>
  );
}

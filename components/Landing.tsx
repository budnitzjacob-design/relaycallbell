'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import RelayLogo from './RelayLogo';
import Marquee from './Marquee';
import { track } from '@/lib/tracker';

const BODY = `The hospital call bell is one of the most critical communication lines between patient and provider: call bell responsiveness is correlated with decreased patient falls and increased patient satisfaction and mobilizes care in critical scenarios. Despite their importance, call bell systems have not been meaningfully updated in decades. RELAY changes this.

RELAY is an AI enabled call bell system that translates and transcribes patient calls, triages their urgency, and instantly displays them for provider review and response. Built as a software only layer on existing hospital call bell systems, RELAY requires no new hardware, provides live transcription and translation into 98 different patient languages, and automatically records the outcomes and responsiveness data. With RELAY, every call becomes a structured data point, enabling quality improvement analyses by unit, provider, diagnosis, shift, or patient demographic that have never before been possible at scale. Patients benefit from faster, personalized, multilingual care; nurses experience reduced alarm fatigue and cognitive burden; and hospital leadership gains a real-time QI platform that help prevent falls and improve revenues without having to burden the patient.

Jacob Budnitz, Troy Schouten, Sophie Walsh`;

// Pixel-measured constants for /public/relay-logo.png (trimmed to 2592x293).
const DOT_CX_FRAC = 0.9616;
const DOT_CY_FRAC = 0.5000;
const DOT_DIAM_FRAC = 0.0760;

const T = {
  introLogoDur: 4000,    // simple opacity fade
  introHold: 1260,
  expandDur: 1680,
  postExpandHold: 420,
  bodyDur: 3150,
  logoDur: 2100,
  buttonDur: 1960,
};
const TS = (() => {
  const expandStart = T.introLogoDur + T.introHold;
  const mainStart = expandStart + T.expandDur;
  const bodyStart = mainStart + T.postExpandHold;
  const logoStart = bodyStart + T.bodyDur - 1050;
  const buttonStart = bodyStart + T.bodyDur + 3500;
  return { expandStart, mainStart, bodyStart, logoStart, buttonStart };
})();

export default function Landing() {
  const router = useRouter();
  const introLogoRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'intro' | 'expanding' | 'main'>('intro');
  const [bodyVisible, setBodyVisible] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [buttonVisible, setButtonVisible] = useState(false);
  const [dotRect, setDotRect] = useState<{ x: number; y: number; size: number } | null>(null);
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const seen = sessionStorage.getItem('relay_intro_seen') === '1';
    if (reduce || seen) {
      setSkip(true); setPhase('main');
      setBodyVisible(true); setLogoVisible(true); setButtonVisible(true);
      return;
    }
    sessionStorage.setItem('relay_intro_seen', '1');
  }, []);

  const measureDot = () => {
    const el = introLogoRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width * DOT_CX_FRAC;
    const cy = r.top + r.height * DOT_CY_FRAC;
    const size = r.width * DOT_DIAM_FRAC;
    setDotRect({ x: cx, y: cy, size });
  };

  useEffect(() => {
    if (skip) return;
    measureDot();
    window.addEventListener('resize', measureDot);
    return () => window.removeEventListener('resize', measureDot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);

  useEffect(() => {
    if (skip) return;
    const t0 = setTimeout(measureDot, TS.expandStart - 80);
    const t1 = setTimeout(() => setPhase('expanding'), TS.expandStart);
    const t2 = setTimeout(() => setPhase('main'), TS.mainStart);
    const t3 = setTimeout(() => setBodyVisible(true), TS.bodyStart);
    const t4 = setTimeout(() => setLogoVisible(true), TS.logoStart);
    const t5 = setTimeout(() => setButtonVisible(true), TS.buttonStart);
    return () => { [t0, t1, t2, t3, t4, t5].forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);

  const targetScale = (() => {
    if (!dotRect) return 1;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const cornerDx = Math.max(dotRect.x, vw - dotRect.x);
    const cornerDy = Math.max(dotRect.y, vh - dotRect.y);
    const r = Math.sqrt(cornerDx ** 2 + cornerDy ** 2);
    return (r * 2.05) / dotRect.size;
  })();

  const onApply = () => {
    track('click', { target: 'apply_button' });
    router.push('/app');
  };

  return (
    <main className="root">
      <div className={`bg-gradient ${phase === 'main' ? 'on' : ''}`} aria-hidden />

      {!skip && (
        <div className={`intro-layer ${phase === 'main' ? 'gone' : ''}`} aria-hidden={phase === 'main'}>
          <div className="intro-logo-wrap">
            <RelayLogo ref={introLogoRef} width="100%" alt="" />
          </div>
        </div>
      )}

      {!skip && dotRect && (
        <div
          className={
            'dot-expand' +
            (phase === 'expanding' || phase === 'main' ? ' armed go' : '') +
            (phase === 'main' ? ' fade' : '')
          }
          aria-hidden
          style={{
            left: `${dotRect.x - dotRect.size / 2}px`,
            top:  `${dotRect.y - dotRect.size / 2}px`,
            width: `${dotRect.size}px`,
            height: `${dotRect.size}px`,
            ['--target-scale' as any]: targetScale,
          }}
        />
      )}

      <section className={`main ${phase === 'main' ? 'on' : ''}`}>
        <div className={`row logo-row ${logoVisible ? 'in' : ''}`}>
          <div className="logo-bound">
            <RelayLogo width="100%" alt="relay" />
          </div>
        </div>
        <div className={`row body-row ${bodyVisible ? 'in' : ''}`}>
          <div className="body-text">
            {BODY.split('\n\n').map((p, i) => (
              <p key={i} className="bp" style={{ ['--bp-i' as any]: i }}>{p}</p>
            ))}
          </div>
        </div>
        <div className={`row btn-row ${buttonVisible ? 'in' : ''}`}>
          <button
            className="apply"
            onClick={onApply}
            onMouseEnter={() => track('hover', { target: 'apply_button' })}
            aria-label="Application for clinical pilot"
          >
            <Marquee text="APPLICATION FOR CLINICAL PILOT" duration={20} />
          </button>
        </div>
      </section>

      <style jsx>{`
        .root { position: relative; min-height: 100dvh; background: #000; overflow: hidden; }

        .bg-gradient {
          position: fixed; inset: -4%;
          background-image: url('/relay-gradient.jpg');
          background-size: cover; background-position: center;
          opacity: 0;
          transition: opacity 980ms cubic-bezier(0.22, 1, 0.36, 1);
          transform: translate3d(var(--bg-x, 0), var(--bg-y, 0), 0);
          will-change: transform, opacity;
          z-index: 0;
        }
        .bg-gradient.on { opacity: 1; }

        .intro-layer {
          position: fixed; inset: 0;
          display: grid; place-items: center;
          background: #000; z-index: 5;
          opacity: 1;
          transition: opacity 600ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .intro-layer.gone { opacity: 0; pointer-events: none; }

        /* Simple opacity fade, 4s, no scale, no blur */
        .intro-logo-wrap {
          width: min(58vw, 880px);
          opacity: 0;
          animation: introIn ${T.introLogoDur}ms ease-out forwards;
          will-change: opacity;
        }
        @keyframes introIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .dot-expand {
          position: fixed; z-index: 6;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 35%, #ffaa3a 0%, #ff5a1f 38%, #c11414 100%);
          transform: scale(1);
          opacity: 0;
          will-change: transform, opacity;
          transition:
            transform ${T.expandDur}ms cubic-bezier(0.65, 0, 0.35, 1),
            opacity 400ms cubic-bezier(0.22, 1, 0.36, 1);
          pointer-events: none;
        }
        .dot-expand.armed { opacity: 1; }
        .dot-expand.go    { transform: scale(var(--target-scale, 50)); }
        .dot-expand.fade  { opacity: 0; transition: transform ${T.expandDur}ms cubic-bezier(0.65, 0, 0.35, 1), opacity 700ms cubic-bezier(0.22, 1, 0.36, 1); }

        .main {
          position: relative; z-index: 2;
          height: 100dvh;
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 0;                /* zero space between logo, text, button */
          padding: 0 4vw;
          opacity: 0;
          transition: opacity 420ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .main.on { opacity: 1; }

        .row {
          width: min(440px, 72vw, 56dvh);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-row, .btn-row, .body-row {
          will-change: opacity, transform, filter;
        }

        .logo-row {
          opacity: 0;
          filter: blur(8px);
          transform: translateY(6px) scale(0.992);
          transition:
            opacity ${T.logoDur}ms cubic-bezier(0.22, 1, 0.36, 1),
            filter  ${T.logoDur}ms cubic-bezier(0.22, 1, 0.36, 1),
            transform ${T.logoDur}ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .logo-row.in { opacity: 1; filter: blur(0); transform: translateY(0) scale(1); }
        .logo-bound { width: 100%; }

        .body-row { aspect-ratio: 1 / 1; }
        .body-text {
          width: 100%;
          color: #fff;
          font-family: var(--font-garamond), 'EB Garamond', 'Apple Garamond', Garamond, serif;
          font-size: clamp(13px, 1.18vw, 15px);
          line-height: 1.42;
          text-align: justify;
          hyphens: auto;
        }
        .body-text p { margin: 0 0 0.7em 0; }
        .body-text p:last-child { margin-bottom: 0; }

        .bp {
          opacity: 0;
          filter: blur(6px);
          transform: translateY(4px);
          transition:
            opacity ${T.bodyDur}ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--bp-i, 0) * 280ms),
            filter  ${T.bodyDur}ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--bp-i, 0) * 280ms),
            transform ${T.bodyDur}ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--bp-i, 0) * 280ms);
        }
        .body-row.in .bp {
          opacity: 1; filter: blur(0); transform: translateY(0);
        }

        .btn-row {
          opacity: 0;
          filter: blur(4px);
          transform: translateY(4px);
          transition:
            opacity ${T.buttonDur}ms cubic-bezier(0.22, 1, 0.36, 1),
            filter  ${T.buttonDur}ms cubic-bezier(0.22, 1, 0.36, 1),
            transform ${T.buttonDur}ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .btn-row.in { opacity: 1; filter: blur(0); transform: translateY(0); }

        /* Standard button: white border, transparent fill, hover → solid black */
        .apply {
          width: 100%;
          height: clamp(44px, 5.4dvh, 56px);
          padding: 0;
          background: transparent;
          color: #fff;
          border: 1px solid rgba(255,255,255,0.95);
          border-radius: 0;
          cursor: pointer;
          overflow: hidden;
          position: relative;
          font-family: inherit;
          transition: background-color 220ms ease, border-color 220ms ease;
        }
        .apply:hover { background: #000; border-color: #000; }
        .apply:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }

        @media (max-width: 520px) {
          .main { padding: 0 6vw; }
          .row { width: min(88vw, 54dvh); }
          .body-text { font-size: 13.5px; line-height: 1.46; }
          .apply { height: 48px; }
        }
        @media (max-width: 380px) {
          .body-text { font-size: 12.5px; line-height: 1.45; }
        }
      `}</style>
    </main>
  );
}

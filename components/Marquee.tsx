'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Right-to-left scrolling marquee. Pass `duration` (seconds) to set scroll speed.
 */
export default function Marquee({ text, duration = 20 }: { text: string; duration?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [reps, setReps] = useState(6);

  useEffect(() => {
    if (!wrapRef.current) return;
    const measure = () => {
      const el = wrapRef.current!;
      const child = el.querySelector('span');
      if (!child) return;
      const childW = (child as HTMLElement).offsetWidth;
      if (childW === 0) return;
      const containerW = el.offsetWidth;
      const need = Math.max(6, Math.ceil((containerW * 2) / childW) + 2);
      setReps(need);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div ref={wrapRef} className="marquee">
      <div className="track" style={{ animationDuration: `${duration}s` }}>
        {Array.from({ length: reps }).map((_, i) => (
          <span key={i} className="cell">{text}&nbsp;&nbsp;&nbsp;&nbsp;&middot;&nbsp;&nbsp;&nbsp;&nbsp;</span>
        ))}
        {Array.from({ length: reps }).map((_, i) => (
          <span key={`b-${i}`} className="cell" aria-hidden>{text}&nbsp;&nbsp;&nbsp;&nbsp;&middot;&nbsp;&nbsp;&nbsp;&nbsp;</span>
        ))}
      </div>
      <style jsx>{`
        .marquee {
          position: relative;
          overflow: hidden;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          mask-image: linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%);
        }
        .track {
          display: flex;
          flex-wrap: nowrap;
          animation: scroll linear infinite;
          will-change: transform;
        }
        .cell {
          flex-shrink: 0;
          font-family: var(--font-mono), ui-monospace, monospace;
          letter-spacing: 0.2em;
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
        }
        @keyframes scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

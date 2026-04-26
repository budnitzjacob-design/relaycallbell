'use client';
import { useEffect } from 'react';

/**
 * Wires two CSS variables to the page:
 *   --bg-x, --bg-y     (for the background gradient parallax, opposite to cursor)
 *   --logo-x, --logo-y (for the logo glow, same axis as cursor)
 * Eased with rAF lerp for a premium feel. Caps at small offsets.
 */
export default function CursorParallax() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let tx = 0, ty = 0, x = 0, y = 0;
    const root = document.documentElement;
    const onMove = (e: PointerEvent) => {
      const w = window.innerWidth, h = window.innerHeight;
      tx = (e.clientX / w - 0.5) * 2; // -1..1
      ty = (e.clientY / h - 0.5) * 2;
    };
    let rafId = 0;
    const loop = () => {
      x += (tx - x) * 0.05;
      y += (ty - y) * 0.05;
      const bgMax = 18;     // px
      const logoMax = 9;    // px
      root.style.setProperty('--bg-x', `${(-x * bgMax).toFixed(2)}px`);
      root.style.setProperty('--bg-y', `${(-y * bgMax).toFixed(2)}px`);
      root.style.setProperty('--logo-x', `${(x * logoMax).toFixed(2)}px`);
      root.style.setProperty('--logo-y', `${(y * logoMax).toFixed(2)}px`);
      rafId = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    rafId = requestAnimationFrame(loop);
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(rafId); };
  }, []);
  return null;
}

'use client';
import { useEffect } from 'react';

/**
 * Custom cursor: a small white dot rendered with mix-blend-mode: difference.
 * Auto-contrasts against any background — appears white over black surfaces,
 * black over white surfaces, complementary over colored surfaces.
 *
 * Hides on touch devices (hover: none).
 */
export default function CursorDot() {
  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return;

    const dot = document.createElement('div');
    dot.setAttribute('aria-hidden', 'true');
    dot.style.cssText = [
      'position:fixed',
      'left:0',
      'top:0',
      'width:14px',
      'height:14px',
      'margin:-7px 0 0 -7px',
      'border-radius:50%',
      'background:#fff',
      'pointer-events:none',
      'z-index:99999',
      'mix-blend-mode:difference',
      'will-change:transform',
      'transition:transform 80ms cubic-bezier(0.22,1,0.36,1), opacity 220ms ease, width 160ms ease, height 160ms ease, margin 160ms ease',
      'opacity:0',
    ].join(';');
    document.body.appendChild(dot);

    let raf = 0;
    let lx = 0, ly = 0, x = 0, y = 0;
    const onMove = (e: PointerEvent) => {
      lx = e.clientX; ly = e.clientY;
      if (dot.style.opacity !== '1') dot.style.opacity = '1';
    };
    const onLeave = () => { dot.style.opacity = '0'; };
    const onDown = () => { dot.style.width = '22px'; dot.style.height = '22px'; dot.style.margin = '-11px 0 0 -11px'; };
    const onUp   = () => { dot.style.width = '14px'; dot.style.height = '14px'; dot.style.margin = '-7px 0 0 -7px'; };

    const loop = () => {
      x += (lx - x) * 0.32;
      y += (ly - y) * 0.32;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);

    document.documentElement.classList.add('cursor-hidden');

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      dot.remove();
      document.documentElement.classList.remove('cursor-hidden');
    };
  }, []);

  return null;
}

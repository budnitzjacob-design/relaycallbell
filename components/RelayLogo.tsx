'use client';
import Image from 'next/image';
import { forwardRef } from 'react';

type Props = {
  width?: number | string;
  glow?: boolean;
  /** if true, the gradient dot is hidden so it can be rendered separately (for the expand animation) */
  hideDot?: boolean;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
};

const RelayLogo = forwardRef<HTMLDivElement, Props>(function RelayLogo(
  { width = '100%', glow = false, className, style, alt = 'relay' }, ref
) {
  return (
    <div ref={ref} className={`relay-logo ${glow ? 'with-glow' : ''} ${className || ''}`} style={{ width, ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <Image src="/relay-logo.png" alt={alt} width={2400} height={1600} priority style={{ width: '100%', height: 'auto', display: 'block' }} />
      <style jsx>{`
        .relay-logo {
          position: relative;
          display: block;
        }
      `}</style>
    </div>
  );
});

export default RelayLogo;

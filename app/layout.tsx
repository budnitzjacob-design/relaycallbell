import type { Metadata, Viewport } from 'next';
import { EB_Garamond, JetBrains_Mono } from 'next/font/google';
import CursorDot from '@/components/CursorDot';
import './globals.css';

const garamond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-garamond',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RELAY',
  description: 'AI-enabled hospital call bell. Software only. Faster care, fewer falls, multilingual at the bedside.',
  metadataBase: new URL('https://relaycallbell.com'),
  openGraph: { title: 'RELAY', description: 'AI-enabled hospital call bell.' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${garamond.variable} ${mono.variable}`}>
      <body>
        <CursorDot />
        {children}
      </body>
    </html>
  );
}

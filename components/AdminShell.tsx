'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const TABS = [
  { href: '/admin',           label: 'PULSE',   sub: 'analytics' },
  { href: '/admin/responses', label: 'SIGNALS', sub: 'submitted applications' },
  { href: '/admin/builder',   label: 'FORGE',   sub: 'survey builder' },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/admin/login';
  if (isLogin) return <>{children}</>;

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/admin/login');
  }

  return (
    <div className="shell theme-admin">
      <header className="bar">
        <div className="brand">
          <span className="dot" />
          <span>RELAY · CONSOLE</span>
        </div>
        <nav>
          {TABS.map(t => {
            const active = t.href === '/admin'
              ? pathname === '/admin'
              : pathname?.startsWith(t.href);
            return (
              <Link key={t.href} href={t.href} className={active ? 'active' : ''}>
                <span className="tab-label">{t.label}</span>
                <span className="tab-sub">{t.sub}</span>
              </Link>
            );
          })}
        </nav>
        <button onClick={logout} className="logout">EXIT</button>
      </header>
      <main className="content">{children}</main>

      <style jsx>{`
        .shell {
          min-height: 100dvh;
          background: #060606;
          color: #f5f0e6;
          font-family: var(--font-mono), ui-monospace, monospace;
        }
        .bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 28px;
          border-bottom: 1px solid rgba(245,240,230,0.12);
          gap: 20px;
          flex-wrap: wrap;
          position: sticky; top: 0;
          background: rgba(6,6,6,0.92);
          backdrop-filter: blur(12px);
          z-index: 50;
        }
        @media (max-width: 640px) {
          .bar { padding: 14px 16px; gap: 12px; }
          nav :global(a) { padding: 6px 12px; }
          nav :global(.tab-label) { font-size: 11px; letter-spacing: 0.22em; }
          nav :global(.tab-sub) { display: none; }
          .logout { padding: 6px 12px; font-size: 10px; letter-spacing: 0.22em; }
          .content { padding: 24px 16px 96px; }
        }
        .brand {
          display: flex; align-items: center; gap: 12px;
          font-size: 11px; letter-spacing: 0.32em;
        }
        .dot { width: 10px; height: 10px; border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #ff8a1c, #ff5a1f 50%, #c11414);
          box-shadow: 0 0 18px rgba(255,90,31,0.6);
        }
        nav { display: flex; gap: 8px; flex-wrap: wrap; }
        nav :global(a) {
          display: flex; flex-direction: column;
          padding: 8px 18px;
          text-decoration: none;
          color: #f5f0e6;
          letter-spacing: 0.28em;
          border: 1px solid transparent;
          transition: border-color 180ms ease, background 180ms ease;
        }
        nav :global(a):hover { border-color: rgba(245,240,230,0.3); }
        nav :global(a.active) { border-color: #ff5a1f; }
        nav :global(.tab-label) { font-size: 13px; font-weight: 700; }
        nav :global(.tab-sub) { font-size: 9px; opacity: 0.6; letter-spacing: 0.2em; margin-top: 3px; }
        .logout {
          background: transparent;
          color: #f5f0e6;
          border: 1px solid rgba(245,240,230,0.3);
          padding: 8px 18px;
          font: inherit;
          letter-spacing: 0.32em;
          font-size: 11px;
          cursor: pointer;
          font-weight: 700;
          transition: background-color 200ms ease, color 200ms ease;
        }
        .logout:hover { background: #ff5a1f; color: #000; border-color: #ff5a1f; }
        .content { padding: 36px 28px 96px; }
      `}</style>
    </div>
  );
}

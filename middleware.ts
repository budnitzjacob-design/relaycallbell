import { NextResponse, type NextRequest } from 'next/server';
import { verifyAdmin, ADMIN_COOKIE } from './lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const ok = await verifyAdmin(req.cookies.get(ADMIN_COOKIE)?.value);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }
  if (pathname.startsWith('/api/responses') && req.method === 'GET') {
    const ok = await verifyAdmin(req.cookies.get(ADMIN_COOKIE)?.value);
    if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (pathname.startsWith('/api/analytics')) {
    const ok = await verifyAdmin(req.cookies.get(ADMIN_COOKIE)?.value);
    if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (pathname === '/api/survey' && req.method === 'PUT') {
    const ok = await verifyAdmin(req.cookies.get(ADMIN_COOKIE)?.value);
    if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/responses/:path*', '/api/analytics/:path*', '/api/survey'],
};

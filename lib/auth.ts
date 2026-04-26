import 'server-only';
import { SignJWT, jwtVerify } from 'jose';

const SECRET = () => new TextEncoder().encode(process.env.ADMIN_SECRET || 'dev-secret-change-me');
const COOKIE_NAME = 'relay_admin';

export async function signAdmin(): Promise<string> {
  return await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET());
}

export async function verifyAdmin(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET());
    return payload.role === 'admin';
  } catch { return false; }
}

export const ADMIN_COOKIE = COOKIE_NAME;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdmin, ADMIN_COOKIE } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await cookies();
  const ok = await verifyAdmin(c.get(ADMIN_COOKIE)?.value);
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const d = await db();
  const row: any = await d.get(
    `SELECT * FROM responses WHERE id = ?`, [id]
  );
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ response: { ...row, answers: JSON.parse(row.answers_json) } });
}

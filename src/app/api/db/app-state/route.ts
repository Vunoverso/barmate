import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
};

// GET /api/db/app-state — retorna todos os registros da org
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const orgId = session.user.organizationId;

  try {
    const rows = await prisma.appState.findMany({
      where: { organizationId: orgId },
      select: { key: true, value: true, updatedAt: true },
    });

    return NextResponse.json(rows, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('[api/db/app-state] GET failed:', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}

// POST /api/db/app-state — upsert de um registro
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const orgId = session.user.organizationId;

  const body = await req.json();
  const { key, value } = body as { key: string; value: unknown };

  if (!key || value === undefined) {
    return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
  }

  try {
    await prisma.appState.upsert({
      where: { organizationId_key: { organizationId: orgId, key } },
      update: { value: value as never, updatedAt: new Date() },
      create: { key, organizationId: orgId, value: value as never },
    });
  } catch (error) {
    console.error('[api/db/app-state] POST failed:', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/db/app-state?key=xxx — remove um registro
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const orgId = session.user.organizationId;

  const key = req.nextUrl.searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }

  try {
    await prisma.appState.deleteMany({
      where: { key, organizationId: orgId },
    });
  } catch (error) {
    console.error('[api/db/app-state] DELETE failed:', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

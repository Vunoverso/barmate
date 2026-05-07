import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/db/open-orders — retorna comandas ativas (sem deletedAt)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const orgId = session.user.organizationId;

  const rows = await prisma.openOrder.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  // Retorna a estrutura completa mesclando metadados + data
  const result = rows.map((row) => ({
    ...(row.data as Record<string, unknown>),
    id: row.id,
    organizationId: row.organizationId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  return NextResponse.json(result);
}

// POST /api/db/open-orders — upsert de uma comanda
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const orgId = session.user.organizationId;

  const body = await req.json() as Record<string, unknown>;
  const id = String(body.id ?? '');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await prisma.openOrder.upsert({
    where: { id },
    update: {
      data: body as never,
      updatedAt: new Date(),
      deletedAt: body.deletedAt ? new Date(String(body.deletedAt)) : null,
    },
    create: {
      id,
      organizationId: orgId,
      data: body as never,
    },
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/db/open-orders?id=xxx — soft delete
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const orgId = session.user.organizationId;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await prisma.openOrder.updateMany({
    where: { id, organizationId: orgId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

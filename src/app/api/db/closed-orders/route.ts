import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/db/closed-orders — retorna comandas fechadas (com deletedAt)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const orgId = session.user.organizationId;

  const { searchParams } = req.nextUrl;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 100, 500) : 100;

  const rows = await prisma.openOrder.findMany({
    where: { organizationId: orgId, deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
    take: limit,
  });

  const result = rows.map((row) => ({
    ...(row.data as Record<string, unknown>),
    id: row.id,
    organizationId: row.organizationId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    closedAt: row.deletedAt?.toISOString() ?? null,
  }));

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
    },
  });
}

// DELETE /api/db/closed-orders?id=xxx — hard delete permanente
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

  // Apenas apaga comandas que já estão fechadas (deletedAt NOT NULL) e pertencem à org
  await prisma.openOrder.deleteMany({
    where: { id, organizationId: orgId, deletedAt: { not: null } },
  });

  return NextResponse.json({ ok: true });
}

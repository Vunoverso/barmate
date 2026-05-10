import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const handleDbError = (error: unknown, action: string) => {
  console.error(`[api/db/open-orders] ${action} failed`, error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const isConnectivityIssue = error.code === 'P1001' || error.code === 'P1002';
    return NextResponse.json(
      { error: isConnectivityIssue ? 'Database unavailable' : 'Database request failed', code: error.code },
      { status: isConnectivityIssue ? 503 : 500 },
    );
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
};

// GET /api/db/open-orders — retorna comandas ativas (sem deletedAt)
export async function GET(req: NextRequest) {
  try {
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
  } catch (error) {
    return handleDbError(error, 'get open orders');
  }
}

// POST /api/db/open-orders — upsert de uma comanda
export async function POST(req: NextRequest) {
  try {
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
  } catch (error) {
    return handleDbError(error, 'upsert open order');
  }
}

// DELETE /api/db/open-orders?id=xxx — soft delete
export async function DELETE(req: NextRequest) {
  try {
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
  } catch (error) {
    return handleDbError(error, 'delete open order');
  }
}

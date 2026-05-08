import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/db/guest-requests — retorna pedidos de convidados
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const orgId = session.user.organizationId;

  const rows = await prisma.guestRequest.findMany({
    where: { organizationId: orgId },
    orderBy: { requestedAt: 'asc' },
  });

  const result = rows.map((row) => {
    const data = row.data as Record<string, unknown>;
    return {
      ...data,
      id: row.id,
      organizationId: row.organizationId,
      associatedOrderId: row.associatedOrderId ?? data.associatedOrderId ?? null,
      requestedAt: row.requestedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  });

  return NextResponse.json(result);
}

// POST /api/db/guest-requests — upsert de um pedido
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

  await prisma.guestRequest.upsert({
    where: { id },
    update: {
      data: body as never,
      updatedAt: new Date(),
      associatedOrderId: body.associatedOrderId ? String(body.associatedOrderId) : null,
    },
    create: {
      id,
      organizationId: orgId,
      associatedOrderId: body.associatedOrderId ? String(body.associatedOrderId) : null,
      data: body as never,
    },
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/db/guest-requests?id=xxx
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

  await prisma.guestRequest.deleteMany({ where: { id, organizationId: orgId } });

  return NextResponse.json({ ok: true });
}

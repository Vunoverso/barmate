import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/order/:orderId
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  const row = await prisma.openOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      data: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  });

  if (!row || row.deletedAt) {
    return NextResponse.json({ error: 'order not found' }, { status: 404 });
  }

  const data = (row.data ?? {}) as Record<string, unknown>;
  // isShared pode estar em camelCase (isShared) ou snake_case (is_shared) dependendo de como foi salvo
  const isShared = data.isShared ?? data.is_shared ?? false;
  if (!isShared) {
    return NextResponse.json({ error: 'order is not shared' }, { status: 403 });
  }

  return NextResponse.json({
    ...data,
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

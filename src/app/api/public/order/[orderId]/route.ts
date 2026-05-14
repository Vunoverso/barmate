import { NextRequest, NextResponse } from 'next/server';
import { getOpenOrderById } from '@/lib/operational-db';

export const dynamic = 'force-dynamic';

// GET /api/public/order/:orderId
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  const row = await getOpenOrderById(orderId);

  if (!row || row.deletedAt) {
    return NextResponse.json({ error: 'order not found' }, { status: 404 });
  }

  const data = row as Record<string, unknown>;
  const isShared = data.isShared ?? data.is_shared ?? false;
  if (!isShared) {
    return NextResponse.json({ error: 'order is not shared' }, { status: 403 });
  }

  return NextResponse.json({
    ...data,
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
    },
  });
}

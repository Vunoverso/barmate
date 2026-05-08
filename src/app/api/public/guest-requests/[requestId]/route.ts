import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/guest-requests/:requestId
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await params;

  if (!requestId) {
    return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
  }

  const row = await prisma.guestRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      associatedOrderId: true,
      data: true,
      updatedAt: true,
    },
  });

  if (!row) {
    return NextResponse.json({ error: 'request not found' }, { status: 404 });
  }

  const data = (row.data ?? {}) as Record<string, unknown>;

  return NextResponse.json({
    id: row.id,
    name: data.name ?? null,
    status: data.status ?? 'pending',
    intent: data.intent ?? 'create',
    tableLabel: data.tableLabel ?? null,
    comandaNumber: data.comandaNumber ?? null,
    associatedOrderId: row.associatedOrderId ?? data.associatedOrderId ?? null,
    updatedAt: row.updatedAt.toISOString(),
  });
}

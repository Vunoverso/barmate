import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const asTrimmed = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

// POST /api/public/order/:orderId/service-call
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>)) as Record<string, unknown>;

  const order = await prisma.openOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      organizationId: true,
      deletedAt: true,
      data: true,
    },
  });

  if (!order || order.deletedAt) {
    return NextResponse.json({ error: 'order not found' }, { status: 404 });
  }

  const orderData = (order.data ?? {}) as Record<string, unknown>;
  if (!orderData.isShared) {
    return NextResponse.json({ error: 'order is not shared' }, { status: 403 });
  }

  const reason = asTrimmed(body.reason) || 'waiter';
  const message = asTrimmed(body.message) || 'Cliente solicitou atendimento na mesa.';
  const guestName = asTrimmed(body.guestName) || asTrimmed(orderData.clientName) || asTrimmed(orderData.name) || 'Cliente';
  const tableLabel = asTrimmed(body.tableLabel) || asTrimmed(orderData.tableLabel) || null;
  const comandaNumber = asTrimmed(body.comandaNumber) || asTrimmed(orderData.comandaNumber) || null;

  const displayName = tableLabel
    ? `${guestName} - ${tableLabel}`
    : guestName;

  await prisma.guestRequest.create({
    data: {
      organizationId: order.organizationId,
      associatedOrderId: order.id,
      data: {
        name: displayName,
        status: 'pending',
        intent: 'view',
        requestType: 'service_call',
        reason,
        message,
        tableLabel,
        comandaNumber,
        requestedAt: new Date().toISOString(),
      } as never,
    },
  });

  return NextResponse.json({ ok: true });
}

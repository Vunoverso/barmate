import { NextRequest, NextResponse } from 'next/server';
import { createGuestRequest, getOpenOrderById } from '@/lib/operational-db';

const asTrimmed = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

// POST /api/public/order/:orderId/service-call
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>)) as Record<string, unknown>;

  const order = await getOpenOrderById(orderId);

  if (!order || order.deletedAt) {
    return NextResponse.json({ error: 'order not found' }, { status: 404 });
  }

  const orderData = order as Record<string, unknown>;
  if (!orderData.isShared && !orderData.is_shared) {
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

  const organizationId = typeof order.organizationId === 'string' ? order.organizationId : '';
  if (!organizationId) {
    return NextResponse.json({ error: 'organization not found' }, { status: 404 });
  }

  await createGuestRequest(organizationId, {
    associatedOrderId: order.id,
    name: displayName,
    status: 'pending',
    intent: 'view',
    requestType: 'service_call',
    reason,
    message,
    tableLabel,
    comandaNumber,
    requestedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}

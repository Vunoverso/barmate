import { NextRequest, NextResponse } from 'next/server';
import { getOpenOrderById, updateOpenOrderDataById } from '@/lib/operational-db';
import type { OrderChatMessage } from '@/types';

const asTrimmed = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const asChatMessages = (value: unknown): OrderChatMessage[] => (
  Array.isArray(value) ? (value as OrderChatMessage[]) : []
);

const randomId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// GET /api/public/order/:orderId/chat
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
  if (!data.isShared && !data.is_shared) {
    return NextResponse.json({ error: 'order is not shared' }, { status: 403 });
  }

  return NextResponse.json({
    messages: asChatMessages(data.chatMessages),
  });
}

// POST /api/public/order/:orderId/chat
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  const body = await req.json() as Record<string, unknown>;
  const text = asTrimmed(body.text).slice(0, 500);
  const kind = body.kind === 'quick' ? 'quick' : 'text';

  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const row = await getOpenOrderById(orderId);

  if (!row || row.deletedAt) {
    return NextResponse.json({ error: 'order not found' }, { status: 404 });
  }

  const data = row as Record<string, unknown>;
    if (!data.isShared && !data.is_shared) {
    return NextResponse.json({ error: 'order is not shared' }, { status: 403 });
  }

  const currentMessages = asChatMessages(data.chatMessages);
  const nextMessage: OrderChatMessage = {
    id: `msg-g-${randomId()}`,
    sender: 'guest',
    text,
    createdAt: new Date().toISOString(),
    kind,
  };

  const updatedData = {
    ...data,
    chatMessages: [...currentMessages, nextMessage],
    updatedAt: new Date().toISOString(),
  };

  await updateOpenOrderDataById(row.id, updatedData);

  return NextResponse.json({ ok: true, message: nextMessage });
}

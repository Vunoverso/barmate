import { NextRequest, NextResponse } from 'next/server';
import { getApiSessionContext, unauthorizedResponse } from '@/lib/api-session';
import { hardDeleteClosedOpenOrder, listOpenOrders } from '@/lib/operational-db';

export const dynamic = 'force-dynamic';

// GET /api/db/closed-orders — retorna comandas fechadas (com deletedAt)
export async function GET(req: NextRequest) {
  const session = await getApiSessionContext(req);
  if (!session) return unauthorizedResponse();
  const orgId = session.organizationId;

  const { searchParams } = req.nextUrl;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 100, 500) : 100;

  const result = await listOpenOrders(orgId, { closed: true, limit });

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
    },
  });
}

// DELETE /api/db/closed-orders?id=xxx — hard delete permanente
export async function DELETE(req: NextRequest) {
  const session = await getApiSessionContext(req);
  if (!session) return unauthorizedResponse();
  const orgId = session.organizationId;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await hardDeleteClosedOpenOrder(orgId, id);

  return NextResponse.json({ ok: true });
}

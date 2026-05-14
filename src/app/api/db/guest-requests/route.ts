import { NextRequest, NextResponse } from 'next/server';
import { getApiSessionContext, unauthorizedResponse } from '@/lib/api-session';
import { deleteGuestRequest, listGuestRequests, upsertGuestRequest } from '@/lib/operational-db';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
};

// GET /api/db/guest-requests — retorna pedidos de convidados
export async function GET(req: NextRequest) {
  const session = await getApiSessionContext(req);
  if (!session) return unauthorizedResponse();
  const orgId = session.organizationId;

  try {
    const rows = await listGuestRequests(orgId);
    return NextResponse.json(rows, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('[api/db/guest-requests] GET failed:', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}

// POST /api/db/guest-requests — upsert de um pedido
export async function POST(req: NextRequest) {
  const session = await getApiSessionContext(req);
  if (!session) return unauthorizedResponse();
  const orgId = session.organizationId;

  const body = await req.json() as Record<string, unknown>;
  const id = String(body.id ?? '');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    await upsertGuestRequest(orgId, body);
  } catch (error) {
    console.error('[api/db/guest-requests] POST failed:', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/db/guest-requests?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await getApiSessionContext(req);
  if (!session) return unauthorizedResponse();
  const orgId = session.organizationId;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    await deleteGuestRequest(orgId, id);
  } catch (error) {
    console.error('[api/db/guest-requests] DELETE failed:', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

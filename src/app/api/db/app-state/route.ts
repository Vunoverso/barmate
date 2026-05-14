import { NextRequest, NextResponse } from 'next/server';
import { getApiSessionContext, unauthorizedResponse } from '@/lib/api-session';
import { deleteAppState, listAppState, upsertAppState } from '@/lib/operational-db';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
};

// GET /api/db/app-state — retorna todos os registros da org
export async function GET(req: NextRequest) {
  const session = await getApiSessionContext(req);
  if (!session) return unauthorizedResponse();
  const orgId = session.organizationId;

  try {
    const rows = await listAppState(orgId);

    return NextResponse.json(rows, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('[api/db/app-state] GET failed:', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}

// POST /api/db/app-state — upsert de um registro
export async function POST(req: NextRequest) {
  const session = await getApiSessionContext(req);
  if (!session) return unauthorizedResponse();
  const orgId = session.organizationId;

  const body = await req.json();
  const { key, value } = body as { key: string; value: unknown };

  if (!key || value === undefined) {
    return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
  }

  try {
    await upsertAppState(orgId, key, value);
  } catch (error) {
    console.error('[api/db/app-state] POST failed:', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/db/app-state?key=xxx — remove um registro
export async function DELETE(req: NextRequest) {
  const session = await getApiSessionContext(req);
  if (!session) return unauthorizedResponse();
  const orgId = session.organizationId;

  const key = req.nextUrl.searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }

  try {
    await deleteAppState(orgId, key);
  } catch (error) {
    console.error('[api/db/app-state] DELETE failed:', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

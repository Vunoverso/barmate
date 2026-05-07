import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type BackupPayload = {
  appState?: Record<string, unknown>;
  tableSnapshots?: { open_orders?: Record<string, unknown>[]; guest_requests?: Record<string, unknown>[] };
  localStorageData?: Record<string, unknown>;
};

// POST /api/db/import-backup — importa backup do JSON exportado pela /rescue
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const orgId = session.user.organizationId;

  const body = await req.json() as BackupPayload;

  const results: Record<string, number> = {};

  // 1. Importar app_state
  const appState = { ...(body.appState ?? {}), ...(body.localStorageData ?? {}) };
  let appStateCount = 0;
  for (const [key, value] of Object.entries(appState)) {
    if (value === null || value === undefined) continue;
    await prisma.appState.upsert({
      where: { organizationId_key: { organizationId: orgId, key } },
      update: { value: value as never, updatedAt: new Date() },
      create: { key, organizationId: orgId, value: value as never },
    });
    appStateCount++;
  }
  results.appState = appStateCount;

  // 2. Importar open_orders do table_snapshot
  const openOrders = body.tableSnapshots?.open_orders ?? [];
  let ordersCount = 0;
  for (const order of openOrders) {
    const id = String(order.id ?? '');
    if (!id) continue;
    await prisma.openOrder.upsert({
      where: { id },
      update: { data: order as never, updatedAt: new Date() },
      create: { id, organizationId: orgId, data: order as never },
    });
    ordersCount++;
  }
  results.openOrders = ordersCount;

  // 3. Importar guest_requests do table_snapshot
  const guestRequests = body.tableSnapshots?.guest_requests ?? [];
  let guestsCount = 0;
  for (const gr of guestRequests) {
    const id = String(gr.id ?? '');
    if (!id) continue;
    await prisma.guestRequest.upsert({
      where: { id },
      update: { data: gr as never, updatedAt: new Date() },
      create: {
        id,
        organizationId: orgId,
        associatedOrderId: gr.associatedOrderId ? String(gr.associatedOrderId) : null,
        data: gr as never,
      },
    });
    guestsCount++;
  }
  results.guestRequests = guestsCount;

  return NextResponse.json({ ok: true, imported: results });
}

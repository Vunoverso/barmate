/**
 * Importa open_orders do barmate_app_state_partial.json para o Vultr PostgreSQL
 * via Prisma usando DATABASE_URL.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const ORG_ID = 'cmow169q20000aq3vl1xdsq9z';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://barmate_user:bm_V4ltr2026!@216.238.125.211:5432/barmate?connection_limit=1&connect_timeout=15',
    },
  },
});

async function main() {
  const raw = readFileSync('C:/Users/hause/Downloads/barmate_app_state_partial.json', 'utf8')
    .replace(/^\uFEFF/, '');
  const rows = JSON.parse(raw);
  const ordersRow = rows.find(r => r.key === 'barmate_openOrders_v2');

  if (!ordersRow) {
    console.error('barmate_openOrders_v2 não encontrado');
    process.exit(1);
  }

  const orders = JSON.parse(ordersRow.value);
  console.log(`Total de comandas para importar: ${orders.length}`);

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const order of orders) {
    const id = String(order.id ?? '');
    if (!id) { skip++; continue; }

    // Só importar comandas não deletadas
    const deletedAt = order.deletedAt || order.deleted_at;
    if (deletedAt) {
      console.log(`  SKIP (deletada): ${id}`);
      skip++;
      continue;
    }

    const createdAt = order.createdAt || order.created_at
      ? new Date(order.createdAt || order.created_at)
      : new Date();

    const updatedAt = order.updatedAt || order.updated_at
      ? new Date(order.updatedAt || order.updated_at)
      : new Date();

    try {
      await prisma.openOrder.upsert({
        where: { id },
        update: {
          data: order,
          updatedAt,
          deletedAt: null,
        },
        create: {
          id,
          organizationId: ORG_ID,
          data: order,
          createdAt,
          updatedAt,
          deletedAt: null,
        },
      });
      console.log(`  ✓ ${id} — ${order.name || order.tableNumber || ''}`);
      ok++;
    } catch (e) {
      console.error(`  ✗ ${id}:`, e.message);
      fail++;
    }
  }

  console.log(`\nResultado: ${ok} importadas, ${skip} puladas, ${fail} erros`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

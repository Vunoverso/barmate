import { PrismaClient } from '@prisma/client';

const p = new PrismaClient({
  datasources: { db: { url: 'postgresql://barmate_user:bm_V4ltr2026!@216.238.125.211:5432/barmate?connection_limit=1&connect_timeout=10' } }
});

const row = await p.appState.findFirst({ where: { key: 'barmate_products_v2' } });
const products = Array.isArray(row.value) ? row.value : JSON.parse(row.value);
const first = products[0];
console.log('first name raw JSON:', JSON.stringify(first.name));
console.log('first name:', first.name);
console.log('length:', first.name.length);
for (let i = 0; i < first.name.length; i++) {
  const c = first.name.charCodeAt(i);
  if (c > 127) {
    console.log(`  pos ${i}: code=${c.toString(16)} (${c}) char="${first.name[i]}"`);
  }
}
// Testar fix
const bytes = Buffer.from(first.name, 'binary');
console.log('\nbytes hex:', bytes.toString('hex'));
console.log('decoded utf8:', bytes.toString('utf8'));

await p.$disconnect();

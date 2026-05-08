/**
 * Corrige encoding mojibake em todo o banco.
 * Problema: bytes UTF-8 foram salvos como code points individuais (tratados como binary/latin-1).
 * Fix: re-interpretar os code points como bytes e decodificar como UTF-8.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://barmate_user:bm_V4ltr2026!@216.238.125.211:5432/barmate?connection_limit=1&connect_timeout=15',
    },
  },
});

/** Detecta se um string tem mojibake (byte UTF-8 misread como Latin-1) */
function hasMojibake(str) {
  if (typeof str !== 'string') return false;
  // Procura padrão: U+00C3 ou U+00C2 seguido de char no range U+0080-U+00BF
  // Esses são os dois primeiros bytes de sequências UTF-8 de 2 bytes lidas como Latin-1
  return /[\u00c2\u00c3][\u0080-\u00bf]/.test(str);
}

/** Corrige um string com mojibake */
function fixStr(str) {
  if (!hasMojibake(str)) return str;
  try {
    // Cada char do JS tem code point = byte original → re-interpreta como buffer UTF-8
    const bytes = Buffer.from(str, 'binary');
    const fixed = bytes.toString('utf8');
    // Só aceita se o resultado não tem mais mojibake
    if (!hasMojibake(fixed)) return fixed;
    return str;
  } catch {
    return str;
  }
}

/** Percorre recursivamente um valor JSON e corrige todos os strings */
function fixValue(val) {
  if (typeof val === 'string') return fixStr(val);
  if (Array.isArray(val)) return val.map(fixValue);
  if (val !== null && typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = fixValue(v);
    }
    return out;
  }
  return val;
}

let totalFixed = 0;

async function fixAppState() {
  console.log('\n=== Corrigindo app_state ===');
  const rows = await prisma.appState.findMany();
  let fixed = 0;

  for (const row of rows) {
    const fixedValue = fixValue(row.value);
    const before = JSON.stringify(row.value);
    const after = JSON.stringify(fixedValue);

    if (before !== after) {
      await prisma.appState.update({
        where: { id: row.id },
        data: { value: fixedValue },
      });
      console.log(`  ✓ [${row.key}] corrigido`);
      fixed++;
    } else {
      console.log(`  - [${row.key}] sem alterações`);
    }
  }
  console.log(`app_state: ${fixed}/${rows.length} rows corrigidas`);
  totalFixed += fixed;
}

async function fixOpenOrders() {
  console.log('\n=== Corrigindo open_orders ===');
  const rows = await prisma.openOrder.findMany();
  let fixed = 0;

  for (const row of rows) {
    const fixedData = fixValue(row.data);
    const before = JSON.stringify(row.data);
    const after = JSON.stringify(fixedData);

    if (before !== after) {
      await prisma.openOrder.update({
        where: { id: row.id },
        data: { data: fixedData },
      });
      const name = (fixedData && typeof fixedData === 'object') ? fixedData.name || row.id : row.id;
      console.log(`  ✓ open_order [${name}] corrigido`);
      fixed++;
    }
  }
  console.log(`open_orders: ${fixed}/${rows.length} rows corrigidas`);
  totalFixed += fixed;
}

async function main() {
  console.log('Iniciando correção de encoding...');
  await fixAppState();
  await fixOpenOrders();
  console.log(`\nTotal corrigido: ${totalFixed} rows`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

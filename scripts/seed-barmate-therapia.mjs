/**
 * seed-barmate-therapia.mjs
 * Popula o PostgreSQL com:
 *   - Organização "Bar Therapia"
 *   - Usuário admin
 *   - Produtos e categorias do arquivo produtos-therapia.json
 */
import { PrismaClient } from '@prisma/client';
import bcryptPkg from 'bcryptjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { hash } = bcryptPkg;
const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? 'admin@bartherapia.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? process.env.SEED_DEFAULT_PASSWORD;
const ADMIN_NAME     = process.env.ADMIN_NAME     ?? 'Admin Bar Therapia';
const ORG_SLUG       = 'bartherapia';

// ----- Categorias do Bar Therapia -----
const CATEGORIES = [
  { id: 'cat_alcoolicas',               name: 'Bebidas Alcoólicas',      iconName: 'Beer' },
  { id: 'cat_nao_alcoolicas',           name: 'Não Alcoólicas',          iconName: 'Coffee' },
  { id: 'cat_lanches',                  name: 'Lanches',                 iconName: 'UtensilsCrossed' },
  { id: 'cat_outros',                   name: 'Outros',                  iconName: 'Package' },
  { id: 'cat_cafes',                    name: 'Cafés / Cigarros',        iconName: 'Coffee' },
  { id: 'cat_doses_1756500736217',      name: 'Doses',                   iconName: 'Martini' },
  { id: 'cat_cop_o_1756500824433',      name: 'Copão',                   iconName: 'Wine' },
  { id: 'cat_caipirinhas_1756501145617',name: 'Caipirinhas',             iconName: 'Martini' },
  { id: 'cat_drinks_1756501505560',     name: 'Drinks',                  iconName: 'Martini' },
  { id: 'cat_gelos_1751233766129',      name: 'Gelos',                   iconName: 'Package' },
];

async function main() {
  if (!ADMIN_PASSWORD) {
    throw new Error(
      'Defina ADMIN_PASSWORD ou SEED_DEFAULT_PASSWORD no ambiente antes de executar o seed.\n' +
      'Exemplo: $env:ADMIN_PASSWORD="SuaSenha123"; node scripts/seed-barmate-therapia.mjs'
    );
  }

  console.log('⏳ Conectando ao banco...');

  // 1. Organização
  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: { legalName: 'Bar Therapia', tradeName: 'Bar Therapia', status: 'ACTIVE' },
    create: {
      legalName: 'Bar Therapia',
      tradeName: 'Bar Therapia',
      slug: ORG_SLUG,
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Organização: ${org.tradeName} (id: ${org.id})`);

  // 2. Usuário admin
  const passwordHash = await hash(ADMIN_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { name: ADMIN_NAME, passwordHash, status: 'active' },
    create: { name: ADMIN_NAME, email: ADMIN_EMAIL, passwordHash, status: 'active' },
  });

  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
    update: { role: 'OWNER', status: 'active' },
    create: { organizationId: org.id, userId: user.id, role: 'OWNER', status: 'active' },
  });
  console.log(`✅ Usuário admin: ${user.email}`);

  // 3. Produtos (lê do arquivo JSON)
  const produtosPath = join(__dirname, '..', 'produtos-therapia.json');
  const produtosJson = JSON.parse(readFileSync(produtosPath, 'utf-8'));
  const produtos = produtosJson.items ?? [];
  console.log(`📦 Produtos encontrados: ${produtos.length}`);

  // 4. Salva categorias no app_state
  await prisma.appState.upsert({
    where: { organizationId_key: { organizationId: org.id, key: 'barmate_productCategories_v2' } },
    update: { value: CATEGORIES },
    create: { organizationId: org.id, key: 'barmate_productCategories_v2', value: CATEGORIES },
  });
  console.log(`✅ ${CATEGORIES.length} categorias salvas`);

  // 5. Salva produtos no app_state
  await prisma.appState.upsert({
    where: { organizationId_key: { organizationId: org.id, key: 'barmate_products_v2' } },
    update: { value: produtos },
    create: { organizationId: org.id, key: 'barmate_products_v2', value: produtos },
  });
  console.log(`✅ ${produtos.length} produtos salvos`);

  // 6. Configurações básicas do bar
  const barSettings = [
    { key: 'barName',    value: 'Bar Therapia' },
    { key: 'barCnpj',   value: '' },
    { key: 'barAddress', value: '' },
  ];
  for (const setting of barSettings) {
    await prisma.appState.upsert({
      where: { organizationId_key: { organizationId: org.id, key: setting.key } },
      update: { value: setting.value },
      create: { organizationId: org.id, key: setting.key, value: setting.value },
    });
  }
  console.log('✅ Configurações básicas salvas');

  // 7. Caixa fechado como estado inicial
  await prisma.appState.upsert({
    where: { organizationId_key: { organizationId: org.id, key: 'barmate_cashRegisterStatus_v2' } },
    update: {},
    create: {
      organizationId: org.id,
      key: 'barmate_cashRegisterStatus_v2',
      value: { status: 'closed', adjustments: [] },
    },
  });

  console.log('\n🎉 Seed concluído!');
  console.log(`\n📋 Credenciais de acesso:`);
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   Senha: ${ADMIN_PASSWORD}`);
  console.log(`   Org:   ${ORG_SLUG}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

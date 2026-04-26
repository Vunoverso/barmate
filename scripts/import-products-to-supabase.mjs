import 'dotenv/config';

import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const KEY_PRODUCTS = 'barmate_products_v2';
const KEY_PRODUCT_CATEGORIES = 'barmate_productCategories_v2';

const USAGE = `Uso:
  npm run import:products -- ./caminho/produtos.json
  npm run import:products -- ./caminho/produtos.json --apply
  npm run import:products -- ./caminho/produtos.json --apply --merge

Sem --apply o script apenas valida e mostra o resumo.

Formatos aceitos:
  - Array direto de produtos
  - Objeto com { "items": [...] }
  - Documento da API REST do Firestore com { "fields": ... }
`;

const CATEGORY_FALLBACKS = new Map([
  ['cat_cervejas', ['Cervejas', 'Beer']],
  ['cat_alcoolicas', ['Bebidas Alcoolicas', 'Martini']],
  ['cat_nao_alcoolicas', ['Nao alcoolicas', 'Coffee']],
  ['cat_sem_alcool', ['Sem alcool', 'Coffee']],
  ['cat_vinhos', ['Vinhos', 'Wine']],
  ['cat_lanches', ['Lanches', 'UtensilsCrossed']],
  ['cat_porcoes', ['Porcoes', 'UtensilsCrossed']],
  ['cat_sobremesas', ['Sobremesas', 'CakeSlice']],
  ['cat_outros', ['Outros', 'Package']],
  ['cat_cafes', ['Cafes', 'Coffee']],
  ['cat_doses', ['Doses', 'Martini']],
  ['cat_cop_o', ['Copao', 'Martini']],
  ['cat_caipirinhas', ['Caipirinhas', 'Martini']],
  ['cat_drinks', ['Drinks', 'Martini']],
  ['cat_gelos', ['Gelos', 'Package']],
]);

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const merge = args.includes('--merge');
const skipCategories = args.includes('--skip-categories');
const inputPath = args.find((arg) => !arg.startsWith('--'));

if (args.includes('--help')) {
  console.log(USAGE);
  process.exit(0);
}

if (!inputPath) {
  console.error(USAGE);
  process.exit(1);
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function decodeFirestoreValue(value) {
  if (!isObject(value)) return value;

  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) {
    return (value.arrayValue?.values ?? []).map((entry) => decodeFirestoreValue(entry));
  }
  if ('mapValue' in value) {
    return decodeFirestoreFields(value.mapValue?.fields ?? {});
  }
  if ('fields' in value) {
    return decodeFirestoreFields(value.fields);
  }

  return value;
}

function decodeFirestoreFields(fields) {
  return Object.fromEntries(
    Object.entries(fields ?? {}).map(([key, value]) => [key, decodeFirestoreValue(value)]),
  );
}

function extractPayload(rawPayload) {
  const payload = isObject(rawPayload) && 'fields' in rawPayload
    ? decodeFirestoreFields(rawPayload.fields)
    : rawPayload;

  if (Array.isArray(payload)) {
    return { products: payload, categories: [] };
  }

  if (isObject(payload) && Array.isArray(payload.items)) {
    return {
      products: payload.items,
      categories: Array.isArray(payload.categories)
        ? payload.categories
        : Array.isArray(payload.productCategories)
          ? payload.productCategories
          : [],
    };
  }

  if (isObject(payload) && Array.isArray(payload.products)) {
    return {
      products: payload.products,
      categories: Array.isArray(payload.categories)
        ? payload.categories
        : Array.isArray(payload.productCategories)
          ? payload.productCategories
          : [],
    };
  }

  throw new Error('Arquivo sem uma lista de produtos. Use um array ou um objeto com items/products.');
}

function toFiniteNumber(value, fieldName, productId) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new Error(`Produto ${productId}: campo ${fieldName} precisa ser numerico.`);
  }
  return numberValue;
}

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeProduct(rawProduct, index) {
  if (!isObject(rawProduct)) {
    throw new Error(`Produto na posicao ${index} nao e um objeto.`);
  }

  const id = String(rawProduct.id ?? rawProduct.productId ?? `prod-import-${index + 1}`).trim();
  const name = String(rawProduct.name ?? '').trim();
  const categoryId = String(rawProduct.categoryId ?? rawProduct.category_id ?? 'cat_outros').trim();

  if (!id) throw new Error(`Produto na posicao ${index} esta sem id.`);
  if (!name) throw new Error(`Produto ${id} esta sem nome.`);

  const isCombo = Boolean(rawProduct.isCombo ?? rawProduct.is_combo ?? false);
  const comboItems = normalizeOptionalNumber(rawProduct.comboItems ?? rawProduct.combo_items);
  const stock = normalizeOptionalNumber(rawProduct.stock);

  return {
    id,
    name,
    price: toFiniteNumber(rawProduct.price, 'price', id),
    categoryId: categoryId || 'cat_outros',
    stock,
    isCombo,
    comboItems: isCombo ? comboItems : null,
  };
}

function normalizeCategory(rawCategory) {
  if (!isObject(rawCategory)) return null;
  const id = String(rawCategory.id ?? rawCategory.categoryId ?? '').trim();
  const name = String(rawCategory.name ?? '').trim();
  if (!id || !name) return null;

  return {
    id,
    name,
    iconName: String(rawCategory.iconName ?? rawCategory.icon ?? 'Package').trim() || 'Package',
  };
}

function humanizeCategoryId(categoryId) {
  const knownEntry = Array.from(CATEGORY_FALLBACKS.entries())
    .find(([prefix]) => categoryId === prefix || categoryId.startsWith(`${prefix}_`));

  if (knownEntry) {
    const [, [name, iconName]] = knownEntry;
    return { id: categoryId, name, iconName };
  }

  const name = categoryId
    .replace(/^cat_/, '')
    .replace(/_\d+$/, '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Outros';

  return { id: categoryId, name, iconName: 'Package' };
}

function buildCategories(products, inputCategories) {
  const categoriesById = new Map();

  for (const category of inputCategories.map(normalizeCategory).filter(Boolean)) {
    categoriesById.set(category.id, category);
  }

  for (const product of products) {
    if (!categoriesById.has(product.categoryId)) {
      categoriesById.set(product.categoryId, humanizeCategoryId(product.categoryId));
    }
  }

  return Array.from(categoriesById.values()).sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
}

function mergeById(existingProducts, importedProducts) {
  const merged = new Map();
  for (const product of existingProducts) {
    if (isObject(product) && product.id) merged.set(String(product.id), product);
  }
  for (const product of importedProducts) {
    merged.set(product.id, product);
  }
  return Array.from(merged.values());
}

async function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function readExistingAppState(supabase) {
  const { data, error } = await supabase
    .from('app_state')
    .select('key,value')
    .in('key', [KEY_PRODUCTS, KEY_PRODUCT_CATEGORIES]);

  if (error) throw error;

  return new Map((data ?? []).map((row) => [row.key, row.value]));
}

async function upsertAppState(supabase, rows) {
  const { error } = await supabase.from('app_state').upsert(rows, { onConflict: 'key' });
  if (error) throw error;
}

async function main() {
  const rawFile = await readFile(inputPath, 'utf8');
  const payload = JSON.parse(rawFile);
  const { products: rawProducts, categories: rawCategories } = extractPayload(payload);
  const importedProducts = rawProducts.map(normalizeProduct);
  const importedCategories = buildCategories(importedProducts, rawCategories);

  if (importedProducts.length === 0) {
    throw new Error('Nenhum produto encontrado para importar.');
  }

  console.log(`Produtos no arquivo: ${importedProducts.length}`);
  console.log(`Categorias detectadas: ${importedCategories.length}`);
  console.log(`Modo: ${apply ? 'gravacao no Supabase' : 'validacao apenas'}${merge ? ' com merge por id' : ' com substituicao do catalogo'}`);

  if (!apply) {
    console.log('Nada foi gravado. Rode novamente com --apply para importar.');
    return;
  }

  const supabase = await getSupabaseClient();
  const existingState = await readExistingAppState(supabase);
  const now = new Date().toISOString();
  const backupSuffix = now.replace(/[:.]/g, '-');
  const existingProducts = Array.isArray(existingState.get(KEY_PRODUCTS)) ? existingState.get(KEY_PRODUCTS) : [];
  const existingCategories = Array.isArray(existingState.get(KEY_PRODUCT_CATEGORIES)) ? existingState.get(KEY_PRODUCT_CATEGORIES) : [];
  const productsToSave = merge ? mergeById(existingProducts, importedProducts) : importedProducts;
  const categoriesToSave = skipCategories
    ? existingCategories
    : merge
      ? mergeById(existingCategories, importedCategories)
      : importedCategories;

  const rows = [];

  if (existingProducts.length > 0) {
    rows.push({ key: `${KEY_PRODUCTS}_backup_${backupSuffix}`, value: existingProducts, updated_at: now });
  }

  if (!skipCategories && existingCategories.length > 0) {
    rows.push({ key: `${KEY_PRODUCT_CATEGORIES}_backup_${backupSuffix}`, value: existingCategories, updated_at: now });
  }

  rows.push({ key: KEY_PRODUCTS, value: productsToSave, updated_at: now });

  if (!skipCategories) {
    rows.push({ key: KEY_PRODUCT_CATEGORIES, value: categoriesToSave, updated_at: now });
  }

  await upsertAppState(supabase, rows);

  console.log(`Importacao concluida: ${productsToSave.length} produtos salvos em ${KEY_PRODUCTS}.`);
  if (!skipCategories) {
    console.log(`Categorias salvas em ${KEY_PRODUCT_CATEGORIES}: ${categoriesToSave.length}.`);
  }
  if (rows.length > (skipCategories ? 1 : 2)) {
    console.log('Backup do estado anterior criado em app_state.');
  }
}

main().catch((error) => {
  console.error('Falha ao importar produtos:', error.message ?? error);
  process.exitCode = 1;
});
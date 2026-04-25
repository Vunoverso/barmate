import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const firebaseDatabaseId = process.env.FIREBASE_DATABASE_ID || '(default)';
const firebaseApiKey = process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

const args = new Set(process.argv.slice(2));
const dryRun = process.env.DRY_RUN === '1' || args.has('--dry-run');

const collectionConfig = [
  {
    source: process.env.FIRESTORE_APP_STATE_COLLECTION || 'app_state',
    target: 'app_state',
    normalize: normalizeAppStateRow,
  },
  {
    source: process.env.FIRESTORE_OPEN_ORDERS_COLLECTION || 'open_orders',
    target: 'open_orders',
    normalize: normalizeOpenOrderRow,
  },
  {
    source: process.env.FIRESTORE_GUEST_REQUESTS_COLLECTION || 'guest_requests',
    target: 'guest_requests',
    normalize: normalizeGuestRequestRow,
  },
];

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Defina ${name} antes de executar a migracao.`);
  }
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== 'object') return null;
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('bytesValue' in value) return value.bytesValue;
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(decodeFirestoreValue);
  }
  if ('mapValue' in value) {
    return decodeFirestoreFields(value.mapValue.fields || {});
  }
  return null;
}

function decodeFirestoreFields(fields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]),
  );
}

function documentId(documentName) {
  return String(documentName || '').split('/').pop();
}

function toIso(value, fallback = new Date().toISOString()) {
  if (!value) return fallback;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalizeAppStateRow(data, id) {
  const key = String(data.key || id);
  const hasValue = Object.prototype.hasOwnProperty.call(data, 'value');
  return {
    key,
    value: hasValue ? data.value : data,
    updated_at: toIso(data.updated_at || data.updatedAt),
  };
}

function normalizeOpenOrderRow(data, id) {
  const rowId = String(data.id || id);
  return {
    id: rowId,
    organization_id: data.organization_id || data.organizationId || null,
    name: String(data.name || data.clientName || `Comanda ${rowId}`),
    created_at: toIso(data.created_at || data.createdAt),
    updated_at: toIso(data.updated_at || data.updatedAt),
    items: Array.isArray(data.items) ? data.items : [],
    status: data.status || null,
    client_id: data.client_id || data.clientId || null,
    client_name: data.client_name || data.clientName || null,
    user_id: data.user_id || data.userId || null,
    is_shared: Boolean(data.is_shared ?? data.isShared ?? false),
    viewer_count: Number(data.viewer_count ?? data.viewerCount ?? 0),
    deleted_at: data.deleted_at || data.deletedAt || null,
  };
}

function normalizeGuestRequestRow(data, id) {
  const rowId = String(data.id || id);
  return {
    id: rowId,
    organization_id: data.organization_id || data.organizationId || null,
    name: String(data.name || `Cliente ${rowId}`),
    status: data.status || 'pending',
    intent: data.intent || 'view',
    associated_order_id: data.associated_order_id || data.associatedOrderId || null,
    requested_at: toIso(data.requested_at || data.requestedAt),
    updated_at: toIso(data.updated_at || data.updatedAt),
  };
}

function firestoreCollectionUrl(collectionName, pageToken) {
  const encodedPath = collectionName.split('/').map(encodeURIComponent).join('/');
  const params = new URLSearchParams({ pageSize: '300' });
  if (pageToken) params.set('pageToken', pageToken);
  if (firebaseApiKey) params.set('key', firebaseApiKey);

  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseProjectId)}/databases/${encodeURIComponent(firebaseDatabaseId)}/documents/${encodedPath}?${params.toString()}`;
}

async function fetchFirestoreCollection(collectionName) {
  const rows = [];
  let pageToken = '';

  do {
    const response = await fetch(firestoreCollectionUrl(collectionName, pageToken));
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Falha ao ler Firestore collection ${collectionName}: HTTP ${response.status} ${body}`);
    }

    const payload = await response.json();
    for (const document of payload.documents || []) {
      rows.push({
        id: documentId(document.name),
        data: decodeFirestoreFields(document.fields || {}),
      });
    }

    pageToken = payload.nextPageToken || '';
  } while (pageToken);

  return rows;
}

function chunk(rows, size = 200) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

async function upsertRows(supabase, tableName, rows) {
  const conflictKey = tableName === 'app_state' ? 'key' : 'id';
  for (const batch of chunk(rows)) {
    const { error } = await supabase.from(tableName).upsert(batch, { onConflict: conflictKey });
    if (error) {
      throw new Error(`Falha ao gravar ${tableName} no Supabase: ${error.message}`);
    }
  }
}

async function main() {
  requireEnv('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL', supabaseUrl);
  requireEnv('SUPABASE_SERVICE_ROLE_KEY', supabaseKey);
  requireEnv('FIREBASE_PROJECT_ID', firebaseProjectId);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(dryRun ? 'DRY_RUN ativo. Nada sera gravado.' : 'Migracao Firestore -> Supabase iniciada.');

  for (const entry of collectionConfig) {
    if (!entry.source) continue;

    const documents = await fetchFirestoreCollection(entry.source);
    const rows = documents.map(({ id, data }) => entry.normalize(data, id));
    console.log(`${entry.source} -> ${entry.target}: ${rows.length} registro(s).`);

    if (!dryRun && rows.length > 0) {
      await upsertRows(supabase, entry.target, rows);
    }
  }

  console.log('Migracao concluida. Dados de browser localStorage ainda precisam ser importados pelo app no primeiro acesso do mesmo navegador.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
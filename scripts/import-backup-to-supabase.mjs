import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DOCUMENT_COLLECTION_KEYS = new Set([
  'barmate_productCategories_v2',
  'barmate_products_v2',
  'barmate_sales_v2',
  'barmate_openOrders_v2',
  'barmate_clients_v2',
  'barmate_financialEntries_v2',
  'barmate_cashRegisterStatus_v2',
  'barmate_transactionFees_v2',
  'barmate_counterSaleOrderItems_v2',
  'barmate_closedCashSessions_v2',
  'barmate_archivedOrders_v2',
  'barmate_guestSession_v2',
  'barName',
  'barCnpj',
  'barAddress',
  'barLogo',
  'barLogoScale',
]);

function parseArgs(argv) {
  const options = {
    filePath: '',
    orgId: '',
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith('--org-id=')) {
      options.orgId = arg.slice('--org-id='.length).trim();
      continue;
    }

    if (!options.filePath) {
      options.filePath = arg;
    }
  }

  return options;
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
}

function buildGeneratedOrgId(barName) {
  const suffix = Date.now().toString().slice(-8);
  const base = slugify(barName || 'backup');
  return `org_import_${base || 'backup'}_${suffix}`;
}

function buildDocumentRows(backup, organizationId) {
  const rows = [];

  for (const [collectionName, value] of Object.entries(backup)) {
    if (!DOCUMENT_COLLECTION_KEYS.has(collectionName)) continue;

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const documentKey =
          item && typeof item === 'object' && 'id' in item && typeof item.id === 'string' && item.id.trim()
            ? item.id.trim()
            : `index_${index}`;

        rows.push({
          organization_id: organizationId,
          collection_name: collectionName,
          document_key: documentKey,
          payload: item,
          updated_at: new Date().toISOString(),
        });
      });
      continue;
    }

    rows.push({
      organization_id: organizationId,
      collection_name: collectionName,
      document_key: 'singleton',
      payload: value,
      updated_at: new Date().toISOString(),
    });
  }

  return rows;
}

async function resolveOrganization(supabase, backup, requestedOrgId) {
  const backupBarName = String(backup.barName || '').trim();

  if (requestedOrgId) {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, trade_name, owner_email, created_at')
      .eq('id', requestedOrgId)
      .maybeSingle();

    if (error) throw new Error(`Falha ao consultar organization ${requestedOrgId}: ${error.message}`);

    if (data) {
      return { organization: data, created: false, reason: 'org-id informado' };
    }

    const now = new Date().toISOString();
    const newOrganization = {
      id: requestedOrgId,
      trade_name: String(backup.barName || 'BarMate Importado'),
      owner_email: null,
      owner_name: 'Importacao de backup',
      owner_user_id: null,
      plan_id: 'trial',
      status: 'active',
      created_at: now,
      updated_at: now,
      trial_ends_at: null,
    };

    const { error: insertError } = await supabase.from('organizations').insert(newOrganization);
    if (insertError) throw new Error(`Falha ao criar organization ${requestedOrgId}: ${insertError.message}`);

    return { organization: newOrganization, created: true, reason: 'org-id informado e criado' };
  }

  const { data: exactMatch, error: exactMatchError } = await supabase
    .from('organizations')
    .select('id, trade_name, owner_email, created_at')
    .eq('trade_name', backupBarName)
    .maybeSingle();

  if (exactMatchError) throw new Error(`Falha ao buscar organization por nome: ${exactMatchError.message}`);
  if (exactMatch) {
    return { organization: exactMatch, created: false, reason: 'trade_name igual ao backup' };
  }

  const { data: organizations, error: listError } = await supabase
    .from('organizations')
    .select('id, trade_name, owner_email, created_at')
    .order('created_at', { ascending: true });

  if (listError) throw new Error(`Falha ao listar organizations: ${listError.message}`);

  if ((organizations || []).length === 1) {
    const singleOrganization = organizations[0];
    const singleTradeName = String(singleOrganization.trade_name || '').trim();

    if (backupBarName && singleTradeName && singleTradeName === backupBarName) {
      return { organization: singleOrganization, created: false, reason: 'unica organization existente com mesmo trade_name do backup' };
    }

    if (!backupBarName) {
      return { organization: singleOrganization, created: false, reason: 'backup sem barName; usada unica organization existente' };
    }

    const generatedOrgId = buildGeneratedOrgId(backupBarName);
    const now = new Date().toISOString();
    const newOrganization = {
      id: generatedOrgId,
      trade_name: backupBarName,
      owner_email: null,
      owner_name: 'Importacao de backup',
      owner_user_id: null,
      plan_id: 'trial',
      status: 'active',
      created_at: now,
      updated_at: now,
      trial_ends_at: null,
    };

    const { error: insertError } = await supabase.from('organizations').insert(newOrganization);
    if (insertError) throw new Error(`Falha ao criar organization segregada para o backup: ${insertError.message}`);

    return { organization: newOrganization, created: true, reason: 'backup possui trade_name diferente da unica organization existente; criada organization separada' };
  }

  const generatedOrgId = buildGeneratedOrgId(String(backup.barName || 'backup'));
  const now = new Date().toISOString();
  const newOrganization = {
    id: generatedOrgId,
    trade_name: String(backup.barName || 'BarMate Importado'),
    owner_email: null,
    owner_name: 'Importacao de backup',
    owner_user_id: null,
    plan_id: 'trial',
    status: 'active',
    created_at: now,
    updated_at: now,
    trial_ends_at: null,
  };

  const { error: insertError } = await supabase.from('organizations').insert(newOrganization);
  if (insertError) throw new Error(`Falha ao criar organization gerada: ${insertError.message}`);

  return { organization: newOrganization, created: true, reason: 'nao havia correspondencia segura; criada organization nova' };
}

async function upsertDocumentsInBatches(supabase, rows) {
  const chunkSize = 500;

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from('app_documents').upsert(chunk, {
      onConflict: 'organization_id,collection_name,document_key',
    });

    if (error) {
      throw new Error(`Falha ao importar lote ${index / chunkSize + 1}: ${error.message}`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.filePath) {
    throw new Error('Uso: node scripts/import-backup-to-supabase.mjs <arquivo.json> [--org-id=org_xxx] [--dry-run]');
  }

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variaveis NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias.');
  }

  const absoluteFilePath = path.resolve(options.filePath);
  const raw = await fs.readFile(absoluteFilePath, 'utf8');
  const backup = JSON.parse(raw);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const organizationResolution = await resolveOrganization(supabase, backup, options.orgId);
  const organizationId = organizationResolution.organization.id;
  const documentRows = buildDocumentRows(backup, organizationId);

  const summary = {
    filePath: absoluteFilePath,
    organizationId,
    tradeName: organizationResolution.organization.trade_name,
    organizationCreated: organizationResolution.created,
    resolutionReason: organizationResolution.reason,
    totalRows: documentRows.length,
    collections: [...new Set(documentRows.map((row) => row.collection_name))],
  };

  console.log(JSON.stringify(summary, null, 2));

  if (options.dryRun) {
    return;
  }

  await upsertDocumentsInBatches(supabase, documentRows);
  console.log(JSON.stringify({ imported: true, totalRows: documentRows.length, organizationId }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}).then(() => {
  process.exit(0);
});
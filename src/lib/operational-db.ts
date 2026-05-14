import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

type OperationalTable = 'app_state' | 'open_orders' | 'guest_requests';
type JsonRecord = Record<string, unknown>;

const TABLES: OperationalTable[] = ['app_state', 'open_orders', 'guest_requests'];
const tableColumnCache = new Map<OperationalTable, Promise<Set<string>>>();

const quoteIdentifier = (name: string) => `"${name.replace(/"/g, '""')}"`;

const requireTable = (tableName: OperationalTable) => {
  if (!TABLES.includes(tableName)) {
    throw new Error(`Unsupported operational table: ${tableName}`);
  }
  return tableName;
};

const getColumns = (tableName: OperationalTable) => {
  requireTable(tableName);
  const existing = tableColumnCache.get(tableName);
  if (existing) return existing;

  const promise = prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
  `.then((rows) => new Set(rows.map((row) => row.column_name)));

  tableColumnCache.set(tableName, promise);
  return promise;
};

const findColumn = (columns: Set<string>, candidates: string[]) => (
  candidates.find((candidate) => columns.has(candidate)) ?? null
);

const columnRef = (columns: Set<string>, candidates: string[]) => {
  const column = findColumn(columns, candidates);
  return column ? quoteIdentifier(column) : null;
};

const nullableColumnExpression = (
  columns: Set<string>,
  candidates: string[],
  alias: string,
  fallback = 'NULL',
) => {
  const column = columnRef(columns, candidates);
  return `${column ?? fallback} AS ${quoteIdentifier(alias)}`;
};

const jsonValue = (value: unknown) => JSON.stringify(value ?? null);

const toDateOrNull = (value: unknown) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeJsonObject = (value: unknown): JsonRecord => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as JsonRecord : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
};

const toIso = (value: unknown) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
};

const openOrderDataExpression = (columns: Set<string>) => {
  if (columns.has('data')) return 'data';

  const value = (columnNames: string[], fallback = 'NULL') => columnRef(columns, columnNames) ?? fallback;

  return `jsonb_build_object(
    'id', id,
    'name', ${value(['name'])},
    'items', COALESCE(${value(['items'], `'[]'::jsonb`)}, '[]'::jsonb),
    'status', ${value(['status'])},
    'clientId', ${value(['client_id', 'clientId'])},
    'clientName', ${value(['client_name', 'clientName'])},
    'tableId', ${value(['table_id', 'tableId'])},
    'tableLabel', ${value(['table_label', 'tableLabel'])},
    'comandaNumber', ${value(['comanda_number', 'comandaNumber'])},
    'customerStatus', ${value(['customer_status', 'customerStatus'])},
    'orderOrigin', ${value(['order_origin', 'orderOrigin'])},
    'chatMessages', COALESCE(${value(['chat_messages', 'chatMessages'], `'[]'::jsonb`)}, '[]'::jsonb),
    'isShared', COALESCE(${value(['is_shared', 'isShared'], 'false')}, false),
    'viewerCount', COALESCE(${value(['viewer_count', 'viewerCount'], '0')}, 0)
  )`;
};

const guestRequestDataExpression = (columns: Set<string>) => {
  if (columns.has('data')) return 'data';

  const value = (columnNames: string[], fallback = 'NULL') => columnRef(columns, columnNames) ?? fallback;

  return `jsonb_build_object(
    'id', id,
    'name', ${value(['name'])},
    'status', ${value(['status'], `'pending'`)},
    'intent', ${value(['intent'], `'view'`)},
    'associatedOrderId', ${value(['associated_order_id', 'associatedOrderId'])},
    'tableId', ${value(['table_id', 'tableId'])},
    'tableLabel', ${value(['table_label', 'tableLabel'])},
    'comandaNumber', ${value(['comanda_number', 'comandaNumber'])},
    'cartItems', ${value(['cart_items', 'cartItems'])},
    'requestType', ${value(['request_type', 'requestType'])},
    'message', ${value(['message'])}
  )`;
};

const orderRowToPayload = (row: JsonRecord) => {
  const data = normalizeJsonObject(row.data);
  return {
    ...data,
    id: String(row.id),
    organizationId: row.organizationId ?? data.organizationId ?? null,
    createdAt: toIso(row.createdAt) ?? data.createdAt ?? new Date().toISOString(),
    updatedAt: toIso(row.updatedAt) ?? data.updatedAt ?? new Date().toISOString(),
    deletedAt: toIso(row.deletedAt) ?? data.deletedAt ?? null,
  };
};

const guestRowToPayload = (row: JsonRecord) => {
  const data = normalizeJsonObject(row.data);
  return {
    ...data,
    id: String(row.id),
    organizationId: row.organizationId ?? data.organizationId ?? null,
    associatedOrderId: row.associatedOrderId ?? data.associatedOrderId ?? null,
    requestedAt: toIso(row.requestedAt) ?? data.requestedAt ?? new Date().toISOString(),
    updatedAt: toIso(row.updatedAt) ?? data.updatedAt ?? new Date().toISOString(),
  };
};

export async function listOpenOrders(organizationId: string, options?: { closed?: boolean; limit?: number }) {
  const columns = await getColumns('open_orders');
  const organizationColumn = columnRef(columns, ['organizationId', 'organization_id']);
  if (!organizationColumn) throw new Error('open_orders organization column not found');

  const createdExpression = nullableColumnExpression(columns, ['createdAt', 'created_at'], 'createdAt', 'now()');
  const updatedExpression = nullableColumnExpression(columns, ['updatedAt', 'updated_at'], 'updatedAt', 'now()');
  const deletedExpression = nullableColumnExpression(columns, ['deletedAt', 'deleted_at'], 'deletedAt');
  const deletedColumn = columnRef(columns, ['deletedAt', 'deleted_at']);
  const dataExpression = openOrderDataExpression(columns);
  const closedFilter = deletedColumn
    ? options?.closed
      ? Prisma.raw(`${deletedColumn} IS NOT NULL`)
      : Prisma.raw(`${deletedColumn} IS NULL`)
    : Prisma.raw(options?.closed ? 'false' : 'true');
  const orderColumn = options?.closed && deletedColumn
    ? deletedColumn
    : columnRef(columns, ['createdAt', 'created_at']) ?? 'id';
  const limit = Math.max(1, Math.min(options?.limit ?? 500, 500));

  const rows = await prisma.$queryRaw<JsonRecord[]>(Prisma.sql`
    SELECT
      id,
      ${Prisma.raw(organizationColumn)} AS "organizationId",
      ${Prisma.raw(dataExpression)} AS data,
      ${Prisma.raw(createdExpression)},
      ${Prisma.raw(updatedExpression)},
      ${Prisma.raw(deletedExpression)}
    FROM public.open_orders
    WHERE ${Prisma.raw(organizationColumn)} = ${organizationId}
      AND ${closedFilter}
    ORDER BY ${Prisma.raw(orderColumn)} ${Prisma.raw(options?.closed ? 'DESC' : 'ASC')}
    LIMIT ${limit}
  `);

  return rows.map(orderRowToPayload);
}

export async function getOpenOrderById(id: string) {
  const columns = await getColumns('open_orders');
  const organizationColumn = columnRef(columns, ['organizationId', 'organization_id']);
  const createdExpression = nullableColumnExpression(columns, ['createdAt', 'created_at'], 'createdAt', 'now()');
  const updatedExpression = nullableColumnExpression(columns, ['updatedAt', 'updated_at'], 'updatedAt', 'now()');
  const deletedExpression = nullableColumnExpression(columns, ['deletedAt', 'deleted_at'], 'deletedAt');
  const dataExpression = openOrderDataExpression(columns);

  const rows = await prisma.$queryRaw<JsonRecord[]>(Prisma.sql`
    SELECT
      id,
      ${Prisma.raw(organizationColumn ? `${organizationColumn} AS "organizationId"` : 'NULL AS "organizationId"')},
      ${Prisma.raw(dataExpression)} AS data,
      ${Prisma.raw(createdExpression)},
      ${Prisma.raw(updatedExpression)},
      ${Prisma.raw(deletedExpression)}
    FROM public.open_orders
    WHERE id = ${id}
    LIMIT 1
  `);

  return rows[0] ? orderRowToPayload(rows[0]) : null;
}

export async function findSharedOpenOrderIdByTableLabel(tableLabel: string) {
  const columns = await getColumns('open_orders');
  const deletedColumn = columnRef(columns, ['deletedAt', 'deleted_at']);
  const createdColumn = columnRef(columns, ['createdAt', 'created_at']) ?? 'id';
  const deletedFilter = deletedColumn ? Prisma.raw(`${deletedColumn} IS NULL`) : Prisma.raw('true');

  if (columns.has('data')) {
    const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id
      FROM public.open_orders
      WHERE ${deletedFilter}
        AND COALESCE((data->>'isShared')::boolean, (data->>'is_shared')::boolean, false) = true
        AND data->>'tableLabel' = ${tableLabel}
      ORDER BY ${Prisma.raw(createdColumn)} DESC
      LIMIT 1
    `);
    return rows[0]?.id ?? null;
  }

  const tableLabelColumn = columnRef(columns, ['tableLabel', 'table_label']);
  const isSharedColumn = columnRef(columns, ['isShared', 'is_shared']);
  if (!tableLabelColumn || !isSharedColumn) return null;

  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id
    FROM public.open_orders
    WHERE ${deletedFilter}
      AND COALESCE(${Prisma.raw(isSharedColumn)}, false) = true
      AND ${Prisma.raw(tableLabelColumn)} = ${tableLabel}
    ORDER BY ${Prisma.raw(createdColumn)} DESC
    LIMIT 1
  `);
  return rows[0]?.id ?? null;
}

export async function upsertOpenOrder(organizationId: string, body: JsonRecord) {
  const columns = await getColumns('open_orders');
  const organizationColumn = findColumn(columns, ['organizationId', 'organization_id']);
  if (!organizationColumn) throw new Error('open_orders organization column not found');

  const id = String(body.id ?? '');
  if (!id) throw new Error('id is required');

  const createdColumn = findColumn(columns, ['createdAt', 'created_at']);
  const updatedColumn = findColumn(columns, ['updatedAt', 'updated_at']);
  const deletedColumn = findColumn(columns, ['deletedAt', 'deleted_at']);
  const createdAt = toDateOrNull(body.createdAt ?? body.created_at) ?? new Date();
  const deletedAt = toDateOrNull(body.deletedAt ?? body.deleted_at);

  if (columns.has('data')) {
    const insertColumns = ['id', organizationColumn, 'data'];
    const values: Prisma.Sql[] = [Prisma.sql`${id}`, Prisma.sql`${organizationId}`, Prisma.sql`${jsonValue(body)}::jsonb`];
    const updates = [`${quoteIdentifier(organizationColumn)} = EXCLUDED.${quoteIdentifier(organizationColumn)}`, 'data = EXCLUDED.data'];

    if (createdColumn) {
      insertColumns.push(createdColumn);
      values.push(Prisma.sql`${createdAt}`);
    }
    if (updatedColumn) {
      insertColumns.push(updatedColumn);
      values.push(Prisma.sql`now()`);
      updates.push(`${quoteIdentifier(updatedColumn)} = now()`);
    }
    if (deletedColumn) {
      insertColumns.push(deletedColumn);
      values.push(Prisma.sql`${deletedAt}`);
      updates.push(`${quoteIdentifier(deletedColumn)} = EXCLUDED.${quoteIdentifier(deletedColumn)}`);
    }

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO public.open_orders (${Prisma.raw(insertColumns.map(quoteIdentifier).join(', '))})
      VALUES (${Prisma.join(values)})
      ON CONFLICT (id) DO UPDATE SET ${Prisma.raw(updates.join(', '))}
    `);
    return;
  }

  const normalized: Record<string, Prisma.Sql> = {
    id: Prisma.sql`${id}`,
    [organizationColumn]: Prisma.sql`${organizationId}`,
    name: Prisma.sql`${String(body.name ?? body.tableLabel ?? body.comandaNumber ?? id)}`,
    items: Prisma.sql`${jsonValue(body.items ?? [])}::jsonb`,
    status: Prisma.sql`${body.status ? String(body.status) : null}`,
    client_id: Prisma.sql`${body.clientId ? String(body.clientId) : null}`,
    client_name: Prisma.sql`${body.clientName ? String(body.clientName) : null}`,
    user_id: Prisma.sql`${body.userId ? String(body.userId) : null}`,
    is_shared: Prisma.sql`${Boolean(body.isShared ?? body.is_shared ?? false)}`,
    viewer_count: Prisma.sql`${Number(body.viewerCount ?? body.viewer_count ?? 0)}`,
    created_at: Prisma.sql`${createdAt}`,
    updated_at: Prisma.sql`now()`,
    deleted_at: Prisma.sql`${deletedAt}`,
  };

  const insertColumns = Object.keys(normalized).filter((column) => columns.has(column));
  const values = insertColumns.map((column) => normalized[column]);
  const updates = insertColumns
    .filter((column) => column !== 'id' && column !== 'created_at')
    .map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO public.open_orders (${Prisma.raw(insertColumns.map(quoteIdentifier).join(', '))})
    VALUES (${Prisma.join(values)})
    ON CONFLICT (id) DO UPDATE SET ${Prisma.raw(updates.join(', '))}
  `);
}

export async function updateOpenOrderDataById(id: string, body: JsonRecord) {
  const columns = await getColumns('open_orders');
  const updatedColumn = findColumn(columns, ['updatedAt', 'updated_at']);

  if (columns.has('data')) {
    const updateResult = await prisma.$executeRaw(Prisma.sql`
      UPDATE public.open_orders
      SET data = ${jsonValue(body)}::jsonb${Prisma.raw(updatedColumn ? `, ${quoteIdentifier(updatedColumn)} = now()` : '')}
      WHERE id = ${id}
    `);
    return updateResult > 0;
  }

  const itemsColumn = findColumn(columns, ['items']);
  const statusColumn = findColumn(columns, ['status']);
  let didUpdate = false;

  if (itemsColumn) {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE public.open_orders
      SET ${Prisma.raw(quoteIdentifier(itemsColumn))} = ${jsonValue(body.items ?? [])}::jsonb
      WHERE id = ${id}
    `);
    didUpdate = true;
  }
  if (statusColumn && body.status !== undefined) {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE public.open_orders
      SET ${Prisma.raw(quoteIdentifier(statusColumn))} = ${body.status ? String(body.status) : null}
      WHERE id = ${id}
    `);
    didUpdate = true;
  }
  if (updatedColumn) {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE public.open_orders
      SET ${Prisma.raw(quoteIdentifier(updatedColumn))} = now()
      WHERE id = ${id}
    `);
    didUpdate = true;
  }
  return didUpdate;
}

export async function softDeleteOpenOrder(organizationId: string, id: string) {
  const columns = await getColumns('open_orders');
  const organizationColumn = columnRef(columns, ['organizationId', 'organization_id']);
  const deletedColumn = columnRef(columns, ['deletedAt', 'deleted_at']);
  if (!organizationColumn || !deletedColumn) throw new Error('open_orders delete columns not found');

  await prisma.$executeRaw(Prisma.sql`
    UPDATE public.open_orders
    SET ${Prisma.raw(deletedColumn)} = now()
    WHERE id = ${id}
      AND ${Prisma.raw(organizationColumn)} = ${organizationId}
  `);
}

export async function hardDeleteClosedOpenOrder(organizationId: string, id: string) {
  const columns = await getColumns('open_orders');
  const organizationColumn = columnRef(columns, ['organizationId', 'organization_id']);
  const deletedColumn = columnRef(columns, ['deletedAt', 'deleted_at']);
  if (!organizationColumn || !deletedColumn) throw new Error('open_orders delete columns not found');

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM public.open_orders
    WHERE id = ${id}
      AND ${Prisma.raw(organizationColumn)} = ${organizationId}
      AND ${Prisma.raw(deletedColumn)} IS NOT NULL
  `);
}

export async function listGuestRequests(organizationId: string) {
  const columns = await getColumns('guest_requests');
  const organizationColumn = columnRef(columns, ['organizationId', 'organization_id']);
  if (!organizationColumn) throw new Error('guest_requests organization column not found');

  const associatedExpression = nullableColumnExpression(columns, ['associatedOrderId', 'associated_order_id'], 'associatedOrderId');
  const requestedExpression = nullableColumnExpression(columns, ['requestedAt', 'requested_at'], 'requestedAt', 'now()');
  const updatedExpression = nullableColumnExpression(columns, ['updatedAt', 'updated_at'], 'updatedAt', 'now()');
  const orderColumn = columnRef(columns, ['requestedAt', 'requested_at']) ?? 'id';
  const dataExpression = guestRequestDataExpression(columns);

  const rows = await prisma.$queryRaw<JsonRecord[]>(Prisma.sql`
    SELECT
      id,
      ${Prisma.raw(organizationColumn)} AS "organizationId",
      ${Prisma.raw(associatedExpression)},
      ${Prisma.raw(dataExpression)} AS data,
      ${Prisma.raw(requestedExpression)},
      ${Prisma.raw(updatedExpression)}
    FROM public.guest_requests
    WHERE ${Prisma.raw(organizationColumn)} = ${organizationId}
    ORDER BY ${Prisma.raw(orderColumn)} ASC
  `);

  return rows.map(guestRowToPayload);
}

export async function getGuestRequestById(id: string) {
  const columns = await getColumns('guest_requests');
  const organizationColumn = columnRef(columns, ['organizationId', 'organization_id']);
  const associatedExpression = nullableColumnExpression(columns, ['associatedOrderId', 'associated_order_id'], 'associatedOrderId');
  const requestedExpression = nullableColumnExpression(columns, ['requestedAt', 'requested_at'], 'requestedAt', 'now()');
  const updatedExpression = nullableColumnExpression(columns, ['updatedAt', 'updated_at'], 'updatedAt', 'now()');
  const dataExpression = guestRequestDataExpression(columns);

  const rows = await prisma.$queryRaw<JsonRecord[]>(Prisma.sql`
    SELECT
      id,
      ${Prisma.raw(organizationColumn ? `${organizationColumn} AS "organizationId"` : 'NULL AS "organizationId"')},
      ${Prisma.raw(associatedExpression)},
      ${Prisma.raw(dataExpression)} AS data,
      ${Prisma.raw(requestedExpression)},
      ${Prisma.raw(updatedExpression)}
    FROM public.guest_requests
    WHERE id = ${id}
    LIMIT 1
  `);

  return rows[0] ? guestRowToPayload(rows[0]) : null;
}

export async function createGuestRequest(organizationId: string, body: JsonRecord) {
  const id = String(body.id ?? randomUUID());
  await upsertGuestRequest(organizationId, { ...body, id });
  return id;
}

export async function upsertGuestRequest(organizationId: string, body: JsonRecord) {
  const columns = await getColumns('guest_requests');
  const organizationColumn = findColumn(columns, ['organizationId', 'organization_id']);
  if (!organizationColumn) throw new Error('guest_requests organization column not found');

  const id = String(body.id ?? '');
  if (!id) throw new Error('id is required');

  const associatedColumn = findColumn(columns, ['associatedOrderId', 'associated_order_id']);
  const requestedColumn = findColumn(columns, ['requestedAt', 'requested_at']);
  const updatedColumn = findColumn(columns, ['updatedAt', 'updated_at']);
  const requestedAt = toDateOrNull(body.requestedAt ?? body.requested_at) ?? new Date();

  if (columns.has('data')) {
    const insertColumns = ['id', organizationColumn, 'data'];
    const values: Prisma.Sql[] = [Prisma.sql`${id}`, Prisma.sql`${organizationId}`, Prisma.sql`${jsonValue(body)}::jsonb`];
    const updates = [`${quoteIdentifier(organizationColumn)} = EXCLUDED.${quoteIdentifier(organizationColumn)}`, 'data = EXCLUDED.data'];

    if (associatedColumn) {
      insertColumns.push(associatedColumn);
      values.push(Prisma.sql`${body.associatedOrderId ? String(body.associatedOrderId) : null}`);
      updates.push(`${quoteIdentifier(associatedColumn)} = EXCLUDED.${quoteIdentifier(associatedColumn)}`);
    }
    if (requestedColumn) {
      insertColumns.push(requestedColumn);
      values.push(Prisma.sql`${requestedAt}`);
    }
    if (updatedColumn) {
      insertColumns.push(updatedColumn);
      values.push(Prisma.sql`now()`);
      updates.push(`${quoteIdentifier(updatedColumn)} = now()`);
    }

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO public.guest_requests (${Prisma.raw(insertColumns.map(quoteIdentifier).join(', '))})
      VALUES (${Prisma.join(values)})
      ON CONFLICT (id) DO UPDATE SET ${Prisma.raw(updates.join(', '))}
    `);
    return;
  }

  const normalized: Record<string, Prisma.Sql> = {
    id: Prisma.sql`${id}`,
    [organizationColumn]: Prisma.sql`${organizationId}`,
    name: Prisma.sql`${String(body.name ?? 'Cliente')}`,
    status: Prisma.sql`${String(body.status ?? 'pending')}`,
    intent: Prisma.sql`${String(body.intent ?? 'view')}`,
    associated_order_id: Prisma.sql`${body.associatedOrderId ? String(body.associatedOrderId) : null}`,
    requested_at: Prisma.sql`${requestedAt}`,
    updated_at: Prisma.sql`now()`,
  };

  const insertColumns = Object.keys(normalized).filter((column) => columns.has(column));
  const values = insertColumns.map((column) => normalized[column]);
  const updates = insertColumns
    .filter((column) => column !== 'id' && column !== 'requested_at')
    .map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO public.guest_requests (${Prisma.raw(insertColumns.map(quoteIdentifier).join(', '))})
    VALUES (${Prisma.join(values)})
    ON CONFLICT (id) DO UPDATE SET ${Prisma.raw(updates.join(', '))}
  `);
}

export async function deleteGuestRequest(organizationId: string, id: string) {
  const columns = await getColumns('guest_requests');
  const organizationColumn = columnRef(columns, ['organizationId', 'organization_id']);
  if (!organizationColumn) throw new Error('guest_requests organization column not found');

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM public.guest_requests
    WHERE id = ${id}
      AND ${Prisma.raw(organizationColumn)} = ${organizationId}
  `);
}

export async function listAppState(organizationId: string) {
  const columns = await getColumns('app_state');
  const organizationColumn = columnRef(columns, ['organizationId', 'organization_id']);
  const updatedExpression = nullableColumnExpression(columns, ['updatedAt', 'updated_at'], 'updatedAt', 'now()');

  const rows = organizationColumn
    ? await prisma.$queryRaw<JsonRecord[]>(Prisma.sql`
        SELECT key, value, ${Prisma.raw(updatedExpression)}
        FROM public.app_state
        WHERE ${Prisma.raw(organizationColumn)} = ${organizationId}
        ORDER BY key ASC
      `)
    : await prisma.$queryRaw<JsonRecord[]>(Prisma.sql`
        SELECT key, value, ${Prisma.raw(updatedExpression)}
        FROM public.app_state
        ORDER BY key ASC
      `);

  return rows.map((row) => ({
    key: String(row.key),
    value: row.value,
    updatedAt: toIso(row.updatedAt) ?? new Date().toISOString(),
  }));
}

export async function upsertAppState(organizationId: string, key: string, value: unknown) {
  const columns = await getColumns('app_state');
  const organizationColumn = findColumn(columns, ['organizationId', 'organization_id']);
  const updatedColumn = findColumn(columns, ['updatedAt', 'updated_at']);
  const idColumn = findColumn(columns, ['id']);

  const updateResult = organizationColumn
    ? await prisma.$executeRaw(Prisma.sql`
        UPDATE public.app_state
        SET value = ${jsonValue(value)}::jsonb${Prisma.raw(updatedColumn ? `, ${quoteIdentifier(updatedColumn)} = now()` : '')}
        WHERE key = ${key}
          AND ${Prisma.raw(quoteIdentifier(organizationColumn))} = ${organizationId}
      `)
    : await prisma.$executeRaw(Prisma.sql`
        UPDATE public.app_state
        SET value = ${jsonValue(value)}::jsonb${Prisma.raw(updatedColumn ? `, ${quoteIdentifier(updatedColumn)} = now()` : '')}
        WHERE key = ${key}
      `);

  if (updateResult > 0) return;

  const insertColumns = ['key', 'value'];
  const values: Prisma.Sql[] = [Prisma.sql`${key}`, Prisma.sql`${jsonValue(value)}::jsonb`];

  if (idColumn) {
    insertColumns.unshift(idColumn);
    values.unshift(Prisma.sql`${randomUUID()}`);
  }
  if (organizationColumn) {
    insertColumns.push(organizationColumn);
    values.push(Prisma.sql`${organizationId}`);
  }
  if (updatedColumn) {
    insertColumns.push(updatedColumn);
    values.push(Prisma.sql`now()`);
  }

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO public.app_state (${Prisma.raw(insertColumns.map(quoteIdentifier).join(', '))})
    VALUES (${Prisma.join(values)})
  `);
}

export async function deleteAppState(organizationId: string, key: string) {
  const columns = await getColumns('app_state');
  const organizationColumn = columnRef(columns, ['organizationId', 'organization_id']);

  if (organizationColumn) {
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM public.app_state
      WHERE key = ${key}
        AND ${Prisma.raw(organizationColumn)} = ${organizationId}
    `);
    return;
  }

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM public.app_state
    WHERE key = ${key}
  `);
}
